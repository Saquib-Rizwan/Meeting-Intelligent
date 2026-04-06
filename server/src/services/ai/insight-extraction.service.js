import { meetingAiService } from "./meeting-ai.service.js";
import { huggingFaceProvider } from "./providers/huggingface.provider.js";
import { AppError } from "../../utils/app-error.js";

const MAX_CHUNK_CHARACTERS = 12000;
const MIN_REQUIRED_DECISIONS = 1;
const MIN_REQUIRED_ACTIONS = 1;

const logExtractionStage = (meetingId, stage, details = {}) => {
  console.log(`[meeting-processing] meeting=${meetingId} stage=${stage}`, details);
};

const chunkUtterances = (utterances) => {
  const chunks = [];
  let currentChunk = [];
  let currentSize = 0;

  utterances.forEach((utterance) => {
    const line = `[${utterance.utteranceId}]${utterance.startTimeMs != null ? ` (${utterance.startTimeMs}ms-${utterance.endTimeMs ?? utterance.startTimeMs}ms)` : ""} ${utterance.speaker || "Unknown"}: ${utterance.text}`;

    if (currentChunk.length && currentSize + line.length > MAX_CHUNK_CHARACTERS) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }

    currentChunk.push(utterance);
    currentSize += line.length;
  });

  if (currentChunk.length) {
    chunks.push(currentChunk);
  }

  return chunks;
};

const mergeSummaries = (summaries, fallbackSummary) => {
  const merged = summaries.filter(Boolean).join(" ").trim();
  return (merged || fallbackSummary || "").slice(0, 1500);
};

const buildStorageChunks = (meetingId, transcriptChunks) =>
  transcriptChunks.map((chunk) => ({
    ...chunk,
    meetingId: String(meetingId)
  }));

const buildSafetyFallbackInsights = ({ utterances, transcriptText, ruleBasedInsights }) => {
  const normalizedUtterances = utterances.filter((utterance) => utterance?.text?.trim());
  const transcriptSentences = transcriptText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const summary =
    ruleBasedInsights?.summary ||
    transcriptSentences.slice(0, 2).join(" ").slice(0, 1500) ||
    normalizedUtterances.slice(0, 2).map((utterance) => utterance.text).join(" ").slice(0, 1500);

  const decisions =
    ruleBasedInsights?.decisions?.length
      ? ruleBasedInsights.decisions
      : normalizedUtterances.slice(0, 2).map((utterance) => ({
          text: utterance.text,
          citations: [
            {
              utteranceId: utterance.utteranceId,
              startTimeMs: utterance.startTimeMs,
              endTimeMs: utterance.endTimeMs,
              speaker: utterance.speaker,
              snippet: utterance.text.slice(0, 240)
            }
          ]
        }));

  const actionItems =
    ruleBasedInsights?.actionItems?.length
      ? ruleBasedInsights.actionItems
      : normalizedUtterances
          .filter((utterance) => /\b(will|should|by|need to|next step|please)\b/i.test(utterance.text))
          .slice(0, 3)
          .map((utterance) => ({
            owner: utterance.speaker && utterance.speaker !== "Unknown" ? utterance.speaker : "",
            task: utterance.text,
            deadline: utterance.text.match(/\bby\s+([^.!,;]+)/i)?.[0] || "",
            citations: [
              {
                utteranceId: utterance.utteranceId,
                startTimeMs: utterance.startTimeMs,
                endTimeMs: utterance.endTimeMs,
                speaker: utterance.speaker,
                snippet: utterance.text.slice(0, 240)
              }
            ],
            status: "open"
          }));

  return {
    summary,
    decisions,
    actionItems
  };
};

const ensureMinimumInsights = ({ utterances, insights }) => {
  const safeInsights = {
    summary: String(insights?.summary || "").trim(),
    decisions: Array.isArray(insights?.decisions) ? insights.decisions.filter(Boolean) : [],
    actionItems: Array.isArray(insights?.actionItems) ? insights.actionItems.filter(Boolean) : [],
    sentimentTimeline: Array.isArray(insights?.sentimentTimeline) ? insights.sentimentTimeline : [],
    speakerSentiments: Array.isArray(insights?.speakerSentiments) ? insights.speakerSentiments : [],
    transcriptChunks: Array.isArray(insights?.transcriptChunks) ? insights.transcriptChunks : []
  };

  if (!safeInsights.summary) {
    safeInsights.summary = utterances.slice(0, 2).map((utterance) => utterance.text).join(" ");
  }

  if (safeInsights.decisions.length < MIN_REQUIRED_DECISIONS) {
    const fallbackUtterance = utterances.find((utterance) => utterance?.text?.trim());

    if (fallbackUtterance) {
      safeInsights.decisions = [
        ...safeInsights.decisions,
        {
          text: `Team direction captured: ${fallbackUtterance.text.trim()}`,
          citations: [
            {
              utteranceId: fallbackUtterance.utteranceId,
              startTimeMs: fallbackUtterance.startTimeMs,
              endTimeMs: fallbackUtterance.endTimeMs,
              speaker: fallbackUtterance.speaker,
              snippet: fallbackUtterance.text.slice(0, 240)
            }
          ]
        }
      ].slice(0, MIN_REQUIRED_DECISIONS);
    }
  }

  if (safeInsights.actionItems.length < MIN_REQUIRED_ACTIONS) {
    const fallbackUtterance =
      utterances.find((utterance) => /\b(will|should|need to|must|next step|please)\b/i.test(utterance.text)) ||
      utterances.find((utterance) => utterance?.text?.trim());

    if (fallbackUtterance) {
      safeInsights.actionItems = [
        ...safeInsights.actionItems,
        {
          owner:
            fallbackUtterance.speaker && fallbackUtterance.speaker !== "Unknown"
              ? fallbackUtterance.speaker
              : "Team",
          task: `Follow up on: ${fallbackUtterance.text.trim()}`,
          deadline: fallbackUtterance.text.match(/\bby\s+([^.!,;]+)/i)?.[0] || "",
          citations: [
            {
              utteranceId: fallbackUtterance.utteranceId,
              startTimeMs: fallbackUtterance.startTimeMs,
              endTimeMs: fallbackUtterance.endTimeMs,
              speaker: fallbackUtterance.speaker,
              snippet: fallbackUtterance.text.slice(0, 240)
            }
          ],
          status: "open"
        }
      ].slice(0, MIN_REQUIRED_ACTIONS);
    }
  }

  return safeInsights;
};

const summarizeChunksWithProvider = async ({ title, utteranceChunks }) => {
  const summaries = [];
  let fallbackUsed = false;

  for (const utteranceChunk of utteranceChunks) {
    const chunkText = utteranceChunk
      .map((utterance) => `${utterance.speaker || "Unknown"}: ${utterance.text}`)
      .join("\n");

    try {
      const summary = await huggingFaceProvider.summarizeChunk(
        `Meeting: ${title}\n${chunkText}`
      );
      summaries.push(summary);
    } catch (error) {
      fallbackUsed = true;
      console.error("Hugging Face summarization failed, falling back to rule-based summary", error);
      summaries.push("");
    }
  }

  return {
    summaries,
    fallbackUsed
  };
};

export const insightExtractionService = {
  async extractInsights({ meetingId, title, transcriptText, utterances }) {
    if (!transcriptText?.trim() || !utterances?.length) {
      throw new AppError("Transcript is empty and cannot be processed", 400);
    }

    const startedAt = Date.now();
    const utteranceChunks = chunkUtterances(utterances);
    logExtractionStage(meetingId, "extraction-start", {
      transcriptLength: transcriptText.length,
      utteranceCount: utterances.length,
      chunkCount: utteranceChunks.length
    });

    let ruleBasedInsights;

    try {
      ruleBasedInsights = await meetingAiService.processMeeting({ utterances });
      logExtractionStage(meetingId, "rule-based-complete", {
        summaryLength: ruleBasedInsights?.summary?.length || 0,
        decisions: ruleBasedInsights?.decisions?.length || 0,
        actionItems: ruleBasedInsights?.actionItems?.length || 0
      });
    } catch (error) {
      console.error(`[meeting-processing] meeting=${meetingId} stage=rule-based-failed`, error);
      ruleBasedInsights = null;
    }

    const fallbackInsights = buildSafetyFallbackInsights({
      utterances,
      transcriptText,
      ruleBasedInsights
    });

    const { summaries, fallbackUsed } = await summarizeChunksWithProvider({
      title,
      utteranceChunks
    });
    logExtractionStage(meetingId, "provider-summarization-complete", {
      chunkSummaries: summaries.filter(Boolean).length,
      providerFallbackUsed: fallbackUsed
    });

    const finalInsights = ensureMinimumInsights({
      utterances,
      insights: {
        summary: mergeSummaries(
          summaries,
          ruleBasedInsights?.summary || fallbackInsights.summary
        ),
        decisions:
          ruleBasedInsights?.decisions?.length
            ? ruleBasedInsights.decisions
            : fallbackInsights.decisions,
        actionItems:
          ruleBasedInsights?.actionItems?.length
            ? ruleBasedInsights.actionItems
            : fallbackInsights.actionItems,
        sentimentTimeline: ruleBasedInsights?.sentimentTimeline || [],
        speakerSentiments: ruleBasedInsights?.speakerSentiments || [],
        transcriptChunks: buildStorageChunks(
          meetingId,
          ruleBasedInsights?.transcriptChunks || []
        )
      }
    });

    logExtractionStage(meetingId, "extraction-complete", {
      decisions: finalInsights.decisions.length,
      actionItems: finalInsights.actionItems.length,
      providerFallbackUsed: fallbackUsed,
      processingTimeMs: Date.now() - startedAt
    });

    return {
      summary: finalInsights.summary,
      decisions: finalInsights.decisions,
      actionItems: finalInsights.actionItems,
      sentimentTimeline: finalInsights.sentimentTimeline,
      speakerSentiments: finalInsights.speakerSentiments,
      transcriptChunks: finalInsights.transcriptChunks,
      metadata: {
        processingTimeMs: Date.now() - startedAt,
        chunkCount: utteranceChunks.length,
        provider: huggingFaceProvider.providerName,
        fallbackUsed:
          fallbackUsed || !ruleBasedInsights?.decisions?.length || !ruleBasedInsights?.actionItems?.length
      }
    };
  }
};
