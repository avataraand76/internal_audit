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

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "internal_audit_database",
});
// const db = mysql.createConnection({
//   host: "171.244.39.87",
//   user: "vietthanh",
//   password: "Vt@vlh123",
//   database: "kiemsoatnoibo",
// });

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
  } = req.body;

  const updatePhaseDetails = () => {
    const query = `
      INSERT INTO tb_phase_details (id_department, id_criteria, id_phase, id_user, is_fail, date_updated)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      is_fail = VALUES(is_fail),
      date_updated = VALUES(date_updated)
    `;

    db.query(
      query,
      [id_department, id_criteria, id_phase, id_user, is_fail, date_updated],
      (err, result) => {
        if (err) {
          console.error("Error saving phase details:", err);
          res.status(500).json({ error: "Error saving phase details" });
          return;
        }
        updateTotalPoint();
      }
    );
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
app.get("/total-point/:phaseId/:departmentId", (req, res) => {
  const { phaseId, departmentId } = req.params;

  const query = `
    SELECT 
      tp.total_point,
      CASE WHEN EXISTS (
        SELECT 1
        FROM tb_phase_details pd
        JOIN tb_criteria c ON pd.id_criteria = c.id_criteria
        WHERE pd.id_phase = ? AND pd.id_department = ? AND pd.is_fail = 1 AND c.failing_point_type = 1
      ) THEN TRUE ELSE FALSE END as has_red_star,
      CASE WHEN EXISTS (
        SELECT 1
        FROM tb_phase_details pd
        JOIN tb_criteria c ON pd.id_criteria = c.id_criteria
        WHERE pd.id_phase = ? AND pd.id_department = ? AND pd.is_fail = 1 AND c.failing_point_type = -1
      ) THEN TRUE ELSE FALSE END as has_absolute_knockout
    FROM tb_total_point tp
    WHERE tp.id_phase = ? AND tp.id_department = ?
  `;

  db.query(
    query,
    [phaseId, departmentId, phaseId, departmentId, phaseId, departmentId],
    (err, results) => {
      if (err) {
        console.error("Error fetching total point and knockout criteria:", err);
        res
          .status(500)
          .json({ error: "Error fetching total point and knockout criteria" });
        return;
      }

      if (results.length === 0) {
        // Nếu không có kết quả, trả về giá trị mặc định
        res.json({
          total_point: 100,
          has_red_star: false,
          has_absolute_knockout: false,
        });
      } else {
        const result = results[0];
        // Nếu có tiêu chí loại trừ tuyệt đối, đặt tổng điểm về 0
        if (result.has_absolute_knockout) {
          result.total_point = 0;
        }
        res.json(result);
      }
    }
  );
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

///////////upload ảnh////////////
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn kích thước file, ví dụ: 10MB
});

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
let cachedAccessToken = null;
let tokenExpirationTime = 0;

async function getAccessToken() {
  const currentTime = Date.now();
  if (cachedAccessToken && currentTime < tokenExpirationTime) {
    return cachedAccessToken;
  }

  const { token, expiry_date } = await oauth2Client.getAccessToken();
  cachedAccessToken = token;
  tokenExpirationTime = expiry_date;
  return token;
}
oauth2Client.on("tokens", (tokens) => {
  if (tokens.refresh_token) {
    // Lưu refresh_token mới nếu nhận được
    process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
  }
});

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

async function retryWithBackoff(fn, maxRetries = 5, initialDelay = 1000) {
  let delay = initialDelay;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (
        error.response &&
        (error.response.status === 429 || error.response.status >= 500)
      ) {
        if (i === maxRetries - 1) throw error;
        console.log(
          `Retrying after ${delay}ms due to ${error.response.status} error`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
}

async function uploadPhoto(fileBuffer, fileName) {
  return retryWithBackoff(async () => {
    const accessToken = await getAccessToken();

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error("File buffer is empty");
    }

    const response = await axios.post(
      "https://photoslibrary.googleapis.com/v1/uploads",
      fileBuffer,
      {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Goog-Upload-File-Name": fileName,
          "X-Goog-Upload-Protocol": "raw",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  });
}

async function createMediaItem(uploadToken) {
  const accessToken = await getAccessToken();
  const response = await axios.post(
    "https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate",
    {
      newMediaItems: [
        {
          description: "Uploaded from Node.js",
          simpleMediaItem: { uploadToken },
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.data.newMediaItemResults[0].mediaItem;
}

app.post(
  "/upload",
  upload.fields([{ name: "photo1" }, { name: "photo2" }]),
  async (req, res) => {
    const startTime = Date.now();
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res
          .status(400)
          .json({ success: false, error: "Không có file được tải lên" });
      }

      const mediaItems = [];
      for (const [fieldName, files] of Object.entries(req.files)) {
        const file = files[0];
        const { buffer, originalname: fileName } = file;

        const uploadToken = await uploadPhoto(buffer, fileName);
        const mediaItem = await createMediaItem(uploadToken);
        mediaItems.push(mediaItem);
      }

      const endTime = Date.now();
      console.log(`Upload completed in ${endTime - startTime}ms`);
      res.json({
        success: true,
        mediaItems,
        processingTime: endTime - startTime,
      });
    } catch (error) {
      const endTime = Date.now();
      console.error(
        `Upload failed in ${endTime - startTime}ms:`,
        error.response?.data || error.message
      );
      res.status(500).json({
        success: false,
        error: "Không thể tải ảnh lên",
        processingTime: endTime - startTime,
      });
    }
  }
);

///////////upload ảnh////////////
const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
