// backend/server.js
const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const moment = require("moment-timezone");
const bcrypt = require("bcryptjs");

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "internal_audit_database",
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

// Get all phases in CreatePhasePage.js
app.get("/phases", (req, res) => {
  const query = "SELECT * FROM tb_phase ORDER BY date_recorded DESC";
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

// Create a new phase in CreatePhasePage.js
app.post("/phases", (req, res) => {
  const { name_phase } = req.body;
  const date_recorded = moment().format("YYYY-MM-DD HH:mm:ss");

  const query =
    "INSERT INTO tb_phase (name_phase, date_recorded) VALUES (?, ?)";
  db.query(query, [name_phase, date_recorded], (err, result) => {
    if (err) {
      console.error("Error creating phase:", err);
      res.status(500).json({ error: "Error creating phase" });
      return;
    }

    // Return the created phase with the auto-generated ID
    const createdPhase = {
      id_phase: result.insertId,
      name_phase,
      date_recorded,
    };
    res.status(201).json(createdPhase);
  });
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

const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
