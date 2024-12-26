// backend/server.js
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const moment = require("moment-timezone");
const bcrypt = require("bcryptjs");
const multer = require("multer");
require("dotenv").config();
const { google } = require("googleapis");
const fs = require("fs");
const compression = require("compression");
const axios = require("axios");
const axiosRetry = require("axios-retry").default;
const { Readable } = require("stream");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const util = require("util");

// Configure axios retry
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      error.code === "EAI_AGAIN"
    );
  },
});

// Configure axios defaults
axios.defaults.timeout = 30000; // 30 seconds
axios.defaults.headers = {
  "Keep-Alive": "timeout=5, max=100",
};

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10, // Số lượng connection tối đa
  waitForConnections: true, // Queue queries when no connections available
  queueLimit: 0, // Unlimited queue size
  connectTimeout: 60000, // 60 seconds
  enableKeepAlive: true, // Thêm keepAlive
  keepAliveInitialDelay: 0, // Bắt đầu keepAlive ngay lập tức
  multipleStatements: true, // Cho phép nhiều câu lệnh SQL
});

// Log mỗi khi có connection mới
// pool.on("connection", (connection) => {
//   console.log("Connected to MySQL database");
// });

// Log khi có lỗi
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Cleanup khi shutdown
process.on("SIGINT", () => {
  pool.end((err) => {
    console.log("Pool has ended");
    process.exit(err ? 1 : 0);
  });
});

// Check user password is valid in LoginPage.js
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const query = "SELECT * FROM tb_user WHERE name_user = ?";
  pool.query(query, [username], async (err, results) => {
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

// check có phải là người giám sát ko
app.get("/check-supervisor/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    // Check cả role admin và supervisor
    const roleQuery = `
      SELECT 1 
      FROM tb_role r
      WHERE r.id_user = ? AND (r.id_permission = 2 OR r.id_permission = 1)
    `;

    const [roleResults] = await new Promise((resolve, reject) => {
      pool.query(roleQuery, [userId], (err, results) => {
        if (err) reject(err);
        else resolve([results, null]);
      });
    });

    // Nếu là admin thì trả về true luôn
    if (roleResults.some((r) => r.id_permission === 1)) {
      return res.json({ isSupervisor: true });
    }

    // Nếu là supervisor thì check thêm trong tb_user_supervisor
    if (roleResults.length > 0) {
      const supervisorQuery = `
        SELECT 1 FROM tb_user_supervisor WHERE id_user = ?
      `;

      const [supervisorResults] = await new Promise((resolve, reject) => {
        pool.query(supervisorQuery, [userId], (err, results) => {
          if (err) reject(err);
          else resolve([results, null]);
        });
      });

      return res.json({ isSupervisor: supervisorResults.length > 0 });
    }

    res.json({ isSupervisor: false });
  } catch (error) {
    console.error("Error checking supervisor role:", error);
    res.status(500).json({ error: "Error checking supervisor role" });
  }
});

// Thêm API check supervised
app.get("/check-supervised/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    // Đầu tiên check trong tb_role
    const roleQuery = `
      SELECT 1 
      FROM tb_role r
      WHERE r.id_user = ? AND r.id_permission = 3
    `;

    const [roleResults] = await new Promise((resolve, reject) => {
      pool.query(roleQuery, [userId], (err, results) => {
        if (err) reject(err);
        else resolve([results, null]);
      });
    });

    // Nếu không có role supervised thì trả về false luôn
    if (roleResults.length === 0) {
      return res.json({ isSupervised: false });
    }

    // Nếu có role thì check tiếp trong tb_user_supervised
    const supervisedQuery = `
      SELECT 1 
      FROM tb_user_supervised 
      WHERE id_user = ?
    `;

    const [supervisedResults] = await new Promise((resolve, reject) => {
      pool.query(supervisedQuery, [userId], (err, results) => {
        if (err) reject(err);
        else resolve([results, null]);
      });
    });

    res.json({ isSupervised: supervisedResults.length > 0 });
  } catch (error) {
    console.error("Error checking supervised role:", error);
    res.status(500).json({ error: "Error checking supervised role" });
  }
});

// endpoint để check admin permission
app.get("/check-admin/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = `
    SELECT 1 
    FROM tb_role r
    WHERE r.id_user = ? AND r.id_permission = 1
  `;

  pool.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error checking admin role:", err);
      res.status(500).json({ error: "Error checking admin role" });
      return;
    }

    res.json({ isAdmin: results.length > 0 });
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

  pool.query(query, [userId], (err, results) => {
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
      pool.query(supervisorQuery, [userId], (err, results) => {
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
      pool.query(workshopQuery, queryParams, (err, results) => {
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

  pool.query(query, [departmentId, userId, departmentId], (err, results) => {
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

  pool.query(query, (err, results) => {
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
  pool.query(query, [phaseId], (err, results) => {
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
  pool.query(
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

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting connection:", err);
      return res.status(500).json({ error: "Database connection error" });
    }

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: "Error starting transaction" });
      }

      try {
        // Delete inactive departments
        await new Promise((resolve, reject) => {
          connection.query(
            "DELETE FROM tb_inactive_department WHERE id_phase = ?",
            [phaseId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // Delete phase details
        await new Promise((resolve, reject) => {
          connection.query(
            "DELETE FROM tb_phase_details WHERE id_phase = ?",
            [phaseId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // Delete total points
        await new Promise((resolve, reject) => {
          connection.query(
            "DELETE FROM tb_total_point WHERE id_phase = ?",
            [phaseId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // Delete phase
        await new Promise((resolve, reject) => {
          connection.query(
            "DELETE FROM tb_phase WHERE id_phase = ?",
            [phaseId],
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          );
        });

        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ error: "Error committing transaction" });
            });
          }
          connection.release();
          res.json({ message: "Phase deleted successfully" });
        });
      } catch (error) {
        connection.rollback(() => {
          connection.release();
          res.status(500).json({ error: "Transaction failed" });
        });
      }
    });
  });
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
  pool.query(
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

  pool.query(query, (err, results) => {
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

  pool.query(query, [userId], (err, results) => {
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

  pool.query(query, [userId, departmentId], (err, results) => {
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

  pool.query(query, (err, results) => {
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

  pool.query(query, (err, results) => {
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

  pool.query(query, [departmentId], (err, results) => {
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
      // When marking as "đạt", clear both imgURL_before and description_before
      query = `
        INSERT INTO tb_phase_details (
          id_department, 
          id_criteria, 
          id_phase, 
          id_user, 
          is_fail, 
          date_updated,
          status_phase_details,
          imgURL_before,
          description_before
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)
        ON DUPLICATE KEY UPDATE
        is_fail = VALUES(is_fail),
        date_updated = VALUES(date_updated),
        status_phase_details = VALUES(status_phase_details),
        imgURL_before = NULL,
        description_before = NULL
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

    pool.query(query, params, (err, result) => {
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
        pool.query(
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
        pool.query(totalCriteriaQuery, [id_department], (err, results) => {
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
        pool.query(
          updateQuery,
          [id_department, id_phase, totalPoint],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
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

    pool.query(query, [phaseId, departmentId, criterionId], (err, results) => {
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

  pool.query(query, [phaseId, departmentId], (err, results) => {
    if (err) {
      console.error("Error fetching criteria statuses:", err);
      res.status(500).json({ error: "Error fetching criteria statuses" });
      return;
    }

    res.json(results);
  });
});

// Update criterion status
app.post("/update-criterion-status", async (req, res) => {
  const { phaseId, departmentId, criterionId, status } = req.body;

  try {
    await new Promise((resolve, reject) => {
      pool.query(
        `UPDATE tb_phase_details 
         SET status_phase_details = ?
         WHERE id_phase = ? AND id_department = ? AND id_criteria = ?`,
        [
          status ? "ĐÃ KHẮC PHỤC" : "CHƯA KHẮC PHỤC",
          phaseId,
          departmentId,
          criterionId,
        ],
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });

    res.json({ success: true, message: "Status updated successfully" });
  } catch (error) {
    console.error("Error updating criterion status:", error);
    res.status(500).json({ error: "Error updating criterion status" });
  }
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

    pool.query(query, [phaseId, departmentId, criterionId], (err, results) => {
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

  pool.query(query, [phaseId], (err, results) => {
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

  pool.query(query, [phaseId], (err, results) => {
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
        c.id_category,
        CAST(c.red_star AS UNSIGNED) as red_star
      FROM tb_phase_details pd
      JOIN tb_criteria c ON pd.id_criteria = c.id_criteria
      WHERE pd.id_phase = ? 
        AND pd.id_department = ? 
        AND pd.is_fail = 1`;

    const [failedCriteria] = await new Promise((resolve, reject) => {
      pool.query(
        failedCriteriaQuery,
        [phaseId, departmentId],
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
      pool.query(totalCriteriaQuery, [departmentId], (err, results) => {
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
      pool.query(failingType2CountQuery, [departmentId], (err, results) => {
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
      pool.query(categoryCountQuery, [departmentId], (err, results) => {
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
    let hasRedStar = false; // Chỉ set true khi có tiêu chí red_star = 1
    let hasTypeTwoQMS = false;
    let hasTypeTwoATLD = false;
    let hasTypeTwoTTNV = false;
    let hasTypeThree = false;

    // Track which categories have already been deducted for type 2 failures
    const deductedCategories = new Set();

    // First check if there's any PNKL knockout criteria
    const hasPNKLKnockout = failedCriteria.some(
      (criteria) => criteria.failing_point_type === 3
    );

    // Calculate point deductions and set flags
    failedCriteria.forEach((criteria) => {
      // Kiểm tra red_star
      if (criteria.red_star === 1) {
        hasRedStar = true;
      }

      switch (criteria.failing_point_type) {
        case 0: // Normal criteria
          if (criteria.id_category !== 4 || !hasPNKLKnockout) {
            deductPoints += 1;
          }
          break;

        case 1: // Old Red star criteria dont use this anymore
          deductPoints += 1;
          break;

        case 2: // QMS or ATLĐ knockout
          if (!deductedCategories.has(criteria.id_category)) {
            const failingType2Count =
              failingType2Map[criteria.id_category] || 0;
            deductPoints += failingType2Count;
            deductedCategories.add(criteria.id_category);
          }
          if (criteria.id_category === 1) {
            hasTypeTwoATLD = true;
          }
          if (criteria.id_category === 5) {
            hasTypeTwoQMS = true;
          }
          if (criteria.id_category === 6) {
            hasTypeTwoTTNV = true;
          }
          break;

        case 3: // PNKL knockout
          if (!hasTypeThree) {
            const pnklPoints = categoryCounts[4] || 0;
            deductPoints += pnklPoints;
            hasTypeThree = true;
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
      pool.query(updateQuery, [departmentId, phaseId, totalPoint], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({
      total_point: totalPoint,
      has_red_star: hasRedStar, // Chỉ true khi có tiêu chí red_star = 1
      has_type_two_qms: hasTypeTwoQMS,
      has_type_two_atld: hasTypeTwoATLD,
      has_type_two_ttnv: hasTypeTwoTTNV,
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

  pool.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching knockout criteria:", err);
      res.status(500).json({ error: "Error fetching knockout criteria" });
      return;
    }

    // Categorize results
    const categorizedResults = {
      redStar: results.filter((r) => r.failing_point_type === 1),
      typeTwo: results.filter((r) => r.failing_point_type === 2),
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

  pool.query(query, [phaseId, departmentId], (err, results) => {
    if (err) {
      console.error("Error fetching knockout criteria:", err);
      res.status(500).json({ error: "Error fetching knockout criteria" });
      return;
    }

    // Categorize results
    const categorizedResults = {
      redStar: results.filter((r) => r.failing_point_type === 1),
      typeTwo: results.filter((r) => r.failing_point_type === 2),
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
      CAST(COALESCE(id.is_inactive, 0) AS UNSIGNED) as is_inactive
    FROM tb_department d
    JOIN tb_workshop w ON d.id_workshop = w.id_workshop
    LEFT JOIN tb_inactive_department id 
      ON d.id_department = id.id_department 
      AND id.id_phase = ?
    ORDER BY w.id_workshop, d.name_department
  `;

  pool.query(query, [phaseId], (err, results) => {
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

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting connection:", err);
      return res.status(500).json({ error: "Database connection error" });
    }

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: "Error starting transaction" });
      }

      try {
        // Delete existing records
        await new Promise((resolve, reject) => {
          connection.query(
            "DELETE FROM tb_inactive_department WHERE id_phase = ?",
            [phaseId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // Insert new records if any
        if (inactiveDepartments.length > 0) {
          const values = inactiveDepartments.map((id) => [phaseId, id, 1]);
          await new Promise((resolve, reject) => {
            connection.query(
              "INSERT INTO tb_inactive_department (id_phase, id_department, is_inactive) VALUES ?",
              [values],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }

        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ error: "Error committing transaction" });
            });
          }
          connection.release();
          res.json({ message: "Inactive departments updated successfully" });
        });
      } catch (error) {
        connection.rollback(() => {
          connection.release();
          res.status(500).json({ error: "Transaction failed" });
        });
      }
    });
  });
});

// Sửa endpoint get departments without remediation
app.get("/departments-without-remediation/:phaseId", async (req, res) => {
  const { phaseId } = req.params;
  const userId = req.query.userId;

  try {
    // Kiểm tra role của user
    const roleQuery = `
      SELECT id_permission 
      FROM tb_role 
      WHERE id_user = ?`;

    const [roleResults] = await new Promise((resolve, reject) => {
      pool.query(roleQuery, [userId], (err, results) => {
        if (err) reject(err);
        else resolve([results]);
      });
    });

    // Sửa query chính để thêm date_recorded vào SELECT khi dùng DISTINCT
    let query = `
      SELECT DISTINCT
        p.id_phase,
        p.name_phase,
        p.date_recorded,
        DATE_FORMAT(p.date_recorded, '%Y-%m-%d %H:%i:%s') as formatted_date,
        MONTH(p.date_recorded) as phase_month,
        YEAR(p.date_recorded) as phase_year,
        w.id_workshop,
        w.name_workshop,
        d.name_department,
        c.codename,
        c.name_criteria,
        pd.status_phase_details,
        pd.date_updated
      FROM tb_phase_details pd
      JOIN tb_department d ON pd.id_department = d.id_department
      JOIN tb_workshop w ON d.id_workshop = w.id_workshop
      JOIN tb_criteria c ON pd.id_criteria = c.id_criteria
      JOIN tb_phase p ON pd.id_phase = p.id_phase
      LEFT JOIN tb_inactive_department id ON 
        pd.id_department = id.id_department 
        AND pd.id_phase = id.id_phase
      WHERE pd.is_fail = 1 
        AND pd.imgURL_after IS NULL
        AND pd.status_phase_details = 'CHƯA KHẮC PHỤC'
        AND (id.is_inactive IS NULL OR id.is_inactive = 0)`;

    // Nếu user có role supervised (3), thêm điều kiện lọc theo workshop được phân công
    if (roleResults.some((r) => r.id_permission === 3)) {
      query += `
        AND w.id_workshop IN (
          SELECT id_workshop 
          FROM tb_user_supervised 
          WHERE id_user = ?
        )`;
    }

    // Thêm ORDER BY với date_recorded và id_workshop
    query += ` ORDER BY p.date_recorded DESC, w.id_workshop ASC, d.name_department, c.codename ASC`;

    const [results] = await new Promise((resolve, reject) => {
      // Nếu là supervised user, truyền thêm userId vào query
      const params = roleResults.some((r) => r.id_permission === 3)
        ? [userId]
        : [];
      pool.query(query, params, (err, results) => {
        if (err) reject(err);
        else resolve([results]);
      });
    });

    // Map kết quả để sử dụng formatted_date thay vì date_recorded gốc
    const formattedResults = results.map((row) => ({
      ...row,
      date_recorded: row.formatted_date,
      formatted_date: undefined, // Loại bỏ trường tạm
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error("Error fetching departments without remediation:", error);
    res.status(500).json({ error: "Error fetching departments data" });
  }
});

// Get available months and years
app.get("/available-dates", (req, res) => {
  const query = `
    SELECT DISTINCT 
      MONTH(date_recorded) as month,
      YEAR(date_recorded) as year
    FROM tb_phase
    ORDER BY year DESC, month DESC
  `;

  pool.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching available dates:", err);
      res.status(500).json({ error: "Error fetching dates" });
      return;
    }
    res.json(results);
  });
});

///////////upload ảnh gg drive////////////
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
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

/////////không xóa hàm này, hàm này để refresh token/////////
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
/////////không xóa hàm này, hàm này để refresh token/////////

// Create and configure Drive instance with fresh token
async function getDriveInstance() {
  const accessToken = await getAccessToken();
  return google.drive({
    version: "v3",
    auth: oauth2Client,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: RETRY_CONFIG.timeoutMs,
    retry: true,
    retryConfig: {
      retry: RETRY_CONFIG.maxRetries,
      retryDelay: RETRY_CONFIG.initialDelay,
      statusCodesToRetry: [[500, 599]],
      httpMethodsToRetry: ["POST", "GET"],
    },
  });
}

const dns = require("dns");
dns.setServers([
  "8.8.8.8", // Google DNS
  "8.8.4.4", // Google DNS alternate
  "1.1.1.1", // Cloudflare DNS
  "1.0.0.1", // Cloudflare DNS alternate
  "208.67.222.222", // OpenDNS
  "208.67.220.220", // OpenDNS alternate
]);

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3, // Giảm số lần retry
  initialDelay: 1000, // Giảm delay ban đầu
  maxDelay: 15000, // Giảm max delay
  timeoutMs: 20000, // Giảm timeout
  maxParallelUploads: 20, // Giảm số lượng upload parallel

  // Thêm các cấu hình mới
  chunkSize: 10, // Số file trong mỗi chunk
  retryMultiplier: 1.5, // Hệ số tăng delay (thay vì 2)
  minRetryDelay: 500, // Delay tối thiểu
};

// Sleep utility
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// DNS resolution check
async function checkDNSResolution() {
  try {
    const addresses = await dns.promises.resolve4("www.googleapis.com");
    return addresses.length > 0;
  } catch (error) {
    console.error("DNS resolution failed:", error);
    return false;
  }
}

// Hàm kiểm tra file đã tồn tại trên Drive
async function checkFileExists(fileName, folderId) {
  try {
    const drive = await getDriveInstance();
    const response = await drive.files.list({
      q: `name = '${fileName}' and '${folderId}' in parents and trashed = false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    return response.data.files.length > 0 ? response.data.files[0] : null;
  } catch (error) {
    console.error("Error checking file existence:", error);
    return null;
  }
}

// Hàm xóa file cũ trên Drive
async function deleteFile(fileId) {
  try {
    const drive = await getDriveInstance();
    await drive.files.delete({ fileId });
    console.log(`Successfully deleted file with ID: ${fileId}`);
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
}

// Cập nhật hàm uploadToDrive
async function uploadToDrive(fileBuffer, fileName, folderId, phaseInfo = {}) {
  let currentDelay = RETRY_CONFIG.minRetryDelay;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Fast fail check for DNS và token
      const [isDNSWorking, hasValidToken] = await Promise.all([
        checkDNSResolution(),
        checkTokenValidity(),
      ]);

      if (!isDNSWorking || !hasValidToken) {
        throw new Error("Network or token validation failed");
      }

      // Kiểm tra file tồn tại
      const existingFile = await checkFileExists(fileName, folderId);
      if (existingFile) {
        console.log(`File ${fileName} already exists, replacing...`);

        // Xóa file cũ
        await deleteFile(existingFile.id);
      }

      // Upload file mới
      const drive = await getDriveInstance();

      // Tối ưu promise racing
      const uploadPromise = new Promise(async (resolve, reject) => {
        try {
          const fileMetadata = {
            name: fileName,
            parents: [folderId],
            description: getDescription(phaseInfo),
          };

          // Sử dụng streaming tối ưu
          const stream = Readable.from(fileBuffer, {
            highWaterMark: 64 * 1024, // 64KB chunks
          });

          const response = await drive.files.create({
            requestBody: fileMetadata,
            media: {
              mimeType: "application/octet-stream",
              body: stream,
            },
            fields: "id, name, webViewLink, description",
          });

          // Fast resolve ngay khi có ID
          resolve({
            id: response.data.id,
            name: response.data.name,
            webViewLink: response.data.webViewLink,
            description: response.data.description,
            directLink: `https://drive.google.com/uc?export=view&id=${response.data.id}`,
          });
        } catch (error) {
          reject(error);
        }
      });

      // Dynamic timeout dựa trên kích thước file
      const timeoutMs = Math.min(
        RETRY_CONFIG.timeoutMs,
        (fileBuffer.length / 1024) * 2 + 5000 // 2ms/KB + 5s base
      );

      return await Promise.race([uploadPromise, createTimeout(timeoutMs)]);
    } catch (error) {
      if (attempt === RETRY_CONFIG.maxRetries) {
        throw error;
      }

      // Tối ưu delay giữa các lần retry
      currentDelay = Math.min(
        currentDelay * RETRY_CONFIG.retryMultiplier,
        RETRY_CONFIG.maxDelay
      );

      await sleep(currentDelay);
    }
  }
}

// Cập nhật hàm uploadFilesInParallel để xử lý file trùng lặp
async function uploadFilesInParallel(files, phaseInfo = {}) {
  const startTime = Date.now();
  console.log(`\nStarting batch upload of ${files.length} files...`);

  const results = {
    uploadedFiles: [],
    errors: [],
  };

  // Sắp xếp files theo ID
  const sortedFiles = [...files].sort((a, b) => {
    const idA = parseInt(a.originalname.match(/^new-(\d+)/)?.[1] || "0");
    const idB = parseInt(b.originalname.match(/^new-(\d+)/)?.[1] || "0");
    return idA - idB;
  });

  // Sinh tên file tuần tự trước
  const preparedFiles = await Promise.all(
    sortedFiles.map(async (file, index) => {
      const filename = await generateFileName(
        file.originalname,
        index,
        phaseInfo.isRemediation,
        phaseInfo,
        phaseInfo.phaseId,
        phaseInfo.departmentId,
        phaseInfo.criterionId
      );
      return {
        ...file,
        generatedFileName: filename,
      };
    })
  );

  // Kiểm tra và loại bỏ các file trùng lặp
  const uniqueFiles = [];
  const seenNames = new Set();

  for (const file of preparedFiles) {
    if (!seenNames.has(file.generatedFileName)) {
      seenNames.add(file.generatedFileName);
      uniqueFiles.push(file);
    }
  }

  // Chia files thành các chunks để upload song song
  const chunks = chunkArray(uniqueFiles, RETRY_CONFIG.chunkSize);

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    console.log(
      `\nProcessing chunk ${chunkIndex + 1}/${chunks.length} (${
        chunk.length
      } files)`
    );

    // Thêm delay giữa các chunk
    if (chunkIndex > 0) {
      await sleep(1000); // delay 1s giữa các chunk
    }

    const promises = chunk.map(async (file) => {
      const fileStartTime = Date.now();
      try {
        console.log(`Uploading ${file.generatedFileName}...`);

        const result = await uploadToDrive(
          file.buffer,
          file.generatedFileName,
          FOLDER_ID,
          phaseInfo
        );

        const uploadTime = (Date.now() - fileStartTime) / 1000;
        console.log(
          `Successfully uploaded ${
            file.generatedFileName
          } in ${uploadTime.toFixed(2)}s`
        );

        results.uploadedFiles.push({
          ...result,
          originalName: file.originalname,
          size: file.size,
          uploadTime,
        });
      } catch (error) {
        const uploadTime = (Date.now() - fileStartTime) / 1000;
        console.error(
          `Error uploading ${file.originalname} after ${uploadTime.toFixed(
            2
          )}s:`,
          error.message
        );
        results.errors.push({
          filename: file.originalname,
          error: error.message,
          uploadTime,
        });
      }
    });

    await Promise.all(promises);
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log(
    `\nBatch upload completed in ${totalTime.toFixed(2)}s:`,
    `${results.uploadedFiles.length} successful,`,
    `${results.errors.length} failed`
  );

  return results;
}

// Utility functions
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + Math.min(size, array.length - i)));
  }
  return chunks;
}

function createTimeout(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Upload timeout")), ms)
  );
}

function getDescription(phaseInfo) {
  return phaseInfo.phase && phaseInfo.department && phaseInfo.criteria
    ? `Upload from KSNB App - Đợt ${phaseInfo.phase} - ${phaseInfo.department} - ${phaseInfo.criteria}`
    : "Upload from KSNB App";
}

async function checkTokenValidity() {
  try {
    return (await getAccessToken()) != null;
  } catch {
    return false;
  }
}

// Updated generateFileName function
const generateFileName = async (
  originalName,
  index,
  isRemediation,
  phaseInfo,
  phaseId,
  departmentId,
  criterionId
) => {
  const ext = originalName.split(".").pop();
  const prefix = isRemediation ? "Hình ảnh khắc phục" : "Hình ảnh vi phạm";

  // Get current max number from database - thêm DISTINCT để tránh đếm trùng
  const [imagesResponse] = await new Promise((resolve, reject) => {
    pool.query(
      `SELECT 
        IF(? = true, 
          GROUP_CONCAT(DISTINCT description_after), 
          GROUP_CONCAT(DISTINCT description_before)
        ) as descriptions
       FROM tb_phase_details 
       WHERE id_phase = ? AND id_department = ? AND id_criteria = ?`,
      [isRemediation, phaseId, departmentId, criterionId],
      (err, results) => {
        if (err) reject(err);
        else resolve([results[0], null]);
      }
    );
  });

  let maxNumber = 0;
  if (imagesResponse?.descriptions) {
    const numbers = imagesResponse.descriptions
      .split(";")
      .map((desc) => {
        const match = desc.match(/(?:vi phạm|khắc phục)\s+(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter((num) => !isNaN(num));

    maxNumber = Math.max(0, ...numbers);
  }

  // Generate unique filename với timestamp để tránh trùng lặp
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newNumber = maxNumber + index + 1;

  return `${prefix} ${newNumber} - Đợt ${phaseInfo.phase} - ${phaseInfo.department} - ${phaseInfo.criteria} - ${uniqueId}.${ext}`;
};

// Upload endpoint
app.post("/upload", upload.array("photos", 20), async (req, res) => {
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

    // Lấy thông tin từ body request
    const phaseInfo = {
      phase: req.body.phase || "",
      department: req.body.department || "",
      criteria: req.body.criteria || "",
    };

    // Lấy số ảnh hiện có của tiêu chí này
    const isRemediation = req.body.isRemediation === "true";
    const { phaseId, departmentId, criterionId } = req.body;

    // Create modified files array with proper naming
    const modifiedFiles = await Promise.all(
      req.files.map(async (file, index) => {
        const newFileName = await generateFileName(
          file.originalname,
          index,
          isRemediation,
          phaseInfo,
          phaseId,
          departmentId,
          criterionId
        );
        return {
          ...file,
          originalname: newFileName,
        };
      })
    );

    // Upload files song song
    const { uploadedFiles, errors } = await uploadFilesInParallel(
      modifiedFiles,
      {
        ...phaseInfo,
        isRemediation,
        phaseId,
        departmentId,
        criterionId,
      }
    );

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(
      `\nTOTAL UPLOAD PROCESS COMPLETED IN ${totalTime.toFixed(2)} SECONDS`
    );

    // Prepare response data
    const responseData = {
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
    };

    // Update database
    try {
      const description = uploadedFiles.map((file) => file.name).join("; ");
      const urls = uploadedFiles.map((file) => file.webViewLink).join("; ");

      const query = util.promisify(pool.query).bind(pool);

      // Lấy dữ liệu hiện tại trước khi update
      const [currentData] = await query(
        "SELECT imgURL_before, description_before, imgURL_after, description_after FROM tb_phase_details WHERE id_phase = ? AND id_department = ? AND id_criteria = ?",
        [phaseId, departmentId, criterionId]
      );

      if (isRemediation) {
        // Nối thêm URLs và descriptions mới cho ảnh khắc phục
        const newUrls = currentData?.imgURL_after
          ? `${currentData.imgURL_after}; ${urls}`
          : urls;
        const newDescriptions = currentData?.description_after
          ? `${currentData.description_after}; ${description}`
          : description;

        // Update cả trạng thái và ảnh khắc phục
        await query(
          `UPDATE tb_phase_details
           SET imgURL_after = ?,
               description_after = ?,
               status_phase_details = 'ĐÃ KHẮC PHỤC'
           WHERE id_phase = ? AND id_department = ? AND id_criteria = ?`,
          [newUrls, newDescriptions, phaseId, departmentId, criterionId]
        );
      } else {
        // Nối thêm URLs và descriptions mới cho ảnh vi phạm
        const newUrls = currentData?.imgURL_before
          ? `${currentData.imgURL_before}; ${urls}`
          : urls;
        const newDescriptions = currentData?.description_before
          ? `${currentData.description_before}; ${description}`
          : description;

        await query(
          "UPDATE tb_phase_details SET imgURL_before = ?, description_before = ? WHERE id_phase = ? AND id_department = ? AND id_criteria = ?",
          [newUrls, newDescriptions, phaseId, departmentId, criterionId]
        );
      }

      res.json(responseData);
    } catch (dbError) {
      console.error("Database update error:", dbError);
      res.json({
        ...responseData,
        dbError: "Lỗi cập nhật database",
      });
    }
  } catch (error) {
    const totalTime = (Date.now() - startTime) / 1000;
    console.error(
      `Upload process failed after ${totalTime.toFixed(2)} seconds:`,
      error
    );

    // Chỉ gửi response error nếu chưa gửi response nào trước đó
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Không thể tải ảnh lên",
        details: error.message,
        processingTimeSeconds: totalTime,
      });
    }
  }
});

// Save image URLs to database
app.post("/save-image-urls", async (req, res) => {
  const { id_department, id_criteria, id_phase, imageUrls } = req.body;

  try {
    // Lấy URLs hiện tại
    const [currentUrls] = await new Promise((resolve, reject) => {
      pool.query(
        `SELECT imgURL_before FROM tb_phase_details 
         WHERE id_department = ? AND id_criteria = ? AND id_phase = ?`,
        [id_department, id_criteria, id_phase],
        (err, results) => {
          if (err) reject(err);
          else resolve([results[0], null]);
        }
      );
    });

    // Kết hợp URLs mới với URLs hiện tại, loại bỏ trùng lặp
    const existingUrls = currentUrls?.imgURL_before
      ? currentUrls.imgURL_before.split("; ")
      : [];
    const uniqueUrls = [...new Set([...existingUrls, ...imageUrls])];
    const imgURL_before = uniqueUrls.join("; ");

    // Update với URLs đã được deduplicate
    const query = `
      UPDATE tb_phase_details 
      SET imgURL_before = ?
      WHERE id_department = ? AND id_criteria = ? AND id_phase = ?
    `;

    await new Promise((resolve, reject) => {
      pool.query(
        query,
        [imgURL_before, id_department, id_criteria, id_phase],
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });

    res.status(200).json({
      success: true,
      message: "Image URLs saved successfully",
    });
  } catch (error) {
    console.error("Error saving image URLs:", error);
    res.status(500).json({ error: "Error saving image URLs" });
  }
});

// delete image URLs
app.delete(
  "/delete-image/:phaseId/:departmentId/:criterionId/:type/:index",
  async (req, res) => {
    const { phaseId, departmentId, criterionId, type, index } = req.params;

    try {
      // Get current image URLs
      const [currentData] = await new Promise((resolve, reject) => {
        pool.query(
          "SELECT imgURL_before, description_before, imgURL_after, description_after FROM tb_phase_details WHERE id_phase = ? AND id_department = ? AND id_criteria = ?",
          [phaseId, departmentId, criterionId],
          (err, results) => {
            if (err) reject(err);
            else resolve([results[0], null]);
          }
        );
      });

      if (!currentData) {
        return res.status(404).json({ error: "Data not found" });
      }

      // Split URLs into arrays
      const urlField = type === "before" ? "imgURL_before" : "imgURL_after";
      const descField =
        type === "before" ? "description_before" : "description_after";
      const urls = currentData[urlField]
        ? currentData[urlField].split("; ")
        : [];
      const descriptions = currentData[descField]
        ? currentData[descField].split("; ")
        : [];

      // Remove the specified URL and description
      if (index >= 0 && index < urls.length) {
        urls.splice(index, 1);
        descriptions.splice(index, 1);
      }

      // Join arrays back into strings
      const newUrls = urls.join("; ");
      const newDescriptions = descriptions.join("; ");

      // Update database
      await new Promise((resolve, reject) => {
        pool.query(
          `UPDATE tb_phase_details 
           SET ${urlField} = ?, ${descField} = ?
           WHERE id_phase = ? AND id_department = ? AND id_criteria = ?`,
          [
            newUrls || null,
            newDescriptions || null,
            phaseId,
            departmentId,
            criterionId,
          ],
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting image:", error);
      res.status(500).json({ error: "Error deleting image" });
    }
  }
);
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
      pool.query(phasesQuery, [month, year], (err, results) => {
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
      pool.query(departmentsQuery, (err, results) => {
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
                EXISTS (
                  SELECT 1 
                  FROM tb_phase_details pd2
                  JOIN tb_criteria c ON pd2.id_criteria = c.id_criteria
                  WHERE pd2.id_phase = ?
                    AND pd2.id_department = ?
                    AND pd2.is_fail = 1
                    AND c.red_star = 1
                ) as has_red_star,
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
              pool.query(
                detailsQuery,
                [
                  phase.id_phase,
                  dept.id_department, // Cho EXISTS has_red_star
                  phase.id_phase,
                  dept.id_department, // Cho GROUP_CONCAT knockout_types
                  phase.id_phase,
                  dept.id_department, // Cho EXISTS has_knockout
                  phase.id_phase,
                  dept.id_department, // Cho điều kiện WHERE chính
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
              has_red_star: details.has_red_star === 1,
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
        pool.query(inactiveQuery, [phase.id_phase], (err, results) => {
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

  pool.query(query, [phaseId, departmentId], (err, results) => {
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

//////////upload to gg sheet to power bi//////////
// Khởi tạo và xác thực Google Sheets
async function initGoogleSheet() {
  const retries = 5; // Số lần thử lại tối đa
  const initialDelay = 1000; // Độ trễ ban đầu (1 giây)
  let delay = initialDelay;

  for (let i = 0; i < retries; i++) {
    try {
      // Create new document instance
      const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
      // Parse credentials from environment variable
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

      // Initialize service account auth
      await doc.useServiceAccountAuth({
        client_email: credentials.client_email,
        private_key: credentials.private_key.replace(/\\n/g, "\n"),
      });

      // Load document properties and worksheets
      await doc.loadInfo();
      return doc;
    } catch (error) {
      console.error(`Attempt ${i + 1}/${retries} failed:`, error.message);

      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Tăng độ trễ theo cấp số nhân
      } else {
        throw error; // Ném lỗi nếu đã hết số lần thử
      }
    }
  }
}

// Hàm tính điểm trung bình
function calculateAverageScore(phases) {
  const validScores = Object.values(phases)
    .map((p) => p.scorePercentage)
    .filter((score) => score !== "" && score !== null && score !== undefined);

  return validScores.length > 0
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : "";
}

// Hàm xác định màu sao
function determineStarColor(dept, phases) {
  // Kiểm tra xem department có hoạt động không
  const hasAnyActivity = Object.values(dept.phases).length > 0;
  if (!hasAnyActivity) return ""; // Return rỗng nếu không hoạt động

  // Đếm số đợt xanh (chỉ tính các đợt đang hoạt động VÀ không có red star)
  const greenPhaseCount = Object.entries(dept.phases).filter(
    ([phaseName, phase]) => {
      const phaseIndex = phases.findIndex((p) => p.name_phase === phaseName);
      // Kiểm tra xem đợt có inactive không
      const isInactive =
        phaseIndex !== -1 && dept.phases[phaseName] === undefined;
      // Chỉ đếm các đợt:
      // - Đang hoạt động
      // - KHÔNG có red star
      // - Đạt điểm >= 80%
      return !isInactive && !phase.has_red_star && phase.scorePercentage >= 80;
    }
  ).length;

  // Tính điểm trung bình
  const avgScore = calculateAverageScore(dept.phases);

  // Điều kiện cho sao xanh: có từ 3 đợt xanh trở lên VÀ trung bình >= 80%
  return greenPhaseCount >= 3 && avgScore >= 80 ? "Sao xanh" : "Sao đỏ";
}

// Hàm lấy danh sách tất cả các tháng và năm có trong database
async function getAllAvailableMonthsAndYears() {
  try {
    const query = `
      SELECT DISTINCT 
        MONTH(date_recorded) as month,
        YEAR(date_recorded) as year
      FROM tb_phase
      ORDER BY year DESC, month DESC
    `;

    const [results] = await new Promise((resolve, reject) => {
      pool.query(query, [], (err, results) => {
        if (err) reject(err);
        else resolve([results]);
      });
    });

    return results;
  } catch (error) {
    console.error("Error getting available months and years:", error);
    throw error;
  }
}

// Hàm để lấy tất cả phases từ tất cả tháng năm
async function getAllPhases() {
  try {
    // Modified query to properly handle DISTINCT with ORDER BY
    const query = `
      SELECT 
        p.id_phase, 
        p.name_phase,
        p.date_recorded,
        MONTH(p.date_recorded) as phase_month,
        ROW_NUMBER() OVER (
          PARTITION BY MONTH(p.date_recorded) 
          ORDER BY p.date_recorded ASC
        ) as phase_order
      FROM tb_phase p
      ORDER BY 
        MONTH(p.date_recorded), 
        p.date_recorded ASC
    `;

    const [phases] = await new Promise((resolve, reject) => {
      pool.query(query, [], (err, results) => {
        if (err) {
          console.error("Error in getAllPhases query:", err);
          reject(err);
        } else {
          resolve([results]);
        }
      });
    });

    // Transform the results to remove the date_recorded from the final output
    // while still maintaining the correct ordering
    const transformedPhases = phases.map((phase) => ({
      id_phase: phase.id_phase,
      name_phase: phase.name_phase,
      phase_month: phase.phase_month,
      phase_order: phase.phase_order,
    }));

    return transformedPhases;
  } catch (error) {
    console.error("Error getting all phases:", error);
    throw error;
  }
}

// Hàm format dữ liệu báo cáo cho Google Sheets
async function formatReportDataForSheet(month, year, allPhases) {
  try {
    // 1. Kiểm tra phases
    if (!allPhases || allPhases.length === 0) {
      console.log("No phases provided");
      return {
        headers: [],
        data: [],
      };
    }

    // Lọc phases cho tháng hiện tại ngay từ đầu
    const monthPhases = allPhases
      .filter((phase) => phase.phase_month === month)
      .sort((a, b) => a.phase_order - b.phase_order);

    // 2. Lấy dữ liệu báo cáo
    const reportQuery = `
      SELECT 
        p.id_phase,
        p.name_phase,
        w.name_workshop,
        d.name_department,
        d.id_department,
        (
          SELECT COUNT(*) 
          FROM tb_department_criteria 
          WHERE id_department = d.id_department
        ) as max_points,
        COALESCE(SUM(pd.is_fail), 0) as failed_count,
        COALESCE(tp.total_point, 100) as score_percentage,
        EXISTS (
          SELECT 1 
          FROM tb_phase_details pd2
          JOIN tb_criteria c ON pd2.id_criteria = c.id_criteria
          WHERE pd2.id_phase = p.id_phase
            AND pd2.id_department = d.id_department
            AND pd2.is_fail = 1
            AND c.red_star = 1
        ) as has_red_star,
        (
          SELECT GROUP_CONCAT(DISTINCT cat.name_category SEPARATOR '||')
          FROM tb_phase_details pd2
          JOIN tb_criteria c ON pd2.id_criteria = c.id_criteria
          JOIN tb_category cat ON c.id_category = cat.id_category
          WHERE pd2.id_phase = p.id_phase 
            AND pd2.id_department = d.id_department
            AND pd2.is_fail = 1
            AND c.failing_point_type IN (1, 2, 3)
        ) as knockout_types,
        (
          SELECT COUNT(*) 
          FROM tb_inactive_department 
          WHERE id_phase = p.id_phase 
          AND id_department = d.id_department 
          AND is_inactive = 1
        ) as is_inactive
      FROM 
        tb_phase p
        CROSS JOIN tb_department d
        JOIN tb_workshop w ON d.id_workshop = w.id_workshop
        LEFT JOIN tb_phase_details pd ON p.id_phase = pd.id_phase 
          AND pd.id_department = d.id_department
        LEFT JOIN tb_total_point tp ON tp.id_phase = p.id_phase 
          AND tp.id_department = d.id_department
      WHERE 
        MONTH(p.date_recorded) = ? 
        AND YEAR(p.date_recorded) = ?
      GROUP BY 
        p.id_phase, d.id_department
      ORDER BY 
        w.id_workshop, d.id_department, p.date_recorded ASC
    `;

    const [results] = await new Promise((resolve, reject) => {
      pool.query(reportQuery, [month, year], (err, results) => {
        if (err) reject(err);
        else resolve([results]);
      });
    });

    // 3. Tạo cấu trúc dữ liệu cho từng department
    const departmentData = {};

    results.forEach((row) => {
      const deptKey = `${row.name_workshop}-${row.name_department}`;

      if (!departmentData[deptKey]) {
        departmentData[deptKey] = {
          month: month,
          year: year,
          workshop: row.name_workshop,
          department: row.name_department,
          max_points: row.max_points,
          phases: {},
        };
      }

      // Chỉ thêm dữ liệu khi department hoạt động
      if (!row.is_inactive) {
        departmentData[deptKey].phases[row.name_phase] = {
          failedCount: row.failed_count,
          scorePercentage: row.score_percentage,
          has_red_star: row.has_red_star === 1,
          knockoutTypes: row.knockout_types
            ? row.knockout_types.split("||")
            : [],
        };
      }
    });

    // 4. Format dữ liệu cho Google Sheet
    const sheetData = [];
    let totalDepartments = 0;
    let greenStarCount = 0;
    let redStarCount = 0;

    // Đếm trước số lượng sao xanh/đỏ chỉ cho các department đang hoạt động
    Object.values(departmentData).forEach((dept) => {
      const hasAnyActivity = Object.values(dept.phases).length > 0;
      if (hasAnyActivity) {
        totalDepartments++;
        const starColor = determineStarColor(dept, monthPhases);
        if (starColor === "Sao xanh") greenStarCount++;
        if (starColor === "Sao đỏ") redStarCount++;
      }
    });

    // Tính tỉ lệ
    const greenStarRatio =
      totalDepartments > 0
        ? Number(((1 / totalDepartments) * 100).toFixed(2))
        : 0;
    const redStarRatio =
      totalDepartments > 0
        ? Number(((1 / totalDepartments) * 100).toFixed(2))
        : 0;

    // Format dữ liệu cho từng department
    Object.values(departmentData).forEach((dept) => {
      let maxKnockoutTypes = 0;
      Object.values(dept.phases).forEach((phase) => {
        if (phase.knockoutTypes.length > maxKnockoutTypes) {
          maxKnockoutTypes = phase.knockoutTypes.length;
        }
      });

      const hasAnyActivity = Object.values(dept.phases).length > 0;
      const starColor = determineStarColor(dept, monthPhases);
      const avgScore = calculateAverageScore(dept.phases);

      if (maxKnockoutTypes === 0) {
        const row = [
          // 1. Thông tin cơ bản
          dept.month,
          dept.year,
          dept.workshop,
          dept.department,
          dept.max_points,
          // 2. Thông tin tổng kết
          avgScore !== "" ? `${avgScore}%` : "",
          starColor,
          // Cột "Tỉ lệ sao xanh (%)" - chỉ hiển thị greenStarRatio cho Sao xanh
          hasAnyActivity && starColor === "Sao xanh"
            ? `${greenStarRatio}%`
            : "",
          // Cột "Tỉ lệ sao đỏ (%)" - chỉ hiển thị redStarRatio cho Sao đỏ
          hasAnyActivity && starColor === "Sao đỏ" ? `${redStarRatio}%` : "",
        ];

        // 3. Thông tin từng phase
        monthPhases.forEach((phase) => {
          const phaseData = dept.phases[phase.name_phase] || {
            failedCount: "",
            scorePercentage: "",
            knockoutTypes: [],
          };

          row.push(
            phaseData.failedCount.toString(),
            phaseData.scorePercentage !== ""
              ? `${phaseData.scorePercentage}%`
              : "",
            ""
          );
        });

        sheetData.push(row);
      } else {
        // Xử lý các hàng có knockout types
        for (let i = 0; i < maxKnockoutTypes; i++) {
          const row = [
            // 1. Thông tin cơ bản
            dept.month,
            dept.year,
            dept.workshop,
            dept.department,
            dept.max_points,
            // 2. Thông tin tổng kết - chỉ hiển thị ở hàng đầu
            i === 0 ? (avgScore !== "" ? `${avgScore}%` : "") : "",
            i === 0 ? starColor : "",
            // Cột "Tỉ lệ sao xanh (%)" - chỉ hiển thị khi là Sao xanh và ở hàng đầu tiên
            i === 0 && hasAnyActivity && starColor === "Sao xanh"
              ? `${greenStarRatio}%`
              : "",
            // Cột "Tỉ lệ sao đỏ (%)" - chỉ hiển thị khi là Sao đỏ và ở hàng đầu tiên
            i === 0 && hasAnyActivity && starColor === "Sao đỏ"
              ? `${redStarRatio}%`
              : "",
          ];

          // 3. Thông tin từng phase
          monthPhases.forEach((phase) => {
            const phaseData = dept.phases[phase.name_phase] || {
              failedCount: "",
              scorePercentage: "",
              knockoutTypes: [],
            };

            row.push(
              i === 0 ? phaseData.failedCount.toString() : "",
              i === 0
                ? phaseData.scorePercentage !== ""
                  ? `${phaseData.scorePercentage}%`
                  : ""
                : "",
              phaseData.knockoutTypes[i] || ""
            );
          });

          sheetData.push(row);
        }
      }
    });

    // 5. Tạo headers với cấu trúc mới
    const headers = [
      // 1. Thông tin cơ bản
      "Tháng",
      "Năm",
      "Xưởng/Phòng ban",
      "Bộ phận",
      "Điểm tối đa",
      // 2. Thông tin tổng kết
      "Tổng điểm đạt (%)",
      "Xếp loại",
      "Tỉ lệ sao xanh (%)",
      "Tỉ lệ sao đỏ (%)",
    ];

    // 3. Headers cho từng phase
    monthPhases.forEach((phase, index) => {
      headers.push(
        `Tổng điểm trừ L${index + 1}`,
        `% Điểm đạt L${index + 1}`,
        `Hạng mục Điểm liệt L${index + 1}`
      );
    });

    return {
      headers: headers,
      data: sheetData,
    };
  } catch (error) {
    console.error(`Error formatting data for month ${month}/${year}:`, error);
    return {
      headers: [],
      data: [],
    };
  }
}

// Hàm cập nhật Google Sheet
async function updateGoogleSheet() {
  try {
    // Check DNS resolution before proceeding
    const canResolve = await new Promise((resolve) => {
      dns.resolve("sheets.googleapis.com", (err) => {
        resolve(!err);
      });
    });

    if (!canResolve) {
      console.error("DNS resolution failed, retrying in 30 seconds...");
      setTimeout(updateGoogleSheet, 30000);
      return;
    }

    // Lấy tất cả các phases trước
    const allPhases = await getAllPhases();

    // Lấy tất cả các tháng và năm có sẵn
    const availableDates = await getAllAvailableMonthsAndYears();

    if (!availableDates || availableDates.length === 0) {
      console.log("No dates found in database");
      return;
    }

    // Sắp xếp availableDates theo thứ tự cũ đến mới
    availableDates.sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year;
      }
      return a.month - b.month;
    });

    // Tìm tháng có nhiều phases nhất để làm chuẩn cho headers
    let maxPhaseCount = 0;
    let maxPhaseMonth = null;
    let maxPhaseYear = null;

    availableDates.forEach((date) => {
      const monthPhases = allPhases.filter(
        (phase) => phase.phase_month === date.month
      );
      if (monthPhases.length > maxPhaseCount) {
        maxPhaseCount = monthPhases.length;
        maxPhaseMonth = date.month;
        maxPhaseYear = date.year;
      }
    });

    // Lấy dữ liệu cho tháng có nhiều phases nhất đầu tiên để có headers chuẩn
    const templateData = await formatReportDataForSheet(
      maxPhaseMonth,
      maxPhaseYear,
      allPhases
    );

    let allData = [];
    const headers = templateData.headers;

    // Sau đó lấy dữ liệu cho các tháng còn lại
    for (const date of availableDates) {
      const formattedData = await formatReportDataForSheet(
        date.month,
        date.year,
        allPhases
      );

      if (
        formattedData &&
        formattedData.data &&
        formattedData.data.length > 0
      ) {
        // Chuẩn hóa dữ liệu theo template headers
        const normalizedData = formattedData.data.map((row) => {
          const newRow = new Array(headers.length).fill("");

          // Copy các cột thông tin cơ bản và tổng kết (9 cột đầu)
          for (let i = 0; i < 9; i++) {
            newRow[i] = row[i];
          }

          // Xác định số phases của tháng hiện tại
          const currentMonthPhases = allPhases.filter(
            (phase) => phase.phase_month === date.month
          ).length;

          // Copy dữ liệu phases - 3 cột cho mỗi phase
          for (let i = 0; i < currentMonthPhases; i++) {
            // index bắt đầu từ vị trí sau cột tổng kết
            const baseIndex = 9; // 5 cột thông tin + 4 cột tổng kết
            const sourceIndex = 9 + i * 3; // Bắt đầu từ sau các cột tổng kết

            // Copy 3 cột của mỗi phase (điểm trừ, điểm đạt, điểm liệt)
            newRow[baseIndex + i * 3] = row[sourceIndex];
            newRow[baseIndex + i * 3 + 1] = row[sourceIndex + 1];
            newRow[baseIndex + i * 3 + 2] = row[sourceIndex + 2];
          }

          return newRow;
        });

        allData = [...allData, ...normalizedData];
      }
    }

    if (allData.length === 0) {
      console.log("No data to update");
      return;
    }

    // Kết nối với Google Sheet
    const doc = await initGoogleSheet();
    // Lấy sheet theo tên chính xác
    // const sheet = doc.sheetsByTitle['Dashboard']; // Thay 'Dashboard' bằng tên sheet

    // Hoặc lấy sheet theo ID
    const sheet = doc.sheetsById[0]; // Thay bằng ID gid sheet

    if (!sheet) {
      throw new Error("Sheet not found");
    }

    // Xóa dữ liệu cũ
    await sheet.clear();

    // Cập nhật headers
    await sheet.setHeaderRow(headers);

    // Convert data theo định dạng của headers
    const rows = allData.map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    // Thêm rows vào sheet
    await sheet.addRows(rows);

    const totalRows = rows.length;
    console.log(
      `Sheet updated successfully with ${totalRows} rows at ${moment().format(
        "HH:mm:ss DD/MM/YYYY"
      )}`
    );
  } catch (error) {
    console.error("Error updating Google Sheet:", error);
    // Retry after 1 minute if it's a network error
    if (error.code === "EAI_AGAIN" || error.code === "ENOTFOUND") {
      console.log("Network error occurred, retrying in 1 minute...");
      setTimeout(updateGoogleSheet, 60000);
    }
  }
}

// Thiết lập interval để chạy cập nhật mỗi 30 phút
setInterval(updateGoogleSheet, 30 * 60 * 1000);

// Chạy lần đầu khi khởi động server
updateGoogleSheet();
//////////upload to gg sheet to power bi//////////

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
