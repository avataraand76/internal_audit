// backend/server.js
const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const moment = require("moment-timezone");
const bcrypt = require("bcryptjs");
const multer = require("multer");
require("dotenv").config();
const { google } = require("googleapis");
const fs = require("fs");
const compression = require("compression");
const axios = require("axios");
const { Readable } = require("stream");

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl:
    process.env.DB_HOST === "localhost"
      ? false
      : {
          rejectUnauthorized: false,
        },
});
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// Add error handling for the connection
db.connect((err) => {
  if (err) {
    console.error("Error connecting to database:", err);
    if (err.code === "HANDSHAKE_NO_SSL_SUPPORT") {
      console.error("Please check your MySQL server SSL configuration");
    }
    return;
  }
  console.log("Connected to MySQL database");
});

// Add connection error handler
db.on("error", (err) => {
  console.error("Database error:", err);
  if (err.code === "PROTOCOL_CONNECTION_LOST") {
    console.log("Database connection was closed. Reconnecting...");
    // Implement reconnection logic here if needed
  } else if (err.code === "HANDSHAKE_NO_SSL_SUPPORT") {
    console.error(
      "SSL connection required by server but not properly configured"
    );
  }
});

// Get all users in LoginPage.js
app.get("/login", (req, res) => {
  const query = "SELECT * FROM tb_user";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching phases:", err);
      res.status(500).json({ error: "Error fetching phases" });
      return;
    }
    res.json(results);
  });
});

// Check user password is valid in LoginPage.js
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const query = "SELECT * FROM tb_user WHERE name_user = ?";
  db.query(query, [username], async (err, results) => {
    if (err) {
      console.error("Error during login:", err);
      res.status(500).json({ error: "Error during login" });
      return;
    }

    if (results.length > 0) {
      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password_user);

      if (isMatch) {
        // Password is correct, login successful
        res.json({
          success: true,
          user: { ...user, password_user: undefined },
        });
      } else {
        // Password is incorrect
        res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });
      }
    } else {
      // No user found with given username
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });
});

// check có phải là người giám sát kp
app.get("/check-supervisor/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = "SELECT * FROM tb_user_supervisor WHERE id_user = ?";

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error checking supervisor role:", err);
      res.status(500).json({ error: "Error checking supervisor role" });
      return;
    }

    res.json({ isSupervisor: results.length > 0 });
  });
});

// lấy phòng ban theo user
app.get("/user-workshop/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = `
    SELECT DISTINCT w.* 
    FROM tb_workshop w 
    JOIN tb_user_supervised us ON w.id_workshop = us.id_workshop
    WHERE us.id_user = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching user workshop:", err);
      res.status(500).json({ error: "Error fetching user workshop" });
      return;
    }
    res.json(results);
  });
});

// Lấy bộ phận theo user
app.get("/workshops/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    // Check if user is supervisor
    const supervisorQuery =
      "SELECT * FROM tb_user_supervisor WHERE id_user = ?";
    const [supervisorResults] = await new Promise((resolve, reject) => {
      db.query(supervisorQuery, [userId], (err, results) => {
        if (err) reject(err);
        else resolve([results, null]);
      });
    });

    let workshopQuery;
    let queryParams;

    if (supervisorResults.length > 0) {
      // For supervisor, get all workshops and departments, excluding inactive ones
      workshopQuery = `
        SELECT 
          w.id_workshop,
          w.name_workshop,
          d.id_department,
          d.name_department
        FROM tb_workshop w
        LEFT JOIN tb_department d ON w.id_workshop = d.id_workshop
        LEFT JOIN tb_inactive_department id ON d.id_department = id.id_department AND id.id_phase = ?
        WHERE id.id_department IS NULL
        ORDER BY w.id_workshop, d.id_department
      `;
      queryParams = [req.query.phaseId];
    } else {
      // For supervised user, get only assigned workshops, excluding inactive departments
      workshopQuery = `
        SELECT 
          w.id_workshop,
          w.name_workshop,
          d.id_department,
          d.name_department
        FROM tb_workshop w
        LEFT JOIN tb_department d ON w.id_workshop = d.id_workshop
        LEFT JOIN tb_inactive_department id ON d.id_department = id.id_department AND id.id_phase = ?
        WHERE w.id_workshop IN (
          SELECT id_workshop 
          FROM tb_user_supervised 
          WHERE id_user = ?
        )
        AND id.id_department IS NULL
        ORDER BY w.id_workshop, d.id_department
      `;
      queryParams = [req.query.phaseId, userId];
    }

    const results = await new Promise((resolve, reject) => {
      db.query(workshopQuery, queryParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    // Convert flat results to hierarchical structure, excluding empty workshops
    const workshops = results.reduce((acc, row) => {
      if (!row.id_department) return acc; // Skip if no department (prevents empty workshops)

      const workshop = acc.find((w) => w.id === row.id_workshop);

      if (!workshop) {
        acc.push({
          id: row.id_workshop,
          name: row.name_workshop,
          departments: [
            {
              id: row.id_department,
              name: row.name_department,
            },
          ],
        });
      } else {
        workshop.departments.push({
          id: row.id_department,
          name: row.name_department,
        });
      }

      return acc;
    }, []);

    // Only return workshops that have active departments
    const activeWorkshops = workshops.filter((w) => w.departments.length > 0);

    res.json(activeWorkshops);
  } catch (error) {
    console.error("Error in /workshops/:userId:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Lấy hạng mục và tiêu chí cho các tài khoản supervised
app.get("/supervised-categories/:userId/:departmentId", (req, res) => {
  const { userId, departmentId } = req.params;

  // Query để lấy categories và criteria cho user supervised
  const query = `
    SELECT DISTINCT
      c.id_category,
      c.name_category,
      cr.id_criteria,
      cr.codename,
      cr.name_criteria,
      cr.description,
      cr.failing_point_type
    FROM tb_category c
    INNER JOIN tb_criteria cr ON c.id_category = cr.id_category
    INNER JOIN tb_department_criteria dc ON cr.id_criteria = dc.id_criteria
    INNER JOIN tb_user_supervised us ON us.id_workshop = (
      SELECT id_workshop FROM tb_department WHERE id_department = ?
    )
    WHERE us.id_user = ? 
    AND dc.id_department = ?
    ORDER BY c.id_category, cr.id_criteria
  `;

  db.query(query, [departmentId, userId, departmentId], (err, results) => {
    if (err) {
      console.error("Error fetching supervised categories:", err);
      res.status(500).json({ error: "Error fetching supervised categories" });
      return;
    }

    // Chuyển đổi kết quả phẳng thành cấu trúc phân cấp
    const categories = results.reduce((acc, row) => {
      const category = acc.find((c) => c.id === row.id_category);

      if (!category) {
        acc.push({
          id: row.id_category,
          name: row.name_category,
          criteria: row.id_criteria
            ? [
                {
                  id: row.id_criteria,
                  codename: row.codename,
                  name: row.name_criteria,
                  description: row.description,
                  failingPointType: row.failing_point_type,
                },
              ]
            : [],
        });
      } else if (row.id_criteria) {
        category.criteria.push({
          id: row.id_criteria,
          codename: row.codename,
          name: row.name_criteria,
          description: row.description,
          failingPointType: row.failing_point_type,
        });
      }

      return acc;
    }, []);

    res.json(categories);
  });
});

// Get all phases in CreatePhasePage.js
app.get("/phases", (req, res) => {
  const query = `
    SELECT * 
    FROM tb_phase 
    ORDER BY date_recorded DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching phases:", err);
      res.status(500).json({ error: "Error fetching phases" });
      return;
    }
    res.json(results);
  });
});

// Get phase by ID in PhaseDetailed.js
app.get("/phases/:id", (req, res) => {
  const phaseId = req.params.id;
  const query = "SELECT * FROM tb_phase WHERE id_phase = ?";
  db.query(query, [phaseId], (err, results) => {
    if (err) {
      console.error("Error fetching phase:", err);
      res.status(500).json({ error: "Error fetching phase" });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: "Phase not found" });
      return;
    }
    res.json(results[0]);
  });
});

// Update a phase
app.put("/phases/:id", (req, res) => {
  const phaseId = req.params.id;
  const { name_phase, time_limit_start, time_limit_end } = req.body;

  // Format dates using moment.js
  const formattedStartDate = time_limit_start
    ? moment(time_limit_start).format("YYYY-MM-DD HH:mm:ss")
    : null;
  const formattedEndDate = time_limit_end
    ? moment(time_limit_end).format("YYYY-MM-DD HH:mm:ss")
    : null;

  const query =
    "UPDATE tb_phase SET name_phase = ?, time_limit_start = ?, time_limit_end = ? WHERE id_phase = ?";
  db.query(
    query,
    [name_phase, formattedStartDate, formattedEndDate, phaseId],
    (err, result) => {
      if (err) {
        console.error("Error updating phase:", err);
        res.status(500).json({ error: "Error updating phase" });
        return;
      }

      if (result.affectedRows === 0) {
        res.status(404).json({ error: "Phase not found" });
        return;
      }

      res.json({
        message: "Phase updated successfully",
        phase: {
          id_phase: phaseId,
          name_phase,
          time_limit_start: formattedStartDate,
          time_limit_end: formattedEndDate,
        },
      });
    }
  );
});

// Delete a phase
app.delete("/phases/:id", (req, res) => {
  const phaseId = req.params.id;

  // First delete all related records from tb_phase_details and tb_total_point
  const deleteRelatedRecords = async () => {
    try {
      // Delete from tb_phase_details
      await new Promise((resolve, reject) => {
        db.query(
          "DELETE FROM tb_phase_details WHERE id_phase = ?",
          [phaseId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Delete from tb_total_point
      await new Promise((resolve, reject) => {
        db.query(
          "DELETE FROM tb_total_point WHERE id_phase = ?",
          [phaseId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Finally delete the phase itself
      await new Promise((resolve, reject) => {
        db.query(
          "DELETE FROM tb_phase WHERE id_phase = ?",
          [phaseId],
          (err, result) => {
            if (err) reject(err);
            else if (result.affectedRows === 0) {
              reject(new Error("Phase not found"));
            } else resolve();
          }
        );
      });

      res.json({ message: "Phase deleted successfully" });
    } catch (error) {
      console.error("Error deleting phase:", error);
      res.status(error.message === "Phase not found" ? 404 : 500).json({
        error:
          error.message === "Phase not found"
            ? "Phase not found"
            : "Error deleting phase",
      });
    }
  };

  deleteRelatedRecords();
});

// Create a new phase in CreatePhasePage.js
app.post("/phases", (req, res) => {
  const { name_phase, time_limit_start, time_limit_end } = req.body;
  const date_recorded = moment().format("YYYY-MM-DD HH:mm:ss");

  // Format dates using moment.js
  const formattedStartDate = time_limit_start
    ? moment(time_limit_start).format("YYYY-MM-DD HH:mm:ss")
    : null;
  const formattedEndDate = time_limit_end
    ? moment(time_limit_end).format("YYYY-MM-DD HH:mm:ss")
    : null;

  const query =
    "INSERT INTO tb_phase (name_phase, date_recorded, time_limit_start, time_limit_end) VALUES (?, ?, ?, ?)";
  db.query(
    query,
    [name_phase, date_recorded, formattedStartDate, formattedEndDate],
    (err, result) => {
      if (err) {
        console.error("Error creating phase:", err);
        res.status(500).json({ error: "Error creating phase" });
        return;
      }

      const createdPhase = {
        id_phase: result.insertId,
        name_phase,
        date_recorded,
        time_limit_start: formattedStartDate,
        time_limit_end: formattedEndDate,
      };
      res.status(201).json(createdPhase);
    }
  );
});

// Get all categories with their criteria
app.get("/categories", (req, res) => {
  const query = `
    SELECT 
      c.id_category,
      c.name_category,
      cr.id_criteria,
      cr.codename,
      cr.name_criteria,
      cr.description,
      cr.failing_point_type
    FROM tb_category c
    LEFT JOIN tb_criteria cr ON c.id_category = cr.id_category
    ORDER BY c.id_category, cr.id_criteria
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching categories and criteria:", err);
      res.status(500).json({ error: "Error fetching categories and criteria" });
      return;
    }

    // Chuyển đổi kết quả phẳng thành cấu trúc phân cấp
    const categories = results.reduce((acc, row) => {
      const category = acc.find((c) => c.id === row.id_category);

      if (!category) {
        acc.push({
          id: row.id_category,
          name: row.name_category,
          criteria: row.id_criteria
            ? [
                {
                  id: row.id_criteria,
                  codename: row.codename,
                  name: row.name_criteria, // Sử dụng name_criteria làm tên hiển thị
                  description: row.description, // Sử dụng description làm mô tả
                  failingPointType: row.failing_point_type,
                },
              ]
            : [],
        });
      } else if (row.id_criteria) {
        category.criteria.push({
          id: row.id_criteria,
          codename: row.codename,
          name: row.name_criteria,
          description: row.description,
          failingPointType: row.failing_point_type,
        });
      }

      return acc;
    }, []);

    res.json(categories);
  });
});

// Get categories with their criteria, filtered by user ID
app.get("/categories/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = `
    SELECT DISTINCT
      c.id_category,
      c.name_category,
      cr.id_criteria,
      cr.codename,
      cr.name_criteria,
      cr.description,
      cr.failing_point_type
    FROM tb_category c
    LEFT JOIN tb_criteria cr ON c.id_category = cr.id_category
    INNER JOIN tb_user_supervisor us ON c.id_category = us.id_category
    WHERE us.id_user = ?
    ORDER BY c.id_category, cr.id_criteria
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching categories and criteria:", err);
      res.status(500).json({ error: "Error fetching categories and criteria" });
      return;
    }

    // Convert flat results to hierarchical structure
    const categories = results.reduce((acc, row) => {
      const category = acc.find((c) => c.id === row.id_category);

      if (!category) {
        acc.push({
          id: row.id_category,
          name: row.name_category,
          criteria: row.id_criteria
            ? [
                {
                  id: row.id_criteria,
                  codename: row.codename,
                  name: row.name_criteria,
                  description: row.description,
                  failingPointType: row.failing_point_type,
                },
              ]
            : [],
        });
      } else if (row.id_criteria) {
        category.criteria.push({
          id: row.id_criteria,
          codename: row.codename,
          name: row.name_criteria,
          description: row.description,
          failingPointType: row.failing_point_type,
        });
      }

      return acc;
    }, []);

    res.json(categories);
  });
});

// Get categories with their criteria, filtered by user ID and department ID
app.get("/categories/:userId/:departmentId", (req, res) => {
  const userId = req.params.userId;
  const departmentId = req.params.departmentId;
  const query = `
    SELECT DISTINCT
      c.id_category,
      c.name_category,
      cr.id_criteria,
      cr.codename,
      cr.name_criteria,
      cr.description,
      cr.failing_point_type
    FROM tb_category c
    INNER JOIN tb_criteria cr ON c.id_category = cr.id_category
    INNER JOIN tb_user_supervisor us ON c.id_category = us.id_category
    INNER JOIN tb_department_criteria dc ON cr.id_criteria = dc.id_criteria
    WHERE us.id_user = ? AND dc.id_department = ?
    ORDER BY c.id_category, cr.id_criteria
  `;

  db.query(query, [userId, departmentId], (err, results) => {
    if (err) {
      console.error("Error fetching categories and criteria:", err);
      res.status(500).json({ error: "Error fetching categories and criteria" });
      return;
    }

    // Convert flat results to hierarchical structure
    const categories = results.reduce((acc, row) => {
      const category = acc.find((c) => c.id === row.id_category);

      if (!category) {
        acc.push({
          id: row.id_category,
          name: row.name_category,
          criteria: row.id_criteria
            ? [
                {
                  id: row.id_criteria,
                  codename: row.codename,
                  name: row.name_criteria,
                  description: row.description,
                  failingPointType: row.failing_point_type,
                },
              ]
            : [],
        });
      } else if (row.id_criteria) {
        category.criteria.push({
          id: row.id_criteria,
          codename: row.codename,
          name: row.name_criteria,
          description: row.description,
          failingPointType: row.failing_point_type,
        });
      }

      return acc;
    }, []);

    res.json(categories);
  });
});

// Get workshops with their departments
app.get("/workshops", (req, res) => {
  const query = `
    SELECT 
      w.id_workshop,
      w.name_workshop,
      d.id_department,
      d.name_department
    FROM tb_workshop w
    LEFT JOIN tb_department d ON w.id_workshop = d.id_workshop
    ORDER BY w.id_workshop, d.id_department
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching workshops and departments:", err);
      res
        .status(500)
        .json({ error: "Error fetching workshops and departments" });
      return;
    }

    // Convert flat results to hierarchical structure
    const workshops = results.reduce((acc, row) => {
      const workshop = acc.find((w) => w.id === row.id_workshop);

      if (!workshop) {
        acc.push({
          id: row.id_workshop,
          name: row.name_workshop,
          departments: row.id_department
            ? [
                {
                  id: row.id_department,
                  name: row.name_department,
                },
              ]
            : [],
        });
      } else if (row.id_department) {
        workshop.departments.push({
          id: row.id_department,
          name: row.name_department,
        });
      }

      return acc;
    }, []);

    res.json(workshops);
  });
});

// Get count of criteria for each department
app.get("/departments/count", (req, res) => {
  const query = `
    SELECT 
      d.id_department,
      d.name_department,
      COUNT(DISTINCT dc.id_criteria) AS criteria_count
    FROM 
      tb_department d
    LEFT JOIN 
      tb_department_criteria dc ON d.id_department = dc.id_department
    GROUP BY 
      d.id_department
    ORDER BY 
      d.id_department
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching criteria count by department:", err);
      res
        .status(500)
        .json({ error: "Error fetching criteria count by department" });
      return;
    }

    res.json(results);
  });
});

// Get total criteria count for a department
app.get("/total-criteria/:departmentId", (req, res) => {
  const departmentId = req.params.departmentId;
  const query = `
    SELECT COUNT(*) as total_criteria
    FROM tb_department_criteria
    WHERE id_department = ?
  `;

  db.query(query, [departmentId], (err, results) => {
    if (err) {
      console.error("Error fetching criteria count:", err);
      res.status(500).json({ error: "Error fetching criteria count" });
      return;
    }
    res.json(results[0]);
  });
});

// Save phase details into tb_phase_details and update total point into tb_total_point
app.post("/phase-details", (req, res) => {
  const {
    id_department,
    id_criteria,
    id_phase,
    id_user,
    is_fail,
    date_updated,
    status_phase_details,
    imgURL_after,
    clearBefore,
  } = req.body;

  const formattedDate = moment(date_updated).format("YYYY-MM-DD HH:mm:ss");

  const updatePhaseDetails = () => {
    let query;
    let params;

    if (clearBefore) {
      // When marking as "đạt", clear imgURL_before
      query = `
        INSERT INTO tb_phase_details (
          id_department, 
          id_criteria, 
          id_phase, 
          id_user, 
          is_fail, 
          date_updated,
          status_phase_details,
          imgURL_before
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
        ON DUPLICATE KEY UPDATE
        is_fail = VALUES(is_fail),
        date_updated = VALUES(date_updated),
        status_phase_details = VALUES(status_phase_details),
        imgURL_before = NULL
      `;
      params = [
        id_department,
        id_criteria,
        id_phase,
        id_user,
        is_fail,
        formattedDate,
        status_phase_details,
      ];
    } else if (imgURL_after) {
      query = `
        INSERT INTO tb_phase_details (
          id_department, 
          id_criteria, 
          id_phase, 
          id_user, 
          is_fail, 
          date_updated,
          status_phase_details,
          imgURL_after
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        date_updated = VALUES(date_updated),
        status_phase_details = VALUES(status_phase_details),
        imgURL_after = VALUES(imgURL_after)
      `;
      params = [
        id_department,
        id_criteria,
        id_phase,
        id_user,
        is_fail,
        formattedDate,
        status_phase_details,
        imgURL_after,
      ];
    } else {
      query = `
        INSERT INTO tb_phase_details (
          id_department, 
          id_criteria, 
          id_phase, 
          id_user, 
          is_fail, 
          date_updated,
          status_phase_details
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        is_fail = VALUES(is_fail),
        date_updated = VALUES(date_updated),
        status_phase_details = VALUES(status_phase_details)
      `;
      params = [
        id_department,
        id_criteria,
        id_phase,
        id_user,
        is_fail,
        formattedDate,
        status_phase_details,
      ];
    }

    db.query(query, params, (err, result) => {
      if (err) {
        console.error("Error saving phase details:", err);
        res.status(500).json({ error: "Error saving phase details" });
        return;
      }
      if (is_fail === undefined) {
        res.status(200).json({ message: "Status updated successfully" });
      } else {
        updateTotalPointForDepartment();
      }
    });
  };

  // Define the updateTotalPoint function
  const updateTotalPointForDepartment = async () => {
    try {
      // Get all failed criteria for this department and phase
      const failedCriteriaQuery = `
        SELECT 
          c.id_criteria,
          c.failing_point_type,
          c.id_category
        FROM tb_phase_details pd
        JOIN tb_criteria c ON pd.id_criteria = c.id_criteria
        WHERE pd.id_phase = ? 
          AND pd.id_department = ? 
          AND pd.is_fail = 1`;

      const [failedCriteria] = await new Promise((resolve, reject) => {
        db.query(
          failedCriteriaQuery,
          [id_phase, id_department],
          (err, results) => {
            if (err) reject(err);
            else resolve([results, null]);
          }
        );
      });

      // Get total criteria count
      const totalCriteriaQuery = `
        SELECT COUNT(*) as total
        FROM tb_department_criteria
        WHERE id_department = ?`;

      const [totalResult] = await new Promise((resolve, reject) => {
        db.query(totalCriteriaQuery, [id_department], (err, results) => {
          if (err) reject(err);
          else resolve([results, null]);
        });
      });

      const totalCriteria = totalResult[0].total;
      const failedCount = failedCriteria.length;
      const totalPoint = Math.max(
        0,
        Math.round(((totalCriteria - failedCount) / totalCriteria) * 100)
      );

      // Update total_point in database
      const updateQuery = `
        INSERT INTO tb_total_point (id_department, id_phase, total_point)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
        total_point = VALUES(total_point)`;

      await new Promise((resolve, reject) => {
        db.query(updateQuery, [id_department, id_phase, totalPoint], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.status(201).json({
        message: "Phase details and total point updated successfully",
        totalPoint: totalPoint,
      });
    } catch (error) {
      console.error("Error updating total point:", error);
      res.status(500).json({ error: "Error updating total point" });
    }
  };

  updatePhaseDetails();
});

// get details status
app.get(
  "/phase-details-status/:phaseId/:departmentId/:criterionId",
  (req, res) => {
    const { phaseId, departmentId, criterionId } = req.params;

    const query = `
    SELECT status_phase_details
    FROM tb_phase_details
    WHERE id_phase = ? AND id_department = ? AND id_criteria = ?
  `;

    db.query(query, [phaseId, departmentId, criterionId], (err, results) => {
      if (err) {
        console.error("Error fetching phase details status:", err);
        res.status(500).json({ error: "Error fetching phase details status" });
        return;
      }

      res.json({
        status_phase_details:
          results[0]?.status_phase_details || "CHƯA KHẮC PHỤC",
      });
    });
  }
);

// get status of criteria of department
app.get("/criteria-statuses/:phaseId/:departmentId", (req, res) => {
  const { phaseId, departmentId } = req.params;

  const query = `
    SELECT id_criteria, status_phase_details
    FROM tb_phase_details
    WHERE id_phase = ? AND id_department = ?
  `;

  db.query(query, [phaseId, departmentId], (err, results) => {
    if (err) {
      console.error("Error fetching criteria statuses:", err);
      res.status(500).json({ error: "Error fetching criteria statuses" });
      return;
    }

    res.json(results);
  });
});

// get criterion images
app.get(
  "/phase-details-images/:phaseId/:departmentId/:criterionId",
  (req, res) => {
    const { phaseId, departmentId, criterionId } = req.params;

    const query = `
    SELECT imgURL_before, imgURL_after
    FROM tb_phase_details
    WHERE id_phase = ? AND id_department = ? AND id_criteria = ?
  `;

    db.query(query, [phaseId, departmentId, criterionId], (err, results) => {
      if (err) {
        console.error("Error fetching images:", err);
        res.status(500).json({ error: "Error fetching images" });
        return;
      }

      res.json(results[0] || { imgURL_before: null, imgURL_after: null });
    });
  }
);

// Get failed criteria for a specific phase
app.get("/failed/:phaseId", (req, res) => {
  const phaseId = req.params.phaseId;

  const query = `
    SELECT 
      p.name_phase AS phase_name,  
      d.name_department AS department_name,
      c.codename AS criterion_codename,
      c.name_criteria AS criterion_name,
      u.name_user AS user_name,
      CAST(pd.is_fail AS UNSIGNED) AS is_fail,
      pd.date_updated
    FROM 
      tb_phase_details pd
    JOIN 
      tb_department d ON pd.id_department = d.id_department
    JOIN 
      tb_criteria c ON pd.id_criteria = c.id_criteria
    JOIN 
      tb_phase p ON pd.id_phase = p.id_phase
    JOIN 
      tb_user u ON pd.id_user = u.id_user
    WHERE 
      pd.id_phase = ?
    ORDER BY 
      pd.date_updated DESC
  `;

  db.query(query, [phaseId], (err, results) => {
    if (err) {
      console.error("Error fetching criteria details:", err);
      res.status(500).json({ error: "Error fetching criteria details" });
      return;
    }
    res.json(results);
  });
});

// Get failed check for a specific phase
app.get("/failed-check/:phaseId", (req, res) => {
  const phaseId = req.params.phaseId;
  const query = `
    SELECT id_criteria, id_department
    FROM tb_phase_details
    WHERE id_phase = ? AND is_fail = 1
  `;

  db.query(query, [phaseId], (err, results) => {
    if (err) {
      console.error("Error fetching failed criteria:", err);
      res.status(500).json({ error: "Error fetching failed criteria" });
      return;
    }
    res.json(results);
  });
});

// Add a new endpoint to get the total point for a department in a phase
app.get("/total-point/:phaseId/:departmentId", async (req, res) => {
  const { phaseId, departmentId } = req.params;

  try {
    // Get all failed criteria for this department and phase
    const failedCriteriaQuery = `
      SELECT 
        c.id_criteria,
        c.failing_point_type,
        c.id_category
      FROM tb_phase_details pd
      JOIN tb_criteria c ON pd.id_criteria = c.id_criteria
      WHERE pd.id_phase = ? 
        AND pd.id_department = ? 
        AND pd.is_fail = 1`;

    const [failedCriteria] = await new Promise((resolve, reject) => {
      db.query(failedCriteriaQuery, [phaseId, departmentId], (err, results) => {
        if (err) reject(err);
        else resolve([results, null]);
      });
    });

    // Get total criteria count for the department
    const totalCriteriaQuery = `
      SELECT COUNT(*) as total
      FROM tb_department_criteria
      WHERE id_department = ?`;

    const [totalResult] = await new Promise((resolve, reject) => {
      db.query(totalCriteriaQuery, [departmentId], (err, results) => {
        if (err) reject(err);
        else resolve([results, null]);
      });
    });

    // Get count of failing type 2 criteria for each category in this department
    const failingType2CountQuery = `
      SELECT 
        c.id_category,
        COUNT(*) as count
      FROM tb_department_criteria dc
      JOIN tb_criteria c ON dc.id_criteria = c.id_criteria
      WHERE dc.id_department = ? 
        AND c.failing_point_type = 2
      GROUP BY c.id_category`;

    const [failingType2Counts] = await new Promise((resolve, reject) => {
      db.query(failingType2CountQuery, [departmentId], (err, results) => {
        if (err) reject(err);
        else resolve([results, null]);
      });
    });

    // Create a map of category counts for failing type 2
    const failingType2Map = failingType2Counts.reduce((acc, row) => {
      acc[row.id_category] = row.count;
      return acc;
    }, {});

    // Get count of QMS, ATLĐ and PNKL criteria for this department
    const categoryCountQuery = `
      SELECT 
        c.id_category,
        COUNT(*) as count
      FROM tb_department_criteria dc
      JOIN tb_criteria c ON dc.id_criteria = c.id_criteria
      WHERE dc.id_department = ? AND c.id_category IN (1, 4, 5)
      GROUP BY c.id_category`;

    const [categoryResults] = await new Promise((resolve, reject) => {
      db.query(categoryCountQuery, [departmentId], (err, results) => {
        if (err) reject(err);
        else resolve([results, null]);
      });
    });

    // Create a map of category counts
    const categoryCounts = categoryResults.reduce((acc, row) => {
      acc[row.id_category] = row.count;
      return acc;
    }, {});

    const totalCriteria = totalResult[0].total;
    let deductPoints = 0;
    let hasRedStar = false;
    let hasTypeTwoQMS = false;
    let hasTypeTwoATLD = false;
    let hasTypeThree = false;

    // Track which categories have already been deducted for type 2 failures
    const deductedCategories = new Set();

    // First check if there's any PNKL knockout criteria
    const hasPNKLKnockout = failedCriteria.some(
      (criteria) => criteria.failing_point_type === 3
    );

    // Calculate point deductions and set flags
    failedCriteria.forEach((criteria) => {
      switch (criteria.failing_point_type) {
        case 0: // Normal criteria
          // Only deduct point if it's not a PNKL criterion or if there's no PNKL knockout
          if (criteria.id_category !== 4 || !hasPNKLKnockout) {
            deductPoints += 1;
          }
          break;

        case 1: // Red star criteria
          deductPoints += 1;
          hasRedStar = true;
          break;

        case 2: // QMS or ATLĐ knockout
          // Individual point deduction for type 2
          if (!deductedCategories.has(criteria.id_category)) {
            // Deduct all failing type 2 criteria points for this category
            const failingType2Count =
              failingType2Map[criteria.id_category] || 0;
            deductPoints += failingType2Count;
            deductedCategories.add(criteria.id_category);
          }

          // Set flags for type 2 separately (maintained for red star status)
          if (criteria.id_category === 5) {
            hasTypeTwoQMS = true;
            hasRedStar = true; // Maintain red star for QMS type 2
          }
          if (criteria.id_category === 1) {
            hasTypeTwoATLD = true;
            hasRedStar = true; // Maintain red star for ATLĐ type 2
          }
          break;

        case 3: // PNKL knockout
          if (!hasTypeThree) {
            // Deduct all PNKL points
            const pnklPoints = categoryCounts[4] || 0;
            deductPoints += pnklPoints;
            hasTypeThree = true;
            hasRedStar = true;
          }
          break;
      }
    });

    // Calculate final score
    let totalPoint = Math.max(
      0,
      Math.round(((totalCriteria - deductPoints) / totalCriteria) * 100)
    );

    // Store the result in tb_total_point
    const updateQuery = `
      INSERT INTO tb_total_point (id_department, id_phase, total_point)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
      total_point = VALUES(total_point)`;

    await new Promise((resolve, reject) => {
      db.query(updateQuery, [departmentId, phaseId, totalPoint], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({
      total_point: totalPoint,
      has_red_star: hasRedStar,
      has_type_two_qms: hasTypeTwoQMS,
      has_type_two_atld: hasTypeTwoATLD,
      has_type_three: hasTypeThree,
      deducted_points: deductPoints,
      total_criteria: totalCriteria,
      category_counts: categoryCounts,
      failing_type2_counts: failingType2Map,
    });
  } catch (error) {
    console.error("Error calculating total point:", error);
    res.status(500).json({ error: "Error calculating total point" });
  }
});

// Get knockout criteria
app.get("/knockout-criteria", (req, res) => {
  const query = `
    SELECT 
      c.id_criteria,
      c.codename,
      c.name_criteria,
      c.description,
      cat.name_category,
      cat.id_category,
      c.failing_point_type
    FROM 
      tb_criteria c
    JOIN
      tb_category cat ON c.id_category = cat.id_category
    WHERE 
      c.failing_point_type IN (1, 2, 3)
    ORDER BY 
      c.failing_point_type, cat.id_category, c.id_criteria
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching knockout criteria:", err);
      res.status(500).json({ error: "Error fetching knockout criteria" });
      return;
    }

    // Categorize results
    const categorizedResults = {
      redStar: results.filter((r) => r.failing_point_type === 1),
      QMSAtld: results.filter((r) => r.failing_point_type === 2),
      PNKL: results.filter((r) => r.failing_point_type === 3),
    };

    res.json(categorizedResults);
  });
});

// Get knockout criteria for a specific phase and department
app.get("/knockout-criteria/:phaseId/:departmentId", (req, res) => {
  const { phaseId, departmentId } = req.params;
  const query = `
    SELECT 
      c.id_criteria,
      c.codename,
      c.name_criteria,
      c.failing_point_type,
      c.id_category
    FROM 
      tb_criteria c
    JOIN
      tb_phase_details pd ON c.id_criteria = pd.id_criteria
    WHERE 
      pd.id_phase = ? 
      AND pd.id_department = ?
      AND pd.is_fail = 1
      AND c.failing_point_type IN (1, 2, 3)
    ORDER BY 
      c.failing_point_type, c.id_criteria
  `;

  db.query(query, [phaseId, departmentId], (err, results) => {
    if (err) {
      console.error("Error fetching knockout criteria:", err);
      res.status(500).json({ error: "Error fetching knockout criteria" });
      return;
    }

    // Categorize results
    const categorizedResults = {
      redStar: results.filter((r) => r.failing_point_type === 1),
      QMSAtld: results.filter((r) => r.failing_point_type === 2),
      PNKL: results.filter((r) => r.failing_point_type === 3),
    };

    res.json(categorizedResults);
  });
});

// Get inactive departments for a phase
app.get("/inactive-departments/:phaseId", (req, res) => {
  const phaseId = req.params.phaseId;
  const query = `
    SELECT 
      d.id_department,
      d.name_department,
      w.name_workshop,
      COALESCE(id.is_inactive, 0) as is_inactive
    FROM tb_department d
    JOIN tb_workshop w ON d.id_workshop = w.id_workshop
    LEFT JOIN tb_inactive_department id 
      ON d.id_department = id.id_department 
      AND id.id_phase = ?
    ORDER BY w.id_workshop, d.name_department
  `;

  db.query(query, [phaseId], (err, results) => {
    if (err) {
      console.error("Error fetching inactive departments:", err);
      res.status(500).json({ error: "Error fetching inactive departments" });
      return;
    }
    res.json(results);
  });
});

// Update inactive departments for a phase
app.post("/inactive-departments/:phaseId", (req, res) => {
  const phaseId = req.params.phaseId;
  const { inactiveDepartments } = req.body;

  // Start a transaction
  db.beginTransaction(async (err) => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res
        .status(500)
        .json({ error: "Error updating inactive departments" });
    }

    try {
      // First, delete existing records for this phase
      await new Promise((resolve, reject) => {
        db.query(
          "DELETE FROM tb_inactive_department WHERE id_phase = ?",
          [phaseId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Then insert new records
      if (inactiveDepartments.length > 0) {
        const values = inactiveDepartments.map((id) => [phaseId, id, 1]);
        await new Promise((resolve, reject) => {
          db.query(
            "INSERT INTO tb_inactive_department (id_phase, id_department, is_inactive) VALUES ?",
            [values],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }

      // Commit the transaction
      db.commit((err) => {
        if (err) {
          console.error("Error committing transaction:", err);
          return db.rollback(() => {
            res
              .status(500)
              .json({ error: "Error updating inactive departments" });
          });
        }
        res.json({ message: "Inactive departments updated successfully" });
      });
    } catch (error) {
      console.error("Error in transaction:", error);
      db.rollback(() => {
        res.status(500).json({ error: "Error updating inactive departments" });
      });
    }
  });
});

///////////upload ảnh gg drive////////////
// Multer config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Google OAuth2 config
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Token management
let cachedAccessToken = null;
let tokenExpirationTime = 0;

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// Get fresh access token with caching
async function getAccessToken() {
  try {
    const currentTime = Date.now();
    if (cachedAccessToken && currentTime < tokenExpirationTime - 60000) {
      // 1 minute buffer
      return cachedAccessToken;
    }

    const { token, expiry_date } = await oauth2Client.getAccessToken();
    cachedAccessToken = token;
    tokenExpirationTime = expiry_date;
    return token;
  } catch (error) {
    console.error("Error getting access token:", error);
    throw new Error("Failed to get access token");
  }
}

// Create and configure Drive instance with fresh token
async function getDriveInstance() {
  const accessToken = await getAccessToken();
  return google.drive({
    version: "v3",
    auth: oauth2Client,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

// Main upload function
async function uploadToDrive(fileBuffer, fileName, folderId) {
  try {
    const drive = await getDriveInstance();

    // Validate inputs
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error("Empty file buffer");
    }

    if (!fileName) {
      throw new Error("File name is required");
    }

    // Tạo metadata với mime type tự động
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
      description: "Upload from KSNB App",
    };

    // Tạo media object với stream
    const stream = Readable.from(fileBuffer);
    const media = {
      mimeType: "application/octet-stream",
      body: stream,
    };

    // Upload file
    // console.log("Starting file upload...");
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name, webViewLink, description",
    });

    // console.log("File uploaded successfully...");

    // Get updated file info
    const file = await drive.files.get({
      fileId: response.data.id,
      fields: "id, name, webViewLink, description",
    });

    return {
      id: file.data.id,
      name: file.data.name,
      webViewLink: file.data.webViewLink,
      description: file.data.description,
      directLink: `https://drive.google.com/uc?export=view&id=${file.data.id}`,
    };
  } catch (error) {
    console.error("Upload error details:", error);

    // Detailed error logging
    if (error.response) {
      console.error("Error response:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    }

    // Specific error handling
    if (error.code === 403) {
      throw new Error(
        "Permission denied - check your Google Drive API credentials"
      );
    } else if (error.code === 404) {
      throw new Error("Folder not found - check your folder ID");
    } else if (error.message.includes("quota")) {
      throw new Error("Google Drive quota exceeded");
    } else {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
}

// Hàm để xử lý upload song song với giới hạn
async function uploadFilesInParallel(files, maxConcurrent = 10) {
  const uploadedFiles = [];
  const errors = [];
  const chunks = [];
  const batchSize = maxConcurrent;

  // Chia files thành các nhóm nhỏ để xử lý
  for (let i = 0; i < files.length; i += batchSize) {
    chunks.push(files.slice(i, i + batchSize));
  }

  // Xử lý từng nhóm song song
  for (const chunk of chunks) {
    const uploadPromises = chunk.map(async (file) => {
      const fileStartTime = Date.now();
      try {
        // Validate file
        if (file.size > 10 * 1024 * 1024) {
          throw new Error("File size exceeds 10MB limit");
        }

        if (!file.mimetype.startsWith("image/")) {
          throw new Error("Only image files are allowed");
        }

        // Upload file
        const uploadedFile = await uploadToDrive(
          file.buffer,
          file.originalname,
          FOLDER_ID
        );

        const fileEndTime = Date.now();
        const fileUploadTime = (fileEndTime - fileStartTime) / 1000;

        uploadedFiles.push({
          ...uploadedFile,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          uploadTime: fileUploadTime,
        });

        console.log(
          `\nSuccessfully uploaded: ${
            file.originalname
          } in ${fileUploadTime.toFixed(2)}s`
        );
      } catch (error) {
        console.error(`Error uploading ${file.originalname}:`, error);
        errors.push({
          filename: file.originalname,
          error: error.message,
        });
      }
    });

    // Đợi tất cả file trong chunk hoàn thành trước khi chuyển sang chunk tiếp theo
    await Promise.all(uploadPromises);
  }

  return { uploadedFiles, errors };
}

// Upload endpoint
app.post("/upload", upload.array("photos", 10), async (req, res) => {
  const startTime = Date.now();
  console.log(`\nStarting upload of ${req.files?.length || 0} files`);

  try {
    // Validate request
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Không có file được tải lên",
      });
    }

    if (!FOLDER_ID) {
      return res.status(500).json({
        success: false,
        error: "Folder ID không được cấu hình",
      });
    }

    // Upload files song song
    const { uploadedFiles, errors } = await uploadFilesInParallel(req.files);

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(
      `\nTOTAL UPLOAD PROCESS COMPLETED IN ${totalTime.toFixed(2)} SECONDS`
    );

    // Send response
    res.json({
      success: uploadedFiles.length > 0,
      folderId: FOLDER_ID,
      uploadedFiles,
      errors,
      stats: {
        totalFiles: req.files.length,
        successfulUploads: uploadedFiles.length,
        failedUploads: errors.length,
        processingTimeSeconds: totalTime,
        averageUploadTimeSeconds:
          uploadedFiles.length > 0
            ? (
                uploadedFiles.reduce((acc, file) => acc + file.uploadTime, 0) /
                uploadedFiles.length
              ).toFixed(2)
            : 0,
      },
    });
  } catch (error) {
    const totalTime = (Date.now() - startTime) / 1000;
    console.error(
      `Upload process failed after ${totalTime.toFixed(2)} seconds:`,
      error
    );
    res.status(500).json({
      success: false,
      error: "Không thể tải ảnh lên",
      details: error.message,
      processingTimeSeconds: totalTime,
    });
  }
});

// Save image URLs to database
app.post("/save-image-urls", async (req, res) => {
  const { id_department, id_criteria, id_phase, imageUrls } = req.body;
  const imgURL_before = imageUrls.join("; ");

  const query = `
    UPDATE tb_phase_details 
    SET imgURL_before = ?
    WHERE id_department = ? AND id_criteria = ? AND id_phase = ?
  `;

  db.query(
    query,
    [imgURL_before, id_department, id_criteria, id_phase],
    (err, result) => {
      if (err) {
        console.error("Error saving image URLs:", err);
        res.status(500).json({ error: "Error saving image URLs" });
        return;
      }
      res.status(200).json({
        success: true,
        message: "Image URLs saved successfully",
      });
    }
  );
});
///////////upload ảnh gg drive////////////

//////////report page//////////
// Get report data for a specific phase
app.get("/monthly-report/:month/:year", async (req, res) => {
  const { month, year } = req.params;

  try {
    // Get phases in the specified month
    const phasesQuery = `
      SELECT id_phase, name_phase 
      FROM tb_phase 
      WHERE MONTH(date_recorded) = ? AND YEAR(date_recorded) = ?
      ORDER BY date_recorded ASC
    `;

    const [phases] = await new Promise((resolve, reject) => {
      db.query(phasesQuery, [month, year], (err, results) => {
        if (err) reject(err);
        else resolve([results, null]);
      });
    });

    // Nếu không có phases, trả về dữ liệu rỗng với cấu trúc phù hợp
    if (!phases || phases.length === 0) {
      return res.json({
        month: parseInt(month),
        year: parseInt(year),
        phases: [],
        workshops: [],
        summary: {
          totalDepartments: 0,
          totalPhases: 0,
        },
        message: "Không có dữ liệu cho tháng này",
      });
    }

    // Get all departments with their workshop names
    const departmentsQuery = `
      SELECT 
        d.id_department,
        d.name_department,
        w.name_workshop,
        w.id_workshop,
        (
          SELECT COUNT(*) 
          FROM tb_department_criteria 
          WHERE id_department = d.id_department
        ) as max_points
      FROM 
        tb_department d
        JOIN tb_workshop w ON d.id_workshop = w.id_workshop
      ORDER BY 
        w.id_workshop, d.id_department
    `;

    const [departments] = await new Promise((resolve, reject) => {
      db.query(departmentsQuery, (err, results) => {
        if (err) reject(err);
        else resolve([results, null]);
      });
    });

    // For each phase and department, get detailed information
    const departmentDetails = await Promise.all(
      departments.map(async (dept) => {
        const phaseResults = await Promise.all(
          phases.map(async (phase) => {
            // Get sum of is_fail values, total point, and knockout information
            const detailsQuery = `
              SELECT 
                COALESCE(SUM(pd.is_fail), 0) as failed_count,
                COALESCE(tp.total_point, 100) as score_percentage,
                (
                  SELECT GROUP_CONCAT(DISTINCT cat.name_category SEPARATOR ', ')
                  FROM tb_phase_details pd2
                  JOIN tb_criteria c ON pd2.id_criteria = c.id_criteria
                  JOIN tb_category cat ON c.id_category = cat.id_category
                  WHERE pd2.id_phase = ? 
                    AND pd2.id_department = ?
                    AND pd2.is_fail = 1
                    AND c.failing_point_type IN (1, 2, 3)
                ) as knockout_types,
                EXISTS (
                  SELECT 1 
                  FROM tb_phase_details pd2
                  JOIN tb_criteria c ON pd2.id_criteria = c.id_criteria
                  WHERE pd2.id_phase = ?
                    AND pd2.id_department = ?
                    AND pd2.is_fail = 1
                    AND c.failing_point_type IN (1, 2, 3)
                ) as has_knockout
              FROM 
                tb_phase_details pd
                LEFT JOIN tb_total_point tp ON tp.id_phase = pd.id_phase 
                  AND tp.id_department = pd.id_department
              WHERE 
                pd.id_phase = ? 
                AND pd.id_department = ?
              GROUP BY 
                pd.id_phase, pd.id_department
            `;

            const [details] = await new Promise((resolve, reject) => {
              db.query(
                detailsQuery,
                [
                  phase.id_phase,
                  dept.id_department,
                  phase.id_phase,
                  dept.id_department,
                  phase.id_phase,
                  dept.id_department,
                ],
                (err, results) => {
                  if (err) reject(err);
                  else resolve([results[0] || {}, null]);
                }
              );
            });

            // Prepare phase result with all necessary information
            return {
              phaseId: phase.id_phase,
              phaseName: phase.name_phase,
              failedCount: details.failed_count || 0,
              scorePercentage: details.score_percentage || 100,
              knockoutTypes: details.knockout_types || "",
              hasKnockout: details.has_knockout || false,
              needsHighlight:
                details.has_knockout ||
                (details.score_percentage && details.score_percentage < 80),
            };
          })
        );

        return {
          id_department: dept.id_department,
          name_department: dept.name_department,
          id_workshop: dept.id_workshop,
          name_workshop: dept.name_workshop,
          max_points: dept.max_points,
          phases: phaseResults,
        };
      })
    );

    // Group departments by workshop
    const workshopGroups = departmentDetails.reduce((acc, dept) => {
      if (!acc[dept.id_workshop]) {
        acc[dept.id_workshop] = {
          workshopName: dept.name_workshop,
          departments: [],
        };
      }
      acc[dept.id_workshop].departments.push({
        id_department: dept.id_department,
        name_department: dept.name_department,
        max_points: dept.max_points,
        phases: dept.phases,
      });
      return acc;
    }, {});

    // Add inactive department info to each phase
    for (const phase of phases) {
      const inactiveQuery = `
        SELECT id_department 
        FROM tb_inactive_department 
        WHERE id_phase = ? AND is_inactive = 1
      `;
      const [inactiveDepts] = await new Promise((resolve, reject) => {
        db.query(inactiveQuery, [phase.id_phase], (err, results) => {
          if (err) reject(err);
          else resolve([results, null]);
        });
      });
      phase.inactiveDepartments = inactiveDepts.map(
        (dept) => dept.id_department
      );
    }

    // Prepare and send response
    res.json({
      month: parseInt(month),
      year: parseInt(year),
      phases: phases.map((phase) => ({
        id_phase: phase.id_phase,
        name_phase: phase.name_phase,
        inactiveDepartments: phase.inactiveDepartments,
      })),
      workshops: Object.values(workshopGroups),
      summary: {
        totalDepartments: departments.length,
        totalPhases: phases.length,
      },
    });
  } catch (error) {
    console.error("Error generating monthly report:", error);
    res.status(500).json({
      error: "Error generating monthly report",
      details: error.message,
    });
  }
});

// Endpoint để lấy tất cả ảnh vi phạm của bộ phận trong một đợt
app.get("/get-phase-details-images/:phaseId/:departmentId", (req, res) => {
  const { phaseId, departmentId } = req.params;

  const query = `
    SELECT pd.id_criteria, pd.imgURL_before, pd.imgURL_after, c.name_criteria, c.codename
    FROM tb_phase_details pd
    JOIN tb_criteria c ON pd.id_criteria = c.id_criteria
    WHERE pd.id_phase = ? 
    AND pd.id_department = ?
    AND (pd.imgURL_before IS NOT NULL OR pd.imgURL_after IS NOT NULL)
  `;

  db.query(query, [phaseId, departmentId], (err, results) => {
    if (err) {
      console.error("Error fetching violation images:", err);
      res.status(500).json({ error: "Error fetching violation images" });
      return;
    }

    // Transform kết quả thành object theo criteria
    const violationImages = {};
    results.forEach((result) => {
      violationImages[result.id_criteria] = {
        criterionName: result.name_criteria,
        codename: result.codename,
        before: result.imgURL_before,
        after: result.imgURL_after,
      };
    });

    res.json(violationImages);
  });
});
//////////report page//////////

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
