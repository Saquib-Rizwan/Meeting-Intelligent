import { Insight } from "../../models/insight.model.js";
import { AppError } from "../../utils/app-error.js";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 5;

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "his",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "our",
  "she",
  "that",
  "the",
  "their",
  "them",
  "they",
  "this",
  "to",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your"
]);

const WHY_MARKERS = [
  "because",
  "due",
  "reason",
  "risk",
  "issue",
  "issues",
  "problem",
  "problems",
  "bug",
  "bugs",
  "error",
  "errors",
  "failed",
  "failure",
  "regression",
  "token",
  "refresh",
  "timeout",
  "refund",
  "refunds",
  "churn",
  "cost",
  "costs",
  "support",
  "staging",
  "qa",
  "blocker",
  "blockers"
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value) =>
  normalizeText(value)
    .split(" ")
    .filter((token) => token && !STOPWORDS.has(token));

const dedupeTokens = (tokens) => [...new Set(tokens)];

const detectIntent = (query) => {
  const normalized = normalizeText(query);

  if (/\bwhy\b/.test(normalized)) {
    return "why";
  }

  return "general";
};

const expandTokensForIntent = (tokens, intent) => {
  if (intent !== "why") {
    return tokens;
  }

  return dedupeTokens([...tokens, ...WHY_MARKERS]);
};

const countOccurrences = (text, token) => {
  const matches = text.match(new RegExp(`\\b${escapeRegExp(token)}\\b`, "g"));
  return matches?.length || 0;
};

const scoreChunk = (queryTokens, chunk, intent = "general") => {
  const normalizedText = normalizeText(chunk.text);
  const keywordTokens = tokenize((chunk.keywords || []).join(" "));
  const keywordSet = new Set(keywordTokens);

  let overlapCount = 0;
  let frequencyScore = 0;
  let keywordBonus = 0;

  queryTokens.forEach((token) => {
    const occurrences = countOccurrences(normalizedText, token);

    if (occurrences > 0 || keywordSet.has(token)) {
      overlapCount += 1;
    }

    frequencyScore += occurrences;

    if (keywordSet.has(token)) {
      keywordBonus += 2;
    }
  });

  if (!overlapCount) {
    return 0;
  }

  let score = overlapCount * 10 + frequencyScore * 3 + keywordBonus;

  if (intent === "why") {
    const causalMarkerHits = WHY_MARKERS.filter(
      (token) => normalizedText.includes(token) || keywordSet.has(token)
    ).length;

    if (/\b(because|due to|root cause|main risk|concerned|expects|not safely|failed)\b/.test(normalizedText)) {
      score += 10;
    }

    score += causalMarkerHits * 2;
  }

  return score;
};

const flattenChunks = (insights) =>
  insights.flatMap((insight) =>
    (insight.transcriptChunks || []).map((chunk) => ({
      ...chunk,
      meetingId: String(chunk.meetingId || insight.meetingId)
    }))
  );

const dedupeChunks = (chunks) => {
  const seen = new Set();

  return chunks.filter((chunk) => {
    const key = `${chunk.meetingId}:${chunk.chunkId || ""}:${normalizeText(chunk.text)}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

export const retrievalService = {
  async searchTranscriptChunks({ query, meetingId, meetingIds, limit = DEFAULT_LIMIT }) {
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
      throw new AppError("question is required", 400);
    }

    const queryTokens = dedupeTokens(tokenize(query));
    const fallbackTokens = dedupeTokens(normalizedQuery.split(" ").filter(Boolean));
    const intent = detectIntent(query);
    const effectiveTokens = expandTokensForIntent(
      queryTokens.length ? queryTokens : fallbackTokens,
      intent
    );
    const meetingIdList = [meetingId, ...(meetingIds || [])].filter(Boolean);
    const match = meetingIdList.length ? { meetingId: { $in: meetingIdList } } : {};

    const insights = await Insight.find(match, {
      meetingId: 1,
      transcriptChunks: 1
    }).lean();

    if (!insights.length) {
      return [];
    }

    const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    return dedupeChunks(flattenChunks(insights))
      .map((chunk) => ({
        ...chunk,
        score: scoreChunk(effectiveTokens, chunk, intent)
      }))
      .filter((chunk) => chunk.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return (left.startTimeMs || 0) - (right.startTimeMs || 0);
      })
      .slice(0, safeLimit);
  }
};
