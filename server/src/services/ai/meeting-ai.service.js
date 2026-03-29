const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "it",
  "that",
  "this",
  "we",
  "i",
  "you",
  "they",
  "he",
  "she",
  "as",
  "at",
  "by",
  "from",
  "our",
  "your",
  "their"
]);

const DECISION_PATTERNS = [
  /\b(decided|decision|agreed|approved|finalized|locked in|we will go with)\b/i,
  /\b(let'?s proceed with|moving forward with|sign off on)\b/i
];

const ACTION_PATTERNS = [
  /\b(action item|follow up|need to|needs to|please|owner|deadline|next step)\b/i,
  /\b(i will|we will|you will|can you|should have|must)\b/i
];

const DEADLINE_PATTERNS = [
  /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\bby\s+(tomorrow|today|next week|this week|end of day|eod)\b/i,
  /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/
];

const POSITIVE_TERMS = ["good", "great", "done", "approved", "aligned", "resolved"];
const NEGATIVE_TERMS = ["blocked", "risk", "issue", "delay", "problem", "concern"];

const normalizeToken = (token) => token.toLowerCase().replace(/[^a-z0-9]/g, "");

const extractKeywords = (text, maxKeywords = 6) => {
  const counts = new Map();

  text
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .forEach((token) => {
      counts.set(token, (counts.get(token) || 0) + 1);
    });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, maxKeywords)
    .map(([token]) => token);
};

const buildCitation = (utterance) => ({
  utteranceId: utterance.utteranceId,
  startTimeMs: utterance.startTimeMs,
  endTimeMs: utterance.endTimeMs,
  speaker: utterance.speaker,
  snippet: utterance.text.slice(0, 240)
});

const inferSentimentScore = (text) => {
  const lower = text.toLowerCase();
  const positiveHits = POSITIVE_TERMS.filter((word) => lower.includes(word)).length;
  const negativeHits = NEGATIVE_TERMS.filter((word) => lower.includes(word)).length;
  const score = positiveHits - negativeHits;
  return Math.max(-1, Math.min(1, score / 2));
};

const sentenceScore = (utterance) => {
  let score = 0;
  const text = utterance.text;

  if (DECISION_PATTERNS.some((pattern) => pattern.test(text))) {
    score += 4;
  }

  if (ACTION_PATTERNS.some((pattern) => pattern.test(text))) {
    score += 3;
  }

  if (DEADLINE_PATTERNS.some((pattern) => pattern.test(text))) {
    score += 2;
  }

  score += Math.min(3, extractKeywords(text, 10).length / 3);

  return score;
};

const buildSummary = (utterances) => {
  return utterances
    .map((utterance) => ({ utterance, score: sentenceScore(utterance) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .sort(
      (left, right) =>
        Number(left.utterance.startTimeMs ?? Number.MAX_SAFE_INTEGER) -
        Number(right.utterance.startTimeMs ?? Number.MAX_SAFE_INTEGER)
    )
    .map(({ utterance }) => utterance.text)
    .join(" ")
    .slice(0, 900);
};

const buildDecisions = (utterances) => {
  return utterances
    .filter((utterance) => DECISION_PATTERNS.some((pattern) => pattern.test(utterance.text)))
    .slice(0, 10)
    .map((utterance) => ({
      text: utterance.text,
      citations: [buildCitation(utterance)]
    }));
};

const inferDeadline = (text) => {
  for (const pattern of DEADLINE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return "";
};

const buildActionItems = (utterances) => {
  return utterances
    .filter((utterance) => ACTION_PATTERNS.some((pattern) => pattern.test(utterance.text)))
    .slice(0, 15)
    .map((utterance) => ({
      owner: utterance.speaker && utterance.speaker !== "Unknown" ? utterance.speaker : "",
      task: utterance.text,
      deadline: inferDeadline(utterance.text),
      citations: [buildCitation(utterance)],
      status: "open"
    }));
};

const buildSentimentTimeline = (utterances) => {
  return utterances.map((utterance) => ({
    timestampMs: utterance.startTimeMs ?? null,
    speaker: utterance.speaker,
    sentimentScore: inferSentimentScore(utterance.text)
  }));
};

const buildSpeakerSentiments = (sentimentTimeline) => {
  const buckets = new Map();

  sentimentTimeline.forEach((point) => {
    const key = point.speaker || "Unknown";
    const entry = buckets.get(key) || { speaker: key, total: 0, utteranceCount: 0 };
    entry.total += point.sentimentScore;
    entry.utteranceCount += 1;
    buckets.set(key, entry);
  });

  return [...buckets.values()].map((entry) => ({
    speaker: entry.speaker,
    averageSentiment: Number((entry.total / entry.utteranceCount).toFixed(2)),
    utteranceCount: entry.utteranceCount
  }));
};

const buildTranscriptChunks = (utterances, chunkSize = 4) => {
  const chunks = [];

  for (let index = 0; index < utterances.length; index += chunkSize) {
    const slice = utterances.slice(index, index + chunkSize);
    const combinedText = slice.map((item) => item.text).join(" ").trim();

    if (!combinedText) {
      continue;
    }

    chunks.push({
      chunkId: `chunk-${chunks.length + 1}`,
      text: combinedText,
      startTimeMs: slice[0]?.startTimeMs,
      endTimeMs: slice[slice.length - 1]?.endTimeMs,
      speaker:
        slice.length === 1 || slice.every((item) => item.speaker === slice[0]?.speaker)
          ? slice[0]?.speaker
          : "Multiple",
      keywords: extractKeywords(combinedText),
      utteranceIds: slice.map((item) => item.utteranceId)
    });
  }

  return chunks;
};

export const meetingAiService = {
  async summarizeMeeting(meeting) {
    return buildSummary(meeting.utterances || []);
  },

  async extractActionItems(meeting) {
    return buildActionItems(meeting.utterances || []);
  },

  async answerQuestion(_params) {
    throw new Error("Question answering will be implemented on top of local semantic retrieval");
  },

  async processMeeting(meeting) {
    const utterances = meeting.utterances || [];
    const summary = buildSummary(utterances);
    const decisions = buildDecisions(utterances);
    const actionItems = buildActionItems(utterances);
    const sentimentTimeline = buildSentimentTimeline(utterances);
    const speakerSentiments = buildSpeakerSentiments(sentimentTimeline);
    const transcriptChunks = buildTranscriptChunks(utterances);

    return {
      summary,
      decisions,
      actionItems,
      sentimentTimeline,
      speakerSentiments,
      transcriptChunks
    };
  }
};
