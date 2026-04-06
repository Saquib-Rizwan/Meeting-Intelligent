import { queryCacheService } from "../cache/query-cache.service.js";
import { huggingFaceProvider } from "../ai/providers/huggingface.provider.js";
import { retrievalService } from "../retrieval/retrieval.service.js";

const MAX_CONTEXT_CHARACTERS = 4500;
const MAX_CONTEXT_CHUNKS = 4;
const MAX_KEY_POINTS = 3;

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value) =>
  normalizeText(value)
    .split(" ")
    .filter((token) => token && token.length > 2);

const buildCacheKey = ({ question, meetingId, meetingIds }) =>
  JSON.stringify({
    question: normalizeText(question),
    meetingId: meetingId || "",
    meetingIds: [...(meetingIds || [])].sort()
  });

const buildChunkLabel = (chunk, index) => {
  const parts = [`[Chunk ${index + 1}]`];

  if (chunk.meetingId) {
    parts.push(`Meeting ${chunk.meetingId}`);
  }

  if (chunk.startTimeMs != null || chunk.endTimeMs != null) {
    parts.push(
      `${chunk.startTimeMs ?? 0}ms-${chunk.endTimeMs ?? chunk.startTimeMs ?? 0}ms`
    );
  }

  if (chunk.speaker) {
    parts.push(chunk.speaker);
  }

  return parts.join(" | ");
};

const buildContext = (chunks) => {
  let remaining = MAX_CONTEXT_CHARACTERS;
  const selectedChunks = [];
  const sections = [];

  for (const [index, chunk] of chunks.slice(0, MAX_CONTEXT_CHUNKS).entries()) {
    if (remaining <= 0) {
      break;
    }

    const header = buildChunkLabel(chunk, index);
    const availableText = Math.max(remaining - header.length - 2, 0);
    const trimmedText = chunk.text.slice(0, availableText).trim();

    if (!trimmedText) {
      continue;
    }

    selectedChunks.push(chunk);
    sections.push(`${header}\n${trimmedText}`);
    remaining -= header.length + trimmedText.length + 2;
  }

  return {
    context: sections.join("\n\n"),
    selectedChunks
  };
};

const dedupeSimilarChunks = (chunks) => {
  const seen = new Set();

  return chunks.filter((chunk) => {
    const signature = normalizeText(chunk.text).slice(0, 180);

    if (!signature || seen.has(signature)) {
      return false;
    }

    seen.add(signature);
    return true;
  });
};

const buildConfidenceScore = (chunks, qaScore = 0) => {
  if (!chunks.length) {
    return 0;
  }

  const retrievalAverage =
    chunks.reduce((sum, chunk) => sum + (chunk.score || 0), 0) / chunks.length;
  const normalizedRetrieval = Math.min(retrievalAverage / 30, 1);
  const normalizedQa = Math.min(Math.max(qaScore || 0, 0), 1);

  return Number(((normalizedRetrieval * 0.7) + (normalizedQa * 0.3)).toFixed(2));
};

const toSource = (chunk, queryTokens) => ({
  meetingId: chunk.meetingId,
  chunkId: chunk.chunkId,
  chunkText: chunk.text,
  utteranceIds: chunk.utteranceIds || [],
  startTimeMs: chunk.startTimeMs,
  endTimeMs: chunk.endTimeMs,
  speaker: chunk.speaker,
  matchedKeywords: queryTokens.filter((token) => normalizeText(chunk.text).includes(token))
});

const pickRelevantSentence = (text, queryTokens) => {
  const sentences = String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const matchedSentence = sentences.find((sentence) =>
    queryTokens.some((token) => normalizeText(sentence).includes(token))
  );

  return matchedSentence || sentences[0] || text;
};

const buildFallbackSummary = (chunk) => {
  const speaker = chunk.speaker ? `${chunk.speaker}: ` : "";
  return `Closest match from discussion: ${speaker}${pickRelevantSentence(chunk.text, [])}`;
};

const buildStructuredAnswer = ({ summary, sources, queryTokens }) => {
  const keyPoints = dedupeSimilarChunks(sources)
    .slice(0, MAX_KEY_POINTS)
    .map((source) => `- ${pickRelevantSentence(source.chunkText, queryTokens)}`);

  const evidence = sources
    .slice(0, 2)
    .map((source) => {
      const speaker = source.speaker || "Unknown speaker";
      const timeRange =
        source.startTimeMs != null || source.endTimeMs != null
          ? `${source.startTimeMs ?? 0}ms-${source.endTimeMs ?? source.startTimeMs ?? 0}ms`
          : "no timestamp";

      return `- ${speaker} (${timeRange}): ${pickRelevantSentence(source.chunkText, queryTokens)}`;
    });

  return [
    `Summary: ${summary}`,
    keyPoints.length ? `Key Points:\n${keyPoints.join("\n")}` : "Key Points:\n- No key points available.",
    evidence.length
      ? `Supporting Evidence:\n${evidence.join("\n")}`
      : "Supporting Evidence:\n- No supporting evidence available."
  ].join("\n\n");
};

const logChatResult = ({ retrievedChunkCount, contextSize, fallbackUsed, confidenceScore }) => {
  console.info("[chat] retrieval completed", {
    retrievedChunkCount,
    contextSize,
    fallbackUsed,
    confidenceScore
  });
};

export const chatService = {
  async answerQuestion({ question, meetingId, meetingIds }) {
    const cacheKey = buildCacheKey({ question, meetingId, meetingIds });
    const cached = queryCacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const queryTokens = tokenize(question);
    let retrievedChunks = [];

    try {
      retrievedChunks = await retrievalService.searchTranscriptChunks({
        query: question,
        meetingId,
        meetingIds,
        limit: 5
      });
    } catch (error) {
      console.error("Chat retrieval failed, returning fallback response", error);
    }

    if (!retrievedChunks.length) {
      const result = {
        answer: [
          "Summary: No relevant discussion found in meetings.",
          "",
          "Key Points:",
          "- No matching transcript chunks were retrieved.",
          "",
          "Supporting Evidence:",
          "- Try rephrasing the question or selecting a specific meeting."
        ].join("\n"),
        sources: [],
        confidenceScore: 0,
        fallbackUsed: true
      };

      logChatResult({
        retrievedChunkCount: 0,
        contextSize: 0,
        fallbackUsed: true,
        confidenceScore: 0
      });

      return queryCacheService.set(cacheKey, result);
    }

    retrievedChunks = dedupeSimilarChunks(retrievedChunks);
    const { context, selectedChunks } = buildContext(retrievedChunks);
    const usableChunks = selectedChunks.length ? selectedChunks : [retrievedChunks[0]];
    const sources = usableChunks.map((chunk) => toSource(chunk, queryTokens));
    const contextSize = context.length;

    try {
      const qaResult = await huggingFaceProvider.extractQA(question, context);
      const rawAnswer = qaResult.answer?.trim();
      const hasAnswer = rawAnswer && rawAnswer !== "[CLS]";

      if (hasAnswer) {
        const confidenceScore = buildConfidenceScore(usableChunks, qaResult.score);
        const result = {
          answer: buildStructuredAnswer({
            summary: rawAnswer,
            sources,
            queryTokens
          }),
          sources,
          confidenceScore,
          fallbackUsed: false
        };

        logChatResult({
          retrievedChunkCount: retrievedChunks.length,
          contextSize,
          fallbackUsed: false,
          confidenceScore
        });

        return queryCacheService.set(cacheKey, result);
      }
    } catch (error) {
      console.error("Hugging Face QA failed, using retrieval fallback", error);
    }

    const fallbackSummary = buildFallbackSummary(usableChunks[0]);
    const confidenceScore = buildConfidenceScore(usableChunks, 0);
    const result = {
      answer: buildStructuredAnswer({
        summary: fallbackSummary,
        sources,
        queryTokens
      }),
      sources,
      confidenceScore,
      fallbackUsed: true
    };

    logChatResult({
      retrievedChunkCount: retrievedChunks.length,
      contextSize,
      fallbackUsed: true,
      confidenceScore
    });

    return queryCacheService.set(cacheKey, result);
  }
};
