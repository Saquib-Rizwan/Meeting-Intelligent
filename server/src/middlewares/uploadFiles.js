import multer from "multer";

import { AppError } from "../utils/app-error.js";

const supportedMimeTypes = new Set([
  "text/plain",
  "text/vtt",
  "application/octet-stream"
]);

const storage = multer.memoryStorage();

const fileFilter = (_req, file, callback) => {
  const isSupportedExtension = /\.(txt|vtt)$/i.test(file.originalname);
  const isSupportedMimeType =
    !file.mimetype || supportedMimeTypes.has(file.mimetype);

  if (!isSupportedExtension || !isSupportedMimeType) {
    callback(
      new AppError(
        `Unsupported file type for ${file.originalname}. Only .txt and .vtt files are allowed.`,
        400
      )
    );
    return;
  }

  callback(null, true);
};

export const uploadTranscriptFiles = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10
  }
}).array("transcripts", 10);
