import { meetingAiService } from "./meeting-ai.service.js";
import { huggingFaceProvider } from "./providers/huggingface.provider.js";
import { AppError } from "../../utils/app-error.js";

const MAX_CHUNK_CHARACTERS = 12000;

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
    const ruleBasedInsights = await meetingAiService.processMeeting({ utterances });
    const { summaries, fallbackUsed } = await summarizeChunksWithProvider({
      title,
      utteranceChunks
    });

    return {
      summary: mergeSummaries(summaries, ruleBasedInsights.summary),
      decisions: ruleBasedInsights.decisions,
      actionItems: ruleBasedInsights.actionItems,
      sentimentTimeline: ruleBasedInsights.sentimentTimeline,
      speakerSentiments: ruleBasedInsights.speakerSentiments,
      transcriptChunks: buildStorageChunks(meetingId, ruleBasedInsights.transcriptChunks),
      metadata: {
        processingTimeMs: Date.now() - startedAt,
        chunkCount: utteranceChunks.length,
        provider: huggingFaceProvider.providerName,
        fallbackUsed
      }
    };
  }
};
