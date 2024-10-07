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

// Get all phases
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

// Create a new phase
app.post("/phases", (req, res) => {
  const { id_phase, name_phase } = req.body;
  const date_recorded = moment().format("YYYY-MM-DD HH:mm:ss");

  const query =
    "INSERT INTO tb_phase (id_phase, name_phase, date_recorded) VALUES (?, ?, ?)";
  db.query(query, [id_phase, name_phase, date_recorded], (err, result) => {
    if (err) {
      console.error("Error creating phase:", err);
      res.status(500).json({ error: "Error creating phase" });
      return;
    }

    // Return the created phase
    const createdPhase = {
      id_phase,
      name_phase,
      date_recorded,
    };
    res.status(201).json(createdPhase);
  });
});

const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
