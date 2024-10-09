// backend/server.js
const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const moment = require("moment-timezone");

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
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const query =
    "SELECT * FROM tb_user WHERE name_user = ? AND password_user = ?";
  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error("Error during login:", err);
      res.status(500).json({ error: "Error during login" });
      return;
    }

    if (results.length > 0) {
      // User found, login successful
      res.json({ success: true, user: results[0] });
    } else {
      // No user found with given credentials
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
      cr.short_desc,
      cr.long_desc,
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
                  name: row.short_desc, // Sử dụng short_desc làm tên hiển thị
                  description: row.long_desc, // Sử dụng long_desc làm mô tả
                  failingPointType: row.failing_point_type,
                },
              ]
            : [],
        });
      } else if (row.id_criteria) {
        category.criteria.push({
          id: row.id_criteria,
          codename: row.codename,
          name: row.short_desc,
          description: row.long_desc,
          failingPointType: row.failing_point_type,
        });
      }

      return acc;
    }, []);

    res.json(categories);
  });
});

const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
