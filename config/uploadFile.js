const { ref, uploadBytes, getDownloadURL, uploadString } = require("firebase/storage");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const { storage } = require("../firebase");
const { AppError } = require("../common/errors");
const { logger } = require("../common/logger");

// Folders under ./images that uploads may use
const ALLOWED_LOCATIONS = new Set(["users", "students", "badges", "school"]);

const normalizeLocation = (location) => String(location || "").replace(/^\/+|\/+$/g, "");

/**
 * Upload a file that multer saved under ./images/<location>/ to Firebase Storage and
 * return its download URL. The local copy is always removed afterwards.
 *
 * Throws an AppError when the file cannot be stored; it no longer returns
 * `undefined`, which used to end up saved as the user's profile picture.
 */
async function uploadFile(filename, location) {
  const folder = normalizeLocation(location);

  if (!ALLOWED_LOCATIONS.has(folder)) {
    throw new AppError(400, "Invalid upload location", "INVALID_UPLOAD");
  }

  // Only a bare file name is accepted (no directories)
  const safeName = path.basename(String(filename || ""));
  if (!safeName || safeName !== filename) {
    throw new AppError(400, "Invalid file name", "INVALID_UPLOAD");
  }

  const filePath = path.join(process.cwd(), "images", folder, safeName);

  try {
    const storageRef = ref(storage, `${folder}/${safeName}`);
    await uploadBytes(storageRef, fs.readFileSync(filePath));
    return await getDownloadURL(storageRef);
  } catch (error) {
    logger.error("file upload to cloud storage failed", { err: error, folder });
    throw new AppError(502, "Could not store the uploaded image. Please try again.", "STORAGE_ERROR");
  } finally {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") logger.warn("could not remove temporary upload", { err: error });
    }
  }
}

// Upload base64 image to Firebase Storage
async function uploadBase64Image(base64Image, fileName, uploadPath = "frebbys") {
  if (!base64Image || !fileName) {
    throw new Error("Missing image data or file name");
  }

  const storageRef = ref(storage, `${uploadPath}/${fileName}`);

  // Upload the Base64 image
  await uploadString(storageRef, base64Image, "base64");

  const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${process.env.FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(uploadPath + '/' + fileName)}?alt=media`;

  return imageUrl;
}

async function getImageAsBase64(imageUrl) {
  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const base64Image = Buffer.from(response.data, "binary").toString("base64");

    // Extract content type from headers for complete base64 format
    const contentType = response.headers["content-type"];
    return `data:${contentType};base64,${base64Image}`;
  } catch (error) {
    throw new Error("Failed to fetch and convert image: " + error.message);
  }
}

/**
 * Upload several images. The index number is taken from each original file name
 * (e.g. "ST001.jpg"). A file that fails is skipped and logged so the others still
 * succeed; only successful uploads are returned.
 */
async function uploadMultipleImages(files, uploadPath = "students/") {
  const uploadedUrls = [];

  for (const file of files) {
    try {
      const imageUrl = await uploadFile(file.filename, uploadPath);

      uploadedUrls.push({
        indexnumber: file.originalname?.split(".")[0],
        url: imageUrl,
      });
    } catch (error) {
      logger.warn("skipping image that could not be uploaded", {
        indexnumber: file.originalname?.split(".")[0],
        reason: error.message,
      });
    }
  }

  return uploadedUrls;
}

module.exports = {
  uploadFile,
  uploadBase64Image,
  getImageAsBase64,
  uploadMultipleImages,
};
