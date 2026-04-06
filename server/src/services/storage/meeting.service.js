import { Meeting } from "../../models/meeting.model.js";
import { Insight } from "../../models/insight.model.js";
import { Transcript } from "../../models/transcript.model.js";
import { AppError } from "../../utils/app-error.js";
import { transcriptParserService } from "../parsing/transcript-parser.service.js";

const roundScore = (value) => Number((value || 0).toFixed(2));

const getAverageSentiment = (insight) => {
  const speakerSentiments = insight?.speakerSentiments || [];

  if (!speakerSentiments.length) {
    return 0;
  }

  const totals = speakerSentiments.reduce(
    (accumulator, item) => {
      const weight = item.utteranceCount || 0;

      return {
        weightedScore: accumulator.weightedScore + (item.averageSentiment || 0) * weight,
        totalUtterances: accumulator.totalUtterances + weight
      };
    },
    { weightedScore: 0, totalUtterances: 0 }
  );

  if (!totals.totalUtterances) {
    const rawAverage =
      speakerSentiments.reduce((sum, item) => sum + (item.averageSentiment || 0), 0) /
      speakerSentiments.length;

    return roundScore(rawAverage);
  }

  return roundScore(totals.weightedScore / totals.totalUtterances);
};

const getSentimentTone = (score) => {
  if (score > 0.2) {
    return "positive";
  }

  if (score < -0.2) {
    return "negative";
  }

  return "neutral";
};

const buildChunkSentiments = (insight) => {
  const chunks = insight?.transcriptChunks || [];
  const timeline = insight?.sentimentTimeline || [];

  return chunks.map((chunk) => {
    const matchingPoints = timeline.filter((point) => {
      if (chunk.startTimeMs == null && chunk.endTimeMs == null) {
        return false;
      }

      const timestamp = point.timestampMs;

      if (timestamp == null) {
        return false;
      }

      const startsAfter = chunk.startTimeMs == null || timestamp >= chunk.startTimeMs;
      const endsBefore = chunk.endTimeMs == null || timestamp <= chunk.endTimeMs;

      return startsAfter && endsBefore;
    });

    const averageScore = matchingPoints.length
      ? matchingPoints.reduce((sum, point) => sum + (point.sentimentScore || 0), 0) /
        matchingPoints.length
      : 0;

    return {
      chunkId: chunk.chunkId,
      text: chunk.text,
      speaker: chunk.speaker,
      utteranceIds: chunk.utteranceIds || [],
      startTimeMs: chunk.startTimeMs,
      endTimeMs: chunk.endTimeMs,
      sentimentScore: roundScore(averageScore),
      tone: getSentimentTone(averageScore)
    };
  });
};

const buildHighlights = (insight) => {
  const highlights = [];

  if (insight?.summary) {
    const summarySentences = insight.summary
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .slice(0, 3);

    highlights.push(...summarySentences);
  }

  if (!highlights.length) {
    highlights.push(
      ...(insight?.decisions || []).slice(0, 2).map((decision) => decision.text),
      ...(insight?.actionItems || []).slice(0, 2).map((item) => item.task)
    );
  }

  return highlights.slice(0, 4);
};

const buildSpeakerAnalytics = (transcript) => {
  const utterances = transcript?.utterances || [];
  const totalUtterances = utterances.length || 1;
  const counts = new Map();

  utterances.forEach((utterance) => {
    const speaker = utterance.speaker || "Unknown";
    counts.set(speaker, (counts.get(speaker) || 0) + 1);
  });

  const speakers = [...counts.entries()].map(([speaker, utteranceCount]) => ({
    speaker,
    utteranceCount,
    participationPercentage: roundScore((utteranceCount / totalUtterances) * 100)
  }));

  speakers.sort((left, right) => right.utteranceCount - left.utteranceCount);

  return {
    speakers,
    mostActiveSpeaker: speakers[0] || null,
    leastActiveSpeaker: speakers[speakers.length - 1] || null
  };
};

const toMeetingSummary = (meeting, transcript, insight) => ({
  _id: meeting._id,
  title: meeting.title,
  sourceFileName: meeting.sourceFileName,
  transcriptFormat: meeting.transcriptFormat,
  processingStatus: meeting.processingStatus,
  transcriptCount: transcript ? 1 : 0,
  speakers: transcript?.speakers || [],
  transcriptStats: transcript?.stats || null,
  summary: insight?.summary || "",
  decisionsCount: insight?.decisions?.length || 0,
  actionItemsCount: insight?.actionItems?.length || 0,
  averageSentiment: getAverageSentiment(insight),
  createdAt: meeting.createdAt,
  updatedAt: meeting.updatedAt
});

const buildExportCsv = (meeting, insight) => {
  const rows = [
    ["section", "title", "owner", "details", "deadline", "status", "citations"]
  ];

  (insight?.decisions || []).forEach((decision, index) => {
    rows.push([
      "decision",
      `Decision ${index + 1}`,
      "",
      decision.text || "",
      "",
      "",
      (decision.citations || []).map((citation) => citation.utteranceId).filter(Boolean).join(" | ")
    ]);
  });

  (insight?.actionItems || []).forEach((item, index) => {
    rows.push([
      "action_item",
      `Action Item ${index + 1}`,
      item.owner || "",
      item.task || "",
      item.deadline || "",
      item.status || "",
      (item.citations || []).map((citation) => citation.utteranceId).filter(Boolean).join(" | ")
    ]);
  });

  const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csvContent = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");

  return {
    fileName: `${meeting.title || "meeting"}-export.csv`.replace(/[^a-z0-9._-]+/gi, "_"),
    content: csvContent
  };
};

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

    if (!insight?.decisions?.length || !insight?.actionItems?.length) {
      console.warn(
        `[meeting-processing] meeting=${meetingId} detail response has sparse insights decisions=${insight?.decisions?.length || 0} actionItems=${insight?.actionItems?.length || 0}`
      );
    }

    const speakerSentiments = insight?.speakerSentiments || [];
    const sentimentTimeline = insight?.sentimentTimeline || [];
    const chunkSentiments = buildChunkSentiments(insight);
    const highlights = buildHighlights(insight);
    const decisions = insight?.decisions || [];
    const actionItems = insight?.actionItems || [];

    return {
      ...meeting,
      transcript,
      insight,
      decisions,
      actionItems,
      metrics: {
        transcriptCount: transcript ? 1 : 0,
        decisionsCount: decisions.length,
        actionItemsCount: actionItems.length,
        averageSentiment: getAverageSentiment(insight)
      },
      sentiment: {
        speakerSentiments,
        timeline: sentimentTimeline,
        chunkSentiments
      },
      speakerAnalytics: buildSpeakerAnalytics(transcript),
      highlights
    };
  },

  async exportMeeting(meetingId) {
    const meeting = await Meeting.findById(meetingId).lean();

    if (!meeting) {
      throw new AppError("Meeting not found", 404);
    }

    const insight = await Insight.findOne({ meetingId }).lean();

    return buildExportCsv(meeting, insight);
  }
};
