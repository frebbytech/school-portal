const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { randomUUID } = require("crypto");
const { AppError } = require("../common/errors");
const { logger } = require("../common/logger");

/**
 * Shared image-upload middleware (replaces four copy-pasted multer setups).
 *
 *   const upload = createImageUpload("users");     // saves under images/users/
 *   router.post("/", upload.single("profile"), handler);
 *   router.put("/bulk", upload.array("profile", 10), handler);
 *
 * Protections:
 *  - size limit (UPLOAD_MAX_MB, default 5) and file-count limit
 *  - only JPEG / PNG / WebP, checked by declared type AND by the file's real
 *    content (magic bytes), because the client-supplied type and name are untrusted
 *  - server-generated file name; the extension comes from the detected type,
 *    never from the uploaded name
 *  - the destination folder is created if it does not exist
 *  - rejected files are deleted from disk
 */

const IMAGE_ROOT = path.join(process.cwd(), "images");
const MAX_BYTES = (Number(process.env.UPLOAD_MAX_MB) || 5) * 1024 * 1024;

// declared MIME type -> extension we store
const ALLOWED_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// Detect the real type from the first bytes of the file
function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function readHead(filePath) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buffer, 0, 12, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    fs.closeSync(fd);
  }
}

const removeQuietly = (filePath) => {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") logger.warn("could not delete rejected upload", { err: error });
  }
};

// Runs after multer has written the files: confirm their content really is an image
const verifyImageContent = (req, res, next) => {
  const files = req.file ? [req.file] : Array.isArray(req.files) ? req.files : [];

  for (const file of files) {
    let detected = null;
    try {
      detected = detectImageType(readHead(file.path));
    } catch (error) {
      logger.warn("could not read uploaded file", { err: error });
    }

    if (!detected || detected !== file.mimetype) {
      files.forEach((f) => removeQuietly(f.path));
      return next(new AppError(400, "Invalid image file. Use a JPEG, PNG or WebP image.", "INVALID_FILE"));
    }
  }

  next();
};

function createImageUpload(category) {
  const destination = path.join(IMAGE_ROOT, category);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdir(destination, { recursive: true }, (error) => cb(error, destination));
    },
    filename: (req, file, cb) => {
      cb(null, `${randomUUID()}${ALLOWED_TYPES[file.mimetype] || ""}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: MAX_BYTES, files: 20 },
    fileFilter: (req, file, cb) => {
      if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
      cb(new AppError(400, "Only JPEG, PNG or WebP images are allowed.", "INVALID_FILE"));
    },
  });

  return {
    single: (field) => [upload.single(field), verifyImageContent],
    array: (field, max) => [upload.array(field, max), verifyImageContent],
  };
}

module.exports = { createImageUpload, detectImageType, ALLOWED_TYPES };
