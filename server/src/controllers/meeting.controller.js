import { meetingService } from "../services/storage/meeting.service.js";
import { transcriptParserService } from "../services/parsing/transcript-parser.service.js";

export const listMeetings = async (_req, res, next) => {
  try {
    const meetings = await meetingService.listMeetings();
    res.json({ data: meetings });
  } catch (error) {
    next(error);
  }
};

export const createMeeting = async (req, res, next) => {
  try {
    const parsedTranscript = transcriptParserService.parseTranscript({
      transcriptFormat: req.body.transcriptFormat,
      transcriptText: req.body.transcriptText
    });

    const meeting = await meetingService.createMeeting({
      ...req.body,
      utterances: parsedTranscript.utterances,
      speakers: parsedTranscript.speakers,
      stats: {
        utteranceCount: parsedTranscript.utterances.length,
        speakerCount: parsedTranscript.speakers.length,
        durationMs:
          parsedTranscript.utterances[parsedTranscript.utterances.length - 1]?.endTimeMs || 0
      }
    });

    res.status(201).json({ data: meeting });
  } catch (error) {
    next(error);
  }
};

export const getMeetingById = async (req, res, next) => {
  try {
    const meeting = await meetingService.getMeetingById(req.params.meetingId);
    res.json({ data: meeting });
  } catch (error) {
    next(error);
  }
};

export const exportMeeting = async (req, res, next) => {
  try {
    const exportFile = await meetingService.exportMeeting(req.params.meetingId);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${exportFile.fileName}"`);
    res.send(exportFile.content);
  } catch (error) {
    next(error);
  }
};

export const exportMeetingReport = async (req, res, next) => {
  try {
    const exportFile = await meetingService.exportMeetingReport(req.params.meetingId);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="${exportFile.fileName}"`);
    res.send(exportFile.content);
  } catch (error) {
    next(error);
  }
};

export const deleteMeeting = async (req, res, next) => {
  try {
    await meetingService.deleteMeeting(req.params.meetingId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
