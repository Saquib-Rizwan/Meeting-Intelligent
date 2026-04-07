import { Meeting } from "../../models/meeting.model.js";
import { Insight } from "../../models/insight.model.js";
import { Transcript } from "../../models/transcript.model.js";
import { AppError } from "../../utils/app-error.js";
import { buildSpeakerStats } from "../ai/meeting-ai.service.js";
import { transcriptParserService } from "../parsing/transcript-parser.service.js";

const roundScore = (value) => Number((value || 0).toFixed(2));
const normalizeSpeakerLabel = (speaker) =>
  String(speaker || "").trim() && String(speaker || "").trim() !== "Unknown"
    ? String(speaker || "").trim()
    : "Speaker not tagged";

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
  const { speakerStats, mostActiveSpeaker, leastActiveSpeaker } = buildSpeakerStats(utterances);
  const speakers = Object.entries(speakerStats).map(([speaker, utteranceCount]) => ({
    speaker: normalizeSpeakerLabel(speaker),
    utteranceCount,
    participationPercentage: roundScore((utteranceCount / totalUtterances) * 100)
  }));

  return {
    speakers,
    mostActiveSpeaker: mostActiveSpeaker
      ? {
          speaker: normalizeSpeakerLabel(mostActiveSpeaker.speaker),
          utteranceCount: mostActiveSpeaker.utteranceCount,
          participationPercentage: roundScore((mostActiveSpeaker.utteranceCount / totalUtterances) * 100)
        }
      : null,
    leastActiveSpeaker: leastActiveSpeaker
      ? {
          speaker: normalizeSpeakerLabel(leastActiveSpeaker.speaker),
          utteranceCount: leastActiveSpeaker.utteranceCount,
          participationPercentage: roundScore((leastActiveSpeaker.utteranceCount / totalUtterances) * 100)
        }
      : null
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

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatMinutes = (durationMs) =>
  durationMs ? `${Math.max(Math.round(durationMs / 60000), 1)} min` : "No duration";

const formatTimeSlot = (timeMs) => {
  if (timeMs == null || Number.isNaN(timeMs)) {
    return "--:--";
  }

  const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const formatTimeRange = (startTimeMs, endTimeMs) =>
  `${formatTimeSlot(startTimeMs)} - ${formatTimeSlot(endTimeMs ?? startTimeMs)}`;

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

const buildExportReportHtml = ({ meeting, transcript, insight, speakerAnalytics, metrics }) => {
  const decisions = insight?.decisions || [];
  const actionItems = insight?.actionItems || [];
  const summary = insight?.summary || "No summary available.";
  const transcriptUtterances = transcript?.utterances || [];
  const evidenceMoments = [...decisions, ...actionItems]
    .flatMap((item) => item.citations || [])
    .slice(0, 8);

  const decisionMarkup = decisions.length
    ? decisions
        .map(
          (decision, index) => `
            <div class="item-card">
              <div class="item-index">Decision ${index + 1}</div>
              <div class="item-text">${escapeHtml(decision.text)}</div>
              <div class="item-meta">${escapeHtml(
                (decision.citations || [])
                  .map((citation) => `${citation.utteranceId || "citation"} ${formatTimeRange(citation.startTimeMs, citation.endTimeMs)}`)
                  .join(" | ") || "No citation"
              )}</div>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">No confirmed decisions were extracted for this meeting.</div>`;

  const actionMarkup = actionItems.length
    ? actionItems
        .map(
          (item, index) => `
            <div class="item-card action">
              <div class="item-index">Action ${index + 1}</div>
              <div class="item-text">${escapeHtml(item.task)}</div>
              <div class="item-meta">Owner: ${escapeHtml(item.owner || "Unassigned")} | Deadline: ${escapeHtml(item.deadline || "Not specified")} | Status: ${escapeHtml(item.status || "open")}</div>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">No action items were extracted for this meeting.</div>`;

  const speakerMarkup = (speakerAnalytics?.speakers || []).length
    ? speakerAnalytics.speakers
        .map(
          (speaker) => `
            <div class="metric-chip">
              <strong>${escapeHtml(speaker.speaker)}</strong>
              <span>${speaker.utteranceCount} utterances • ${speaker.participationPercentage}% participation</span>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">Speaker analytics are not available.</div>`;

  const evidenceMarkup = evidenceMoments.length
    ? evidenceMoments
        .map((citation) => {
          const utterance =
            transcriptUtterances.find((item) => item.utteranceId === citation.utteranceId) || citation;

          return `
            <div class="timeline-item">
              <div class="timeline-time">${escapeHtml(formatTimeRange(utterance.startTimeMs, utterance.endTimeMs))}</div>
              <div class="timeline-body">
                <div class="timeline-speaker">${escapeHtml(utterance.speaker || "Meeting segment")}</div>
                <div class="timeline-text">${escapeHtml(utterance.text || utterance.snippet || "")}</div>
              </div>
            </div>
          `;
        })
        .join("")
    : transcriptUtterances
        .slice(0, 8)
        .map(
          (utterance) => `
            <div class="timeline-item">
              <div class="timeline-time">${escapeHtml(formatTimeRange(utterance.startTimeMs, utterance.endTimeMs))}</div>
              <div class="timeline-body">
                <div class="timeline-speaker">${escapeHtml(utterance.speaker || "Meeting segment")}</div>
                <div class="timeline-text">${escapeHtml(utterance.text || "")}</div>
              </div>
            </div>
          `
        )
        .join("");

  const generatedAt = new Date().toLocaleString("en-US", { timeZone: "Asia/Calcutta" });

  return {
    fileName: `${meeting.title || "meeting"}-report.html`.replace(/[^a-z0-9._-]+/gi, "_"),
    content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(meeting.title || "Meeting report")}</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; background: #eef3ef; color: #122018; }
      .page { max-width: 980px; margin: 0 auto; padding: 32px 24px 56px; }
      .hero { background: linear-gradient(135deg, #0f5132 0%, #236244 100%); color: white; padding: 28px; border-radius: 24px; }
      .hero h1 { margin: 0; font-size: 32px; line-height: 1.15; }
      .hero p { margin: 10px 0 0; color: rgba(255,255,255,0.82); }
      .toolbar { margin-top: 18px; display: flex; gap: 12px; flex-wrap: wrap; }
      .toolbar button { border: none; border-radius: 999px; padding: 10px 16px; background: white; color: #0f5132; font-weight: 700; cursor: pointer; }
      .grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px; margin-top: 18px; }
      .stat { background: white; border-radius: 18px; padding: 16px; border: 1px solid #d8e3db; }
      .stat-label { font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #5f6f64; }
      .stat-value { margin-top: 8px; font-size: 24px; font-weight: 800; color: #122018; }
      .section { margin-top: 22px; background: white; border-radius: 24px; padding: 22px; border: 1px solid #d8e3db; }
      .section h2 { margin: 0 0 8px; font-size: 20px; }
      .section p.lead { margin: 0 0 16px; color: #56655b; line-height: 1.6; }
      .item-grid { display: grid; gap: 12px; }
      .item-card { border: 1px solid #dfe7e1; background: #f8faf8; border-radius: 18px; padding: 16px; }
      .item-card.action { background: #fffaf0; border-color: #f0dfb0; }
      .item-index { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #5f6f64; }
      .item-text { margin-top: 8px; font-size: 16px; font-weight: 700; line-height: 1.55; }
      .item-meta { margin-top: 8px; font-size: 12px; color: #65756a; }
      .metric-chip { display: flex; justify-content: space-between; gap: 12px; padding: 14px 16px; border: 1px solid #dfe7e1; border-radius: 16px; background: #f8faf8; margin-bottom: 10px; }
      .timeline-item { display: grid; grid-template-columns: 120px 1fr; gap: 14px; padding: 14px 0; border-top: 1px solid #e4ebe6; }
      .timeline-item:first-child { border-top: none; padding-top: 0; }
      .timeline-time { font-size: 12px; font-weight: 800; color: #0f5132; }
      .timeline-speaker { font-size: 13px; font-weight: 700; color: #122018; }
      .timeline-text { margin-top: 4px; color: #536259; line-height: 1.6; }
      .empty-state { border: 1px dashed #cfd8d1; border-radius: 16px; padding: 16px; color: #66756b; background: #f8faf8; }
      .footer { margin-top: 16px; font-size: 12px; color: #66756b; }
      @media print {
        body { background: white; }
        .page { max-width: none; padding: 0; }
        .toolbar { display: none; }
        .section, .hero, .stat { break-inside: avoid; }
      }
      @media (max-width: 768px) {
        .grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        .timeline-item { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <section class="hero">
        <h1>${escapeHtml(meeting.title || "Meeting report")}</h1>
        <p>Generated ${escapeHtml(generatedAt)} | Source: ${escapeHtml(meeting.sourceFileName || "Uploaded transcript")}</p>
        <div class="toolbar">
          <button onclick="window.print()">Print / Save as PDF</button>
        </div>
      </section>

      <section class="grid">
        <div class="stat"><div class="stat-label">Status</div><div class="stat-value">${escapeHtml(meeting.processingStatus || "processed")}</div></div>
        <div class="stat"><div class="stat-label">Duration</div><div class="stat-value">${escapeHtml(formatMinutes(transcript?.stats?.durationMs))}</div></div>
        <div class="stat"><div class="stat-label">Decisions</div><div class="stat-value">${metrics?.decisionsCount || 0}</div></div>
        <div class="stat"><div class="stat-label">Action Items</div><div class="stat-value">${metrics?.actionItemsCount || 0}</div></div>
      </section>

      <section class="section">
        <h2>Executive Summary</h2>
        <p class="lead">${escapeHtml(summary)}</p>
      </section>

      <section class="section">
        <h2>Confirmed Decisions</h2>
        <div class="item-grid">${decisionMarkup}</div>
      </section>

      <section class="section">
        <h2>Action Items</h2>
        <div class="item-grid">${actionMarkup}</div>
      </section>

      <section class="section">
        <h2>Participants</h2>
        <div>${speakerMarkup}</div>
      </section>

      <section class="section">
        <h2>Supporting Transcript Evidence</h2>
        <div>${evidenceMarkup}</div>
        <div class="footer">This report is generated from extracted meeting insights and transcript citations.</div>
      </section>
    </div>
  </body>
</html>`
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
  },

  async exportMeetingReport(meetingId) {
    const meeting = await Meeting.findById(meetingId).lean();

    if (!meeting) {
      throw new AppError("Meeting not found", 404);
    }

    const [transcript, insight] = await Promise.all([
      Transcript.findOne({ meetingId }).lean(),
      Insight.findOne({ meetingId }).lean()
    ]);

    return buildExportReportHtml({
      meeting,
      transcript,
      insight,
      speakerAnalytics: buildSpeakerAnalytics(transcript),
      metrics: {
        decisionsCount: insight?.decisions?.length || 0,
        actionItemsCount: insight?.actionItems?.length || 0
      }
    });
  },

  async deleteMeeting(meetingId) {
    const meeting = await Meeting.findById(meetingId).lean();

    if (!meeting) {
      throw new AppError("Meeting not found", 404);
    }

    await Promise.all([
      Meeting.deleteOne({ _id: meetingId }),
      Transcript.deleteOne({ meetingId }),
      Insight.deleteOne({ meetingId })
    ]);
  }
};
