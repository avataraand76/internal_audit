// backend/token.js
const express = require("express");
const { google } = require("googleapis");
require("dotenv").config();
const app = express();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Thay đổi scopes để sử dụng Google Drive API
const scopes = [
  "https://www.googleapis.com/auth/drive.file", // Để tạo và quản lý files
  "https://www.googleapis.com/auth/drive.photos.readonly", // Để đọc ảnh
];

app.get("/auth", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    // Thêm prompt: 'consent' để luôn hiển thị màn hình xác nhận
    // Điều này đảm bảo bạn luôn nhận được refresh token
    prompt: "consent",
  });
  res.redirect(authUrl);
});

app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  console.log("Authorization code:", code);

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Log to console
    console.log("\nAccess Token:", tokens.access_token);
    console.log("\nRefresh Token:", tokens.refresh_token);
    console.log(
      "\nExpiry date:",
      new Date(tokens.expiry_date).toLocaleString()
    );

    // Send HTML response with styled token display
    res.send(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 20px auto;
              padding: 0 20px;
            }
            h1 {
              color: #2c3e50;
              border-bottom: 2px solid #3498db;
              padding-bottom: 10px;
            }
            .token-container {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin: 10px 0;
            }
            .token-label {
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 5px;
            }
            .token-value {
              word-break: break-all;
              background-color: #ffffff;
              padding: 10px;
              border: 1px solid #dee2e6;
              border-radius: 4px;
            }
            .important-note {
              color: #e74c3c;
              font-weight: bold;
              margin: 20px 0;
              padding: 10px;
              border-left: 4px solid #e74c3c;
            }
          </style>
        </head>
        <body>
          <h1>Authentication Successful! 🎉</h1>
          <p>Please check your console for the tokens.</p>
          <p>Important: Copy the refresh token and save it in your .env file as GOOGLE_REFRESH_TOKEN</p>
          <p>The refresh token is needed for long-term access to Google Drive.</p>
          
          <div class="token-container">
            <div class="token-label">Access Token:</div>
            <div class="token-value">${tokens.access_token}</div>
          </div>

          <div class="token-container">
            <div class="token-label">Refresh Token:</div>
            <div class="token-value">${tokens.refresh_token}</div>
          </div>

          <div class="token-container">
            <div class="token-label">Expiry Date:</div>
            <div class="token-value">${new Date(
              tokens.expiry_date
            ).toLocaleString()}</div>
          </div>

          <div class="important-note">
            Important: Copy the refresh token above and save it in your .env file as GOOGLE_REFRESH_TOKEN.<br>
            This refresh token is needed for long-term access to Google Drive.
          </div>

          <p><strong>Note:</strong> The tokens are also logged to your console for backup.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error getting tokens:", error);
    res.status(500).send(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 20px auto;
              padding: 0 20px;
            }
            h1 {
              color: #e74c3c;
            }
            .error-message {
              background-color: #fdf0f0;
              padding: 15px;
              border-radius: 5px;
              border-left: 4px solid #e74c3c;
            }
          </style>
        </head>
        <body>
          <h1>Authentication Failed ❌</h1>
          <div class="error-message">
            <p><strong>Error:</strong> ${error.message}</p>
            <p>Please try again or check your client credentials.</p>
          </div>
        </body>
      </html>
    `);
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`
    Authorization server is running!
    
    1. Visit http://localhost:${PORT}/auth to start the authorization process
    2. After authorization, check the console for tokens
    3. Copy the refresh token to your .env file
    4. You only need to do this once, unless you revoke access
  `);
});
