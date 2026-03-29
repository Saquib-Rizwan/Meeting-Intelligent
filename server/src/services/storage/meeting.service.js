import { Meeting } from "../../models/meeting.model.js";
import { Insight } from "../../models/insight.model.js";
import { Transcript } from "../../models/transcript.model.js";
import { AppError } from "../../utils/app-error.js";
import { transcriptParserService } from "../parsing/transcript-parser.service.js";

const toMeetingSummary = (meeting, transcript, insight) => ({
  _id: meeting._id,
  title: meeting.title,
  sourceFileName: meeting.sourceFileName,
  transcriptFormat: meeting.transcriptFormat,
  processingStatus: meeting.processingStatus,
  speakers: transcript?.speakers || [],
  transcriptStats: transcript?.stats || null,
  summary: insight?.summary || "",
  decisionsCount: insight?.decisions?.length || 0,
  actionItemsCount: insight?.actionItems?.length || 0,
  createdAt: meeting.createdAt,
  updatedAt: meeting.updatedAt
});

export const meetingService = {
  async listMeetings() {
    const meetings = await Meeting.find().sort({ createdAt: -1 }).lean();
    const meetingIds = meetings.map((meeting) => meeting._id);

    const [transcripts, insights] = await Promise.all([
      Transcript.find({ meetingId: { $in: meetingIds } }).lean(),
      Insight.find({ meetingId: { $in: meetingIds } }).lean()
    ]);

    const transcriptMap = new Map(
      transcripts.map((transcript) => [String(transcript.meetingId), transcript])
    );
    const insightMap = new Map(insights.map((insight) => [String(insight.meetingId), insight]));

    return meetings.map((meeting) =>
      toMeetingSummary(
        meeting,
        transcriptMap.get(String(meeting._id)),
        insightMap.get(String(meeting._id))
      )
    );
  },

  async createMeeting(payload) {
    if (!payload.title || !payload.transcriptFormat || !payload.transcriptText) {
      throw new AppError("title, transcriptFormat, and transcriptText are required", 400);
    }

    const parsedTranscript = payload.utterances?.length
      ? {
          utterances: payload.utterances,
          speakers: payload.speakers || []
        }
      : transcriptParserService.parseTranscript({
          transcriptFormat: payload.transcriptFormat,
          transcriptText: payload.transcriptText
        });

    const meeting = await Meeting.create({
      title: payload.title,
      sourceFileName: payload.sourceFileName,
      transcriptFormat: payload.transcriptFormat,
      processingStatus: "parsed"
    });

    const transcript = await Transcript.create({
      meetingId: meeting._id,
      transcriptFormat: payload.transcriptFormat,
      transcriptText: payload.transcriptText,
      utterances: parsedTranscript.utterances,
      speakers: parsedTranscript.speakers,
      stats: payload.stats || {
        utteranceCount: parsedTranscript.utterances.length,
        speakerCount: parsedTranscript.speakers.length,
        durationMs:
          parsedTranscript.utterances[parsedTranscript.utterances.length - 1]?.endTimeMs || 0
      }
    });

    meeting.transcriptRef = transcript._id;
    await meeting.save();

    return this.getMeetingById(meeting._id);
  },

  async getMeetingById(meetingId) {
    const meeting = await Meeting.findById(meetingId).lean();

    if (!meeting) {
      throw new AppError("Meeting not found", 404);
    }

    const [transcript, insight] = await Promise.all([
      Transcript.findOne({ meetingId }).lean(),
      Insight.findOne({ meetingId }).lean()
    ]);

    return {
      ...meeting,
      transcript,
      insight
    };
  }
};
