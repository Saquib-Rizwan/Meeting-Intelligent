import { queryCacheService } from "./cache/query-cache.service.js";
import { huggingFaceProvider } from "./ai/providers/huggingface.provider.js";
import { retrievalService } from "./retrieval/retrieval.service.js";

const MAX_CONTEXT_CHARACTERS = 4500;
const MAX_CONTEXT_CHUNKS = 4;
const MAX_KEY_POINTS = 3;
const MAX_SUMMARY_SENTENCES = 2;
const MAX_CONVERSATIONAL_SENTENCES = 3;

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
    parts.push(`${chunk.startTimeMs ?? 0}ms-${chunk.endTimeMs ?? chunk.startTimeMs ?? 0}ms`);
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

  return Number(((normalizedRetrieval * 0.7) + normalizedQa * 0.3).toFixed(2));
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

const sentenceContainsAny = (sentence, queryTokens) =>
  queryTokens.some((token) => normalizeText(sentence).includes(token));

const buildFallbackSummary = (chunk) => {
  const speaker = chunk.speaker ? `${chunk.speaker}: ` : "";
  return `Closest match from discussion: ${speaker}${pickRelevantSentence(chunk.text, [])}`;
};

const normalizeGeneratedAnswer = (answer) =>
  String(answer || "")
    .replace(/^answer:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

const detectQuestionIntent = (question) => {
  const normalizedQuestion = normalizeText(question);

  if (/\bwhy\b/.test(normalizedQuestion)) {
    return "why";
  }

  if (/\bwho\b/.test(normalizedQuestion) && /\b(owner|owns|responsible|assigned)\b/.test(normalizedQuestion)) {
    return "owner";
  }

  if (/\b(decisions?|decide|decided)\b/.test(normalizedQuestion)) {
    return "decision";
  }

  if (/\b(action items?|next steps?|follow up|tasks?)\b/.test(normalizedQuestion)) {
    return "action";
  }

  if (/\b(concerns?|risks?|issues?|problems?)\b/.test(normalizedQuestion)) {
    return "concern";
  }

  if (/\b(summarize|summary|recap)\b/.test(normalizedQuestion)) {
    return "summary";
  }

  return "general";
};

const sentenceLooksLikeDecision = (sentence) =>
  /\b(final decision|decision is|decision was|approved|we will|we'll|delay|offer|provide|hotfix|limit|launch)\b/i.test(sentence);

const sentenceLooksLikeAction = (sentence) =>
  /\b(action item|will|owner|by\s+(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d))/i.test(sentence);

const sentenceLooksLikeConcern = (sentence) =>
  /\b(concern|risk|blocked|issue|complaint|timeout|crash|refund|margin|support load|unusable)\b/i.test(sentence);

const sentenceLooksLikeCause = (sentence) =>
  /\b(because|due to|reason|regression|token refresh|timeout errors|support costs|refunds|churn risk|not safely|failed|risk is real|main risk|concerned|expects)\b/i.test(sentence);

const scoreWhySentence = (sentence, queryTokens) => {
  let score = 0;

  if (sentenceLooksLikeCause(sentence)) {
    score += 6;
  }

  if (sentenceLooksLikeConcern(sentence)) {
    score += 3;
  }

  if (sentenceContainsAny(sentence, queryTokens)) {
    score += 2;
  }

  return score;
};

const collectCandidateSentences = (sources) =>
  [...new Set(
    sources.flatMap((source) =>
      String(source.chunkText || "")
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
    )
  )];

const buildIntentSentences = ({ sources, queryTokens, intent }) => {
  const candidateSentences = collectCandidateSentences(sources);
  const matchedSentences = candidateSentences.filter((sentence) => sentenceContainsAny(sentence, queryTokens));
  const pool = matchedSentences.length ? matchedSentences : candidateSentences;

  if (intent === "why") {
    return [...new Set(pool)]
      .sort((left, right) => scoreWhySentence(right, queryTokens) - scoreWhySentence(left, queryTokens))
      .slice(0, MAX_CONVERSATIONAL_SENTENCES);
  }

  const filtered =
    intent === "decision"
      ? pool.filter(sentenceLooksLikeDecision)
      : intent === "action" || intent === "owner"
        ? pool.filter(sentenceLooksLikeAction)
        : intent === "concern"
          ? pool.filter((sentence) => sentenceLooksLikeConcern(sentence) || sentenceContainsAny(sentence, queryTokens))
          : pool;

  return [...new Set((filtered.length ? filtered : pool).slice(0, MAX_CONVERSATIONAL_SENTENCES))];
};

const toNaturalList = (items) => {
  if (!items.length) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

const ensureSentence = (value) => {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  return /[.!?]$/.test(text) ? text : `${text}.`;
};

const buildConversationalAnswer = ({ question, sources, queryTokens, meetingCount, chunkCount }) => {
  const intent = detectQuestionIntent(question);
  const intentSentences = buildIntentSentences({ sources, queryTokens, intent });
  const opening =
    intent === "decision"
      ? "From the meeting, the clearest decisions were:"
      : intent === "action"
        ? "Here are the main action items I found:"
        : intent === "owner"
          ? "Here is who appears to own the follow-up work:"
          : intent === "why"
            ? "From the discussion, the main reason was this:"
            : intent === "concern"
              ? "The strongest concerns I found were:"
              : "Here is the clearest answer I could piece together from the meeting:";

  if (!intentSentences.length) {
    return "I could not find a confident answer in the transcript. Try rephrasing the question or narrowing it to one meeting.";
  }

  if (intent === "decision" || intent === "action" || intent === "concern") {
    const combined = intentSentences.slice(0, MAX_KEY_POINTS).map(ensureSentence).join(" ");
    return `${opening}\n\n${combined}\n\nI based this on ${chunkCount} transcript segment${chunkCount === 1 ? "" : "s"} across ${meetingCount} meeting${meetingCount === 1 ? "" : "s"}.`;
  }

  if (intent === "owner") {
    const owners = sources
      .map((source) => source.speaker)
      .filter(Boolean)
      .slice(0, MAX_KEY_POINTS);

    const ownerSummary = owners.length
      ? `The likely owners mentioned here were ${toNaturalList([...new Set(owners)])}.`
      : "";

    return `${opening}\n\n${intentSentences.slice(0, 2).map(ensureSentence).join(" ")}${ownerSummary ? ` ${ownerSummary}` : ""}`;
  }

  if (intent === "why") {
    return `${opening}\n\n${intentSentences.slice(0, 2).map(ensureSentence).join(" ")}\n\nI based this on ${chunkCount} transcript segment${chunkCount === 1 ? "" : "s"} across ${meetingCount} meeting${meetingCount === 1 ? "" : "s"}.`;
  }

  return `${opening}\n\n${intentSentences.slice(0, MAX_SUMMARY_SENTENCES).map(ensureSentence).join(" ")}\n\nI based this on ${chunkCount} transcript segment${chunkCount === 1 ? "" : "s"} across ${meetingCount} meeting${meetingCount === 1 ? "" : "s"}.`;
};

const buildQaBackedAnswer = ({ question, rawAnswer, meetingCount, chunkCount }) => {
  const intent = detectQuestionIntent(question);
  const cleanAnswer = normalizeGeneratedAnswer(rawAnswer);

  if (!cleanAnswer) {
    return "";
  }

  if (intent === "why") {
    return `The main reason mentioned was ${cleanAnswer}.\n\nI based this on ${chunkCount} transcript segment${chunkCount === 1 ? "" : "s"} across ${meetingCount} meeting${meetingCount === 1 ? "" : "s"}.`;
  }

  if (intent === "owner") {
    return `The follow-up work appears to belong to ${cleanAnswer}.\n\nI based this on ${chunkCount} transcript segment${chunkCount === 1 ? "" : "s"} across ${meetingCount} meeting${meetingCount === 1 ? "" : "s"}.`;
  }

  if (intent === "decision") {
    return `The clearest decision I found was ${cleanAnswer}.\n\nI based this on ${chunkCount} transcript segment${chunkCount === 1 ? "" : "s"} across ${meetingCount} meeting${meetingCount === 1 ? "" : "s"}.`;
  }

  if (intent === "action") {
    return `The main action item I found was ${cleanAnswer}.\n\nI based this on ${chunkCount} transcript segment${chunkCount === 1 ? "" : "s"} across ${meetingCount} meeting${meetingCount === 1 ? "" : "s"}.`;
  }

  if (intent === "concern") {
    return `The strongest concern mentioned was ${cleanAnswer}.\n\nI based this on ${chunkCount} transcript segment${chunkCount === 1 ? "" : "s"} across ${meetingCount} meeting${meetingCount === 1 ? "" : "s"}.`;
  }

  return `${cleanAnswer}\n\nI based this on ${chunkCount} transcript segment${chunkCount === 1 ? "" : "s"} across ${meetingCount} meeting${meetingCount === 1 ? "" : "s"}.`;
};

const buildCrossChunkSummary = (sources, queryTokens) => {
  const matchedSentences = sources
    .flatMap((source) =>
      String(source.chunkText || "")
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
    )
    .filter((sentence) => sentenceContainsAny(sentence, queryTokens));

  const candidateSentences = matchedSentences.length
    ? matchedSentences
    : sources.map((source) => pickRelevantSentence(source.chunkText, queryTokens));

  return [...new Set(candidateSentences)].slice(0, MAX_SUMMARY_SENTENCES).join(" ");
};

const logChatResult = ({
  retrievedChunkCount,
  contextSize,
  fallbackUsed,
  confidenceScore,
  meetingCount,
  chunkCount
}) => {
  if (fallbackUsed || !retrievedChunkCount) {
    console.info("[chat] response-generated", {
      retrievedChunkCount,
      contextSize,
      fallbackUsed,
      confidenceScore,
      meetingCount,
      chunkCount
    });
  }
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
        answer:
          "I could not find a grounded answer in the available transcripts. Try rephrasing the question or selecting a specific meeting.",
        answerMode: "fallback",
        sources: [],
        meetingCount: 0,
        chunkCount: 0,
        confidenceScore: 0,
        fallbackUsed: true
      };

      logChatResult({
        retrievedChunkCount: 0,
        contextSize: 0,
        fallbackUsed: true,
        confidenceScore: 0,
        meetingCount: 0,
        chunkCount: 0
      });

      return queryCacheService.set(cacheKey, result);
    }

    retrievedChunks = dedupeSimilarChunks(retrievedChunks);
    const { context, selectedChunks } = buildContext(retrievedChunks);
    const usableChunks = selectedChunks.length ? selectedChunks : [retrievedChunks[0]];
    const sources = usableChunks.map((chunk) => toSource(chunk, queryTokens));
    const contextSize = context.length;
    const meetingCount = new Set(sources.map((source) => source.meetingId).filter(Boolean)).size;
    const chunkCount = sources.length;
    const crossChunkSummary = buildCrossChunkSummary(sources, queryTokens);

    try {
      const generatedAnswer = normalizeGeneratedAnswer(
        await huggingFaceProvider.generateGroundedAnswer({
          question,
          context
        })
      );

      if (generatedAnswer) {
        const confidenceScore = buildConfidenceScore(usableChunks, 0.65);
        const result = {
          answer: generatedAnswer,
          answerMode: "generated",
          sources,
          meetingCount,
          chunkCount,
          confidenceScore,
          fallbackUsed: false
        };

        logChatResult({
          retrievedChunkCount: retrievedChunks.length,
          contextSize,
          fallbackUsed: false,
          confidenceScore,
          meetingCount,
          chunkCount
        });

        return queryCacheService.set(cacheKey, result);
      }
    } catch (error) {
      console.error("Hugging Face generative answering failed, trying extractive QA", error);
    }

    try {
      const qaResult = await huggingFaceProvider.extractQA(question, context);
      const rawAnswer = normalizeGeneratedAnswer(qaResult.answer);
      const hasAnswer = rawAnswer && rawAnswer !== "[CLS]";

      if (hasAnswer) {
        const confidenceScore = buildConfidenceScore(usableChunks, qaResult.score);
        const result = {
          answer:
            buildQaBackedAnswer({
              question,
              rawAnswer,
              meetingCount,
              chunkCount
            }) ||
            buildConversationalAnswer({
              question,
              sources,
              queryTokens,
              meetingCount,
              chunkCount
            }),
          answerMode: "qa",
          sources,
          meetingCount,
          chunkCount,
          confidenceScore,
          fallbackUsed: false
        };

        logChatResult({
          retrievedChunkCount: retrievedChunks.length,
          contextSize,
          fallbackUsed: false,
          confidenceScore,
          meetingCount,
          chunkCount
        });

        return queryCacheService.set(cacheKey, result);
      }
    } catch (error) {
      console.error("Hugging Face QA failed, using retrieval fallback", error);
    }

    const fallbackSummary = buildFallbackSummary(usableChunks[0]);
    const confidenceScore = buildConfidenceScore(usableChunks, 0);
    const result = {
      answer:
        buildConversationalAnswer({
          question,
          sources,
          queryTokens,
          meetingCount,
          chunkCount
        }) || crossChunkSummary || fallbackSummary,
      answerMode: "fallback",
      sources,
      meetingCount,
      chunkCount,
      confidenceScore,
      fallbackUsed: true
    };

    logChatResult({
      retrievedChunkCount: retrievedChunks.length,
      contextSize,
      fallbackUsed: true,
      confidenceScore,
      meetingCount,
      chunkCount
    });

    return queryCacheService.set(cacheKey, result);
  }
};
