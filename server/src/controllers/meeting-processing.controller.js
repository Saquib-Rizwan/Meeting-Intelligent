import { meetingProcessingService } from "../services/storage/meeting-processing.service.js";

export const uploadMeetingFiles = async (req, res, next) => {
  try {
    const meetings = await meetingProcessingService.createMeetingsFromFiles({
      files: req.files || [],
      titlePrefix: req.body.titlePrefix
    });

    res.status(201).json({ data: meetings });
  } catch (error) {
    next(error);
  }
};

export const processMeetingTranscript = async (req, res, next) => {
  try {
    const meeting = await meetingProcessingService.processMeetingInsights(
      req.params.meetingId
    );
    res.json({ data: meeting });
  } catch (error) {
    next(error);
  }
};
