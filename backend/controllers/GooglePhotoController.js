// backend/controllers/GooglePhotoController.js
const { google } = require("googleapis");
const axios = require("axios");

let cachedAccessToken = null;
let tokenExpirationTime = 0;

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

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
  // return retryWithBackoff(async () => {
  //   const accessToken = await getAccessToken();
  //   console.log("Token", accessToken);
  //   console.log("fileBuffer", fileBuffer);

  //   if (!fileBuffer || fileBuffer.length === 0) {
  //     throw new Error("File buffer is empty");
  //   }

  return retryWithBackoff(async () => {
    const accessToken = await getAccessToken();
    if (!fileBuffer || !(fileBuffer instanceof Buffer)) {
      throw new Error("Invalid file buffer");
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

module.exports = {
  uploadPhoto,
  createMediaItem,
};
