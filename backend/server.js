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
  ssl: {
    rejectUnauthorized: false,
  },
});
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

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
    // Kiểm tra xem user có phải là supervisor không
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
      // Nếu là supervisor, lấy tất cả workshops
      workshopQuery = `
        SELECT 
          w.id_workshop,
          w.name_workshop,
          d.id_department,
          d.name_department
        FROM tb_workshop w
        LEFT JOIN tb_department d ON w.id_workshop = d.id_workshop
        ORDER BY w.id_workshop, d.id_department
      `;
      queryParams = [];
    } else {
      // Nếu là supervised, chỉ lấy workshop được phân công
      workshopQuery = `
        SELECT 
          w.id_workshop,
          w.name_workshop,
          d.id_department,
          d.name_department
        FROM tb_workshop w
        LEFT JOIN tb_department d ON w.id_workshop = d.id_workshop
        WHERE w.id_workshop IN (
          SELECT id_workshop 
          FROM tb_user_supervised 
          WHERE id_user = ?
        )
        ORDER BY w.id_workshop, d.id_department
      `;
      queryParams = [userId];
    }

    const results = await new Promise((resolve, reject) => {
      db.query(workshopQuery, queryParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    // Chuyển đổi kết quả phẳng thành cấu trúc phân cấp
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
  } = req.body;

  const formattedDate = moment(date_updated).format("YYYY-MM-DD HH:mm:ss");

  const updatePhaseDetails = () => {
    let query;
    let params;

    if (imgURL_after) {
      // Nếu có imgURL_after, update cả imgURL_after
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
      // Nếu không có imgURL_after, giữ nguyên query cũ
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
        // Nếu chỉ cập nhật trạng thái khắc phục
        res.status(200).json({ message: "Status updated successfully" });
      } else {
        // Nếu cập nhật điểm, tiếp tục với updateTotalPoint
        updateTotalPoint();
      }
    });
  };

  const updateTotalPoint = () => {
    const getFailedCriteriaCount = `
      SELECT COUNT(*) as failed_count
      FROM tb_phase_details
      WHERE id_department = ? AND id_phase = ? AND is_fail = 1
    `;

    db.query(
      getFailedCriteriaCount,
      [id_department, id_phase],
      (err, failedResults) => {
        if (err) {
          console.error("Error getting failed criteria count:", err);
          res.status(500).json({ error: "Error updating total point" });
          return;
        }

        const failedCount = failedResults[0].failed_count;

        const getTotalCriteriaCount = `
        SELECT COUNT(*) as total_criteria
        FROM tb_department_criteria
        WHERE id_department = ?
      `;

        db.query(
          getTotalCriteriaCount,
          [id_department],
          (err, totalResults) => {
            if (err) {
              console.error("Error getting total criteria count:", err);
              res.status(500).json({ error: "Error updating total point" });
              return;
            }

            const totalCriteria = totalResults[0].total_criteria;
            const totalPoint = Math.round(
              ((totalCriteria - failedCount) / totalCriteria) * 100
            );

            const updateTotalPointQuery = `
          INSERT INTO tb_total_point (id_department, id_phase, total_point)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
          total_point = VALUES(total_point)
        `;

            db.query(
              updateTotalPointQuery,
              [id_department, id_phase, totalPoint],
              (err, result) => {
                if (err) {
                  console.error("Error updating total point:", err);
                  res.status(500).json({ error: "Error updating total point" });
                  return;
                }
                res.status(201).json({
                  message: "Phase details and total point updated successfully",
                });
              }
            );
          }
        );
      }
    );
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

    // Get count of category 4 criteria for this department
    const category4CountQuery = `
      SELECT COUNT(*) as count
      FROM tb_department_criteria dc
      JOIN tb_criteria c ON dc.id_criteria = c.id_criteria
      WHERE dc.id_department = ? AND c.id_category = 4`;

    const [category4Result] = await new Promise((resolve, reject) => {
      db.query(category4CountQuery, [departmentId], (err, results) => {
        if (err) reject(err);
        else resolve([results, null]);
      });
    });

    const totalCriteria = totalResult[0].total;
    const category4Count = category4Result[0].count;
    let deductPoints = 0;
    let hasRedStar = false;
    let hasAbsoluteKnockout = false;

    // Check if any PNKL with failing_point_type = -1 exists
    const hasPNKLKnockout = failedCriteria.some(
      (c) => c.failing_point_type === -1
    );

    // Calculate point deductions
    failedCriteria.forEach((criteria) => {
      switch (criteria.failing_point_type) {
        case 0: // Normal criteria
          if (criteria.id_category === 4 && hasPNKLKnockout) {
            // Skip deduction for PNKL criteria if there's already a PNKL knockout
            return;
          }
          deductPoints += 1;
          break;

        case 1: // Red star criteria
          deductPoints += 1;
          hasRedStar = true;
          break;

        case -1: // PNKL knockout - only count once
          if (!hasAbsoluteKnockout) {
            deductPoints += category4Count; // Deduct all category 4 points at once
            hasRedStar = true;
            hasAbsoluteKnockout = true;
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
      has_absolute_knockout: hasAbsoluteKnockout,
      deducted_points: deductPoints,
      total_criteria: totalCriteria,
      category4_count: category4Count,
      has_pnkl_knockout: hasPNKLKnockout,
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
      c.failing_point_type
    FROM 
      tb_criteria c
    JOIN
      tb_category cat ON c.id_category = cat.id_category
    WHERE 
      c.failing_point_type IN (-1, 1, 0)
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
      PNKL: results.filter((r) => r.failing_point_type === -1),
      // safe: results.filter((r) => r.failing_point_type === 0),
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
      c.failing_point_type
    FROM 
      tb_criteria c
    JOIN
      tb_phase_details pd ON c.id_criteria = pd.id_criteria
    WHERE 
      pd.id_phase = ? 
      AND pd.id_department = ?
      AND pd.is_fail = 1
      AND c.failing_point_type IN (-1, 1)
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
      absoluteKnockout: results.filter((r) => r.failing_point_type === -1),
    };

    res.json(categorizedResults);
  });
});

///////////upload ảnh gg photos////////////
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn kích thước file, ví dụ: 10MB
// });

// const oauth2Client = new google.auth.OAuth2(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   process.env.GOOGLE_REDIRECT_URI
// );
// let cachedAccessToken = null;
// let tokenExpirationTime = 0;

// async function getAccessToken() {
//   const currentTime = Date.now();
//   if (cachedAccessToken && currentTime < tokenExpirationTime) {
//     return cachedAccessToken;
//   }

//   const { token, expiry_date } = await oauth2Client.getAccessToken();
//   cachedAccessToken = token;
//   tokenExpirationTime = expiry_date;
//   return token;
// }
// oauth2Client.on("tokens", (tokens) => {
//   if (tokens.refresh_token) {
//     // Lưu refresh_token mới nếu nhận được
//     process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
//   }
// });

// oauth2Client.setCredentials({
//   refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
// });

// async function retryWithBackoff(fn, maxRetries = 5, initialDelay = 1000) {
//   let delay = initialDelay;
//   for (let i = 0; i < maxRetries; i++) {
//     try {
//       return await fn();
//     } catch (error) {
//       if (
//         error.response &&
//         (error.response.status === 429 || error.response.status >= 500)
//       ) {
//         if (i === maxRetries - 1) throw error;
//         console.log(
//           `Retrying after ${delay}ms due to ${error.response.status} error`
//         );
//         await new Promise((resolve) => setTimeout(resolve, delay));
//         delay *= 2; // Exponential backoff
//       } else {
//         throw error;
//       }
//     }
//   }
// }

// async function uploadPhoto(fileBuffer, fileName) {
//   return retryWithBackoff(async () => {
//     const accessToken = await getAccessToken();

//     if (!fileBuffer || fileBuffer.length === 0) {
//       throw new Error("File buffer is empty");
//     }

//     try {
//       const response = await axios.post(
//         "https://photoslibrary.googleapis.com/v1/uploads",
//         fileBuffer,
//         {
//           headers: {
//             "Content-Type": "application/octet-stream",
//             "X-Goog-Upload-File-Name": encodeURIComponent(fileName),
//             "X-Goog-Upload-Protocol": "raw",
//             Authorization: `Bearer ${accessToken}`,
//           },
//         }
//       );
//       return response.data;
//     } catch (error) {
//       console.error(
//         "Error in uploadPhoto:",
//         error.response?.data || error.message
//       );
//       throw error;
//     }
//   });
// }

// async function createMediaItemInAlbum(uploadToken, albumId) {
//   try {
//     const accessToken = await getAccessToken();
//     const response = await axios.post(
//       "https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate",
//       {
//         albumId: albumId,
//         newMediaItems: [
//           {
//             description: "Uploaded from Node.js",
//             simpleMediaItem: {
//               uploadToken: uploadToken,
//             },
//           },
//         ],
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${accessToken}`,
//         },
//       }
//     );

//     if (
//       !response.data.newMediaItemResults ||
//       response.data.newMediaItemResults.length === 0
//     ) {
//       throw new Error("No media items were created");
//     }

//     const mediaItem = response.data.newMediaItemResults[0];
//     if (mediaItem.status && mediaItem.status.message !== "Success") {
//       throw new Error(
//         `Failed to create media item: ${mediaItem.status.message}`
//       );
//     }

//     return mediaItem.mediaItem;
//   } catch (error) {
//     console.error(
//       "Error in createMediaItemInAlbum:",
//       error.response?.data || error.message
//     );
//     throw error;
//   }
// }

// app.post("/upload", upload.array("photos", 10), async (req, res) => {
//   const startTime = Date.now();
//   console.log("Received files:", req.files);

//   try {
//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({
//         success: false,
//         error: "No files were uploaded",
//       });
//     }

//     const albumId = req.query.albumId;
//     if (!albumId) {
//       return res.status(400).json({
//         success: false,
//         error: "Album ID is required",
//       });
//     }

//     const mediaItems = [];
//     const errors = [];

//     // Process each file sequentially to avoid rate limiting
//     for (const file of req.files) {
//       try {
//         const { buffer, originalname } = file;
//         console.log(`Processing file: ${originalname}`);

//         // Upload photo
//         const uploadToken = await uploadPhoto(buffer, originalname);
//         console.log(`Upload token received for ${originalname}`);

//         // Create media item
//         const mediaItem = await createMediaItemInAlbum(uploadToken, albumId);
//         console.log(`Media item created for ${originalname}`);

//         mediaItems.push(mediaItem);
//       } catch (error) {
//         console.error(`Error processing file ${file.originalname}:`, error);
//         errors.push({
//           filename: file.originalname,
//           error: error.message || "Unknown error occurred",
//         });
//       }
//     }

//     const endTime = Date.now();
//     console.log(`Upload completed in ${endTime - startTime}ms`);

//     res.json({
//       success: true,
//       albumId: albumId,
//       mediaItems: mediaItems,
//       errors: errors,
//       totalFiles: req.files.length,
//       successfulUploads: mediaItems.length,
//       failedUploads: errors.length,
//       processingTime: endTime - startTime,
//     });
//   } catch (error) {
//     const endTime = Date.now();
//     console.error(
//       `Upload failed in ${endTime - startTime}ms:`,
//       error.response?.data || error.message
//     );

//     res.status(500).json({
//       success: false,
//       error: "Failed to upload images",
//       details: error.response?.data || error.message,
//       processingTime: endTime - startTime,
//     });
//   }
// });

// // API to save image URLs to the database
// app.post("/save-image-urls", async (req, res) => {
//   const { id_department, id_criteria, id_phase, imageUrls } = req.body;
//   const imgURL_before = imageUrls.join("; ");

//   const query = `
//     UPDATE tb_phase_details
//     SET imgURL_before = ?
//     WHERE id_department = ? AND id_criteria = ? AND id_phase = ?
//   `;

//   db.query(
//     query,
//     [imgURL_before, id_department, id_criteria, id_phase],
//     (err, result) => {
//       if (err) {
//         console.error("Error saving image URLs:", err);
//         res.status(500).json({ error: "Error saving image URLs" });
//         return;
//       }
//       res.status(200).json({ message: "Image URLs saved successfully" });
//     }
//   );
// });
///////////upload ảnh gg photos////////////

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

// Retry mechanism for API calls
async function retryWithBackoff(fn, maxRetries = 5, initialDelay = 1000) {
  let lastError = null;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (
        error.response &&
        (error.response.status === 429 || error.response.status >= 500)
      ) {
        if (attempt === maxRetries) break;

        console.log(
          `Attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        // Non-retryable error
        throw error;
      }
    }
  }

  throw lastError;
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

// Set file permissions
async function setFilePermissions(fileId) {
  const drive = await getDriveInstance();
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
  } catch (error) {
    console.error("Error setting file permissions:", error);
    throw error;
  }
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
    console.log("Starting file upload...");
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name, webViewLink, description",
    });

    console.log("File uploaded successfully, setting permissions...");

    // Set permissions
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    console.log("Permissions set successfully");

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

// Upload endpoint
app.post("/upload", upload.array("photos", 10), async (req, res) => {
  const startTime = Date.now();
  console.log(`\nStarting upload of ${req.files?.length || 0} files`);
  const folderId = FOLDER_ID;

  try {
    // Validate request
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Không có file được tải lên",
      });
    }

    // Sử dụng FOLDER_ID từ biến môi trường thay vì từ query params
    if (!FOLDER_ID) {
      return res.status(500).json({
        success: false,
        error: "Folder ID không được cấu hình",
      });
    }

    const uploadedFiles = [];
    const errors = [];

    // Process files sequentially
    for (const file of req.files) {
      try {
        const fileStartTime = Date.now();
        console.log(`\nProcessing file: ${file.originalname}`);

        // Basic validations
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
        const fileUploadTime = (fileEndTime - fileStartTime) / 1000; // Convert to seconds
        console.log(`Successfully uploaded: ${file.originalname}`);
        console.log(`File uploaded in ${fileUploadTime.toFixed(2)} seconds`);

        uploadedFiles.push({
          ...uploadedFile,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          uploadTime: fileUploadTime,
        });
      } catch (error) {
        console.error(`Error uploading ${file.originalname}:`, error);
        errors.push({
          filename: file.originalname,
          error: error.message,
        });
      }
    }

    const totalTime = (Date.now() - startTime) / 1000; // Convert to seconds
    console.log(
      `\nTOTAL UPLOAD PROCESS COMPLETED IN ${totalTime.toFixed(2)} SECONDS`
    );

    // Send response
    res.json({
      success: uploadedFiles.length > 0,
      folderId,
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

    if (!phases || phases.length === 0) {
      return res.status(404).json({
        error: "No phases found for the specified month and year",
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
            // Get failed criteria count, total point, and knockout information
            const detailsQuery = `
              SELECT 
                COUNT(DISTINCT pd.id_criteria) as failed_count,
                COALESCE(tp.total_point, 100) as score_percentage,
                (
                  SELECT GROUP_CONCAT(DISTINCT cat.name_category SEPARATOR ', ')
                  FROM tb_phase_details pd2
                  JOIN tb_criteria c ON pd2.id_criteria = c.id_criteria
                  JOIN tb_category cat ON c.id_category = cat.id_category
                  WHERE pd2.id_phase = ? 
                    AND pd2.id_department = ?
                    AND pd2.is_fail = 1
                    AND c.failing_point_type IN (-1, 1)
                ) as knockout_types,
                EXISTS (
                  SELECT 1 
                  FROM tb_phase_details pd2
                  JOIN tb_criteria c ON pd2.id_criteria = c.id_criteria
                  WHERE pd2.id_phase = ?
                    AND pd2.id_department = ?
                    AND pd2.is_fail = 1
                    AND c.failing_point_type IN (-1, 1)
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
              pnklCount: details.pnkl_count || 0,
              redStarCount: details.red_star_count || 0,
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

    // Prepare and send response
    res.json({
      month: parseInt(month),
      year: parseInt(year),
      phases: phases.map((phase) => ({
        id_phase: phase.id_phase,
        name_phase: phase.name_phase,
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
//////////report page//////////

const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
