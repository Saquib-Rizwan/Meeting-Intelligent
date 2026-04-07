import { Router } from "express";

import {
  createMeeting,
  deleteMeeting,
  exportMeeting,
  exportMeetingReport,
  getMeetingById,
  listMeetings
} from "../controllers/meeting.controller.js";
import {
  processMeetingTranscript,
  uploadMeetingFiles
} from "../controllers/meeting-processing.controller.js";
import { uploadTranscriptFiles } from "../middlewares/uploadFiles.js";

const router = Router();

router.get("/", listMeetings);
router.post("/", createMeeting);
router.post("/upload", uploadTranscriptFiles, uploadMeetingFiles);
router.get("/:meetingId/export", exportMeeting);
router.get("/:meetingId/export/report", exportMeetingReport);
router.get("/:meetingId", getMeetingById);
router.post("/:meetingId/process", processMeetingTranscript);
router.delete("/:meetingId", deleteMeeting);

export default router;
