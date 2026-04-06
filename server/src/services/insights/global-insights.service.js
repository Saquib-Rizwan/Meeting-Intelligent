import { Insight } from "../../models/insight.model.js";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "we",
  "with"
]);

const CONCERN_TERMS = [
  "risk",
  "issue",
  "issues",
  "delay",
  "delays",
  "blocked",
  "blocker",
  "problem",
  "problems",
  "testing",
  "test",
  "bug",
  "bugs",
  "failure"
];

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value) =>
  normalizeText(value)
    .split(" ")
    .filter((token) => token && token.length > 2 && !STOPWORDS.has(token));

const incrementCounter = (map, key, meetingId) => {
  const entry = map.get(key) || { label: key, count: 0, meetingIds: new Set() };
  entry.count += 1;
  entry.meetingIds.add(String(meetingId));
  map.set(key, entry);
};

const finalizeItems = (map, limit = 5) =>
  [...map.values()]
    .map((item) => ({
      label: item.label,
      count: item.count,
      meetingCount: item.meetingIds.size,
      meetingIds: [...item.meetingIds]
    }))
    .sort((left, right) => {
      if (right.meetingCount !== left.meetingCount) {
        return right.meetingCount - left.meetingCount;
      }

      return right.count - left.count;
    })
    .slice(0, limit);

const buildActionLabel = (task) => tokenize(task).slice(0, 4).join(" ");

export const globalInsightsService = {
  async getGlobalInsights() {
    const insights = await Insight.find({}, {
      meetingId: 1,
      transcriptChunks: 1,
      actionItems: 1
    }).lean();

    const recurringTopics = new Map();
    const repeatedConcerns = new Map();
    const commonActions = new Map();

    insights.forEach((insight) => {
      const meetingId = insight.meetingId;

      (insight.transcriptChunks || []).forEach((chunk) => {
        (chunk.keywords || []).forEach((keyword) => {
          const normalizedKeyword = normalizeText(keyword);

          if (normalizedKeyword && normalizedKeyword.length > 2) {
            incrementCounter(recurringTopics, normalizedKeyword, meetingId);
          }
        });

        const chunkTokens = new Set(tokenize(chunk.text));
        CONCERN_TERMS.forEach((term) => {
          if (chunkTokens.has(term)) {
            incrementCounter(repeatedConcerns, term, meetingId);
          }
        });
      });

      (insight.actionItems || []).forEach((item) => {
        const actionLabel = buildActionLabel(item.task);

        if (actionLabel) {
          incrementCounter(commonActions, actionLabel, meetingId);
        }
      });
    });

    return {
      recurringTopics: finalizeItems(recurringTopics),
      repeatedConcerns: finalizeItems(repeatedConcerns),
      commonActions: finalizeItems(commonActions)
    };
  }
};
