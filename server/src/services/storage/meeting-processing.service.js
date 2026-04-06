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

const logProcessingStage = (meetingId, stage, details = {}) => {
  console.log(`[meeting-processing] meeting=${meetingId} stage=${stage}`, details);
};

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
      logProcessingStage(file.originalname, "upload-received", {
        sizeBytes: file.size || file.buffer?.length || 0
      });
      const transcriptFormat = getFormatFromFileName(file.originalname);
      const transcriptText = file.buffer.toString("utf-8");

      if (!transcriptText.trim()) {
        throw new AppError(`Transcript file ${file.originalname} is empty`, 400);
      }

      const parsedTranscript = transcriptParserService.parseTranscript({
        transcriptFormat,
        transcriptText
      });

      if (!parsedTranscript.utterances.length) {
        throw new AppError(
          `Transcript file ${file.originalname} did not contain any valid utterances`,
          400
        );
      }

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
      logProcessingStage(meeting._id, "meeting-created", {
        title: meeting.title,
        transcriptFormat,
        utteranceCount: parsedTranscript.utterances.length
      });

      const processedMeeting = await this.processMeetingInsights(meeting._id);
      createdMeetings.push(processedMeeting);
    }

    return createdMeetings;
  },

  async processMeetingInsights(meetingId) {
    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      throw new AppError("Meeting not found", 404);
    }

    try {
      const transcript = await Transcript.findOne({ meetingId: meeting._id }).lean();

      if (!transcript) {
        throw new AppError("Transcript not found for meeting", 404);
      }

      if (!transcript.transcriptText?.trim() || !transcript.utterances?.length) {
        throw new AppError("Transcript exists but has no parsable content", 400, {
          meetingId: String(meeting._id)
        });
      }

      logProcessingStage(meeting._id, "transcript-loaded", {
        transcriptLength: transcript.transcriptText?.length || 0,
        utteranceCount: transcript.utterances?.length || 0
      });

      const insights = await insightExtractionService.extractInsights({
        meetingId: meeting._id,
        title: meeting.title,
        transcriptText: transcript.transcriptText,
        utterances: transcript.utterances
      });

      if (!insights.summary?.trim()) {
        throw new AppError("Insight extraction finished without a summary", 500, {
          meetingId: String(meeting._id)
        });
      }

      if (!insights.decisions?.length || !insights.actionItems?.length) {
        throw new AppError("Insight extraction returned incomplete results", 500, {
          meetingId: String(meeting._id),
          decisions: insights.decisions?.length || 0,
          actionItems: insights.actionItems?.length || 0
        });
      }

      logProcessingStage(meeting._id, "insights-generated", {
        chunkCount: insights.metadata?.chunkCount || 0,
        decisions: insights.decisions?.length || 0,
        actionItems: insights.actionItems?.length || 0
      });

      const insight = await Insight.findOneAndUpdate(
        { meetingId: meeting._id },
        {
          $set: {
            meetingId: meeting._id,
            summary: insights.summary,
            decisions: insights.decisions,
            actionItems: insights.actionItems,
            sentimentTimeline: insights.sentimentTimeline,
            speakerSentiments: insights.speakerSentiments,
            transcriptChunks: insights.transcriptChunks,
            metadata: insights.metadata,
            pipelineVersion: "v1-hf"
          }
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        }
      );

      logProcessingStage(meeting._id, "insight-persisted", {
        decisions: insight.decisions?.length || 0,
        actionItems: insight.actionItems?.length || 0
      });

      meeting.insightRef = insight._id;
      meeting.processingStatus = "processed";
      await meeting.save();
      logProcessingStage(meeting._id, "meeting-processed", {
        status: meeting.processingStatus
      });

      return {
        ...meeting.toObject(),
        transcript,
        insight: insight.toObject()
      };
    } catch (error) {
      meeting.processingStatus = "failed";
      await meeting.save();
      logProcessingStage(meeting._id, "processing-failed", {
        message: error.message
      });
      throw error;
    }
  },

  async processMeeting(meetingId) {
    return this.processMeetingInsights(meetingId);
  }
};
