import { Meeting } from "../../models/meeting.model.js";
import { Insight } from "../../models/insight.model.js";
import { Transcript } from "../../models/transcript.model.js";
import { insightExtractionService } from "../ai/insight-extraction.service.js";
import { transcriptParserService } from "../parsing/transcript-parser.service.js";
import { AppError } from "../../utils/app-error.js";

const getFormatFromFileName = (fileName) => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension !== "txt" && extension !== "vtt") {
    throw new AppError(`Unsupported transcript format: ${fileName}`, 400);
  }

  return extension;
};

const getTitleFromFileName = (fileName) => fileName.replace(/\.[^.]+$/, "");

const buildTranscriptStats = (utterances, speakers) => ({
  utteranceCount: utterances.length,
  speakerCount: speakers.length,
  durationMs:
    utterances.length && utterances[utterances.length - 1].endTimeMs
      ? utterances[utterances.length - 1].endTimeMs
      : 0
});

export const meetingProcessingService = {
  async createMeetingsFromFiles({ files, titlePrefix }) {
    if (!files.length) {
      throw new AppError(
        "No transcript files were uploaded. Use the 'transcripts' field.",
        400
      );
    }

    const createdMeetings = [];

    for (const [index, file] of files.entries()) {
      const transcriptFormat = getFormatFromFileName(file.originalname);
      const transcriptText = file.buffer.toString("utf-8");
      const parsedTranscript = transcriptParserService.parseTranscript({
        transcriptFormat,
        transcriptText
      });

      const meeting = await Meeting.create({
        title: titlePrefix
          ? `${titlePrefix} ${index + 1}`
          : getTitleFromFileName(file.originalname),
        sourceFileName: file.originalname,
        transcriptFormat,
        processingStatus: "parsed"
      });

      const transcript = await Transcript.create({
        meetingId: meeting._id,
        transcriptFormat,
        transcriptText,
        utterances: parsedTranscript.utterances,
        speakers: parsedTranscript.speakers,
        stats: buildTranscriptStats(parsedTranscript.utterances, parsedTranscript.speakers)
      });

      meeting.transcriptRef = transcript._id;
      await meeting.save();

      createdMeetings.push({
        ...meeting.toObject(),
        transcript
      });
    }

    return createdMeetings;
  },

  async processMeetingInsights(meetingId) {
    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      throw new AppError("Meeting not found", 404);
    }

    const transcript = await Transcript.findOne({ meetingId: meeting._id }).lean();

    if (!transcript) {
      throw new AppError("Transcript not found for meeting", 404);
    }

    const insights = await insightExtractionService.extractInsights({
      meetingId: meeting._id,
      title: meeting.title,
      transcriptText: transcript.transcriptText,
      utterances: transcript.utterances
    });

    const insight = await Insight.findOneAndUpdate(
      { meetingId: meeting._id },
      {
        meetingId: meeting._id,
        summary: insights.summary,
        decisions: insights.decisions,
        actionItems: insights.actionItems,
        sentimentTimeline: insights.sentimentTimeline,
        speakerSentiments: insights.speakerSentiments,
        transcriptChunks: insights.transcriptChunks,
        metadata: insights.metadata,
        pipelineVersion: "v1-hf"
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    meeting.insightRef = insight._id;
    meeting.processingStatus = "processed";
    await meeting.save();

    return {
      ...meeting.toObject(),
      transcript,
      insight: insight.toObject()
    };
  },

  async processMeeting(meetingId) {
    return this.processMeetingInsights(meetingId);
  }
};
