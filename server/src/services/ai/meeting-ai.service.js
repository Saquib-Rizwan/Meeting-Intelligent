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
  /\b(let'?s proceed with|moving forward with|sign off on)\b/i,
  /\b(final decision|we will|we'll|let'?s do|let'?s ship|chosen approach)\b/i
];

const ACTION_PATTERNS = [
  /\b(action item|follow up|need to|needs to|please|owner|deadline|next step)\b/i,
  /\b(i will|we will|you will|can you|should have|must|will|should|by)\b/i,
  /\b(assign|assigned|take this|handle this|send|prepare|share|deliver|update|review)\b/i
];

const DEADLINE_PATTERNS = [
  /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\bby\s+(tomorrow|today|next week|this week|end of day|eod)\b/i,
  /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/
];

const POSITIVE_TERMS = ["good", "great", "done", "approved", "aligned", "resolved"];
const NEGATIVE_TERMS = ["blocked", "risk", "issue", "delay", "problem", "concern"];
const PERSON_TASK_PATTERN =
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:will|should|needs to|must|can)\s+(.+)/;
const IMPLIED_OWNER_PATTERN =
  /\b(i|we|you)\s+(?:will|should|need to|must|can)\s+(.+)/i;

const normalizeToken = (token) => token.toLowerCase().replace(/[^a-z0-9]/g, "");
const normalizeWhitespace = (text) => String(text || "").replace(/\s+/g, " ").trim();
const cleanSentence = (text) => normalizeWhitespace(String(text || "").replace(/^[\-\*\d.\s]+/, ""));

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

const buildActionItem = (utterance, overrides = {}) => ({
  owner:
    overrides.owner ??
    (utterance.speaker && utterance.speaker !== "Unknown" ? utterance.speaker : ""),
  task: cleanSentence(overrides.task ?? utterance.text),
  deadline: overrides.deadline ?? inferDeadline(utterance.text),
  citations: [buildCitation(utterance)],
  status: "open"
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
  const rankedSentences = utterances
    .map((utterance) => ({ utterance, score: sentenceScore(utterance) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .sort(
      (left, right) =>
        Number(left.utterance.startTimeMs ?? Number.MAX_SAFE_INTEGER) -
        Number(right.utterance.startTimeMs ?? Number.MAX_SAFE_INTEGER)
    )
    .map(({ utterance }) => cleanSentence(utterance.text))
    .filter(Boolean);

  const leadSentences = getTranscriptSentences(utterances).slice(0, 2);
  const decisionSentences = buildDecisions(utterances)
    .slice(0, 2)
    .map((decision) => cleanSentence(decision.text));

  return [...new Set([...leadSentences, ...rankedSentences, ...decisionSentences])]
    .filter(Boolean)
    .join(" ")
    .slice(0, 900);
};

const getTranscriptSentences = (utterances) =>
  utterances
    .flatMap((utterance) =>
      String(utterance.text || "")
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
    );

const buildFallbackSummary = (utterances) =>
  getTranscriptSentences(utterances)
    .slice(0, 2)
    .join(" ")
    .slice(0, 900);

const buildDecisions = (utterances) => {
  const matchedDecisions = utterances
    .filter((utterance) => DECISION_PATTERNS.some((pattern) => pattern.test(utterance.text)))
    .slice(0, 10)
    .map((utterance) => ({
      text: utterance.text,
      citations: [buildCitation(utterance)]
    }));

  if (matchedDecisions.length) {
    return matchedDecisions;
  }

  const fallbackDecisions = utterances
    .filter((utterance) => ACTION_PATTERNS.some((pattern) => pattern.test(utterance.text)))
    .slice(0, 2)
    .map((utterance) => ({
      text: utterance.text,
      citations: [buildCitation(utterance)]
    }));

  if (fallbackDecisions.length) {
    return fallbackDecisions;
  }

  const firstMeaningfulUtterance = utterances.find((utterance) => cleanSentence(utterance.text));

  return firstMeaningfulUtterance
    ? [
        {
          text: `Team direction captured: ${cleanSentence(firstMeaningfulUtterance.text)}`,
          citations: [buildCitation(firstMeaningfulUtterance)]
        }
      ]
    : [];
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
  const matchedActions = utterances
    .filter((utterance) => ACTION_PATTERNS.some((pattern) => pattern.test(utterance.text)))
    .slice(0, 15)
    .map((utterance) => {
      const explicitPersonMatch = utterance.text.match(PERSON_TASK_PATTERN);

      if (explicitPersonMatch) {
        return buildActionItem(utterance, {
          owner: explicitPersonMatch[1],
          task: explicitPersonMatch[2]
        });
      }

      const impliedOwnerMatch = utterance.text.match(IMPLIED_OWNER_PATTERN);

      if (impliedOwnerMatch) {
        const pronoun = impliedOwnerMatch[1].toLowerCase();
        const owner =
          pronoun === "i"
            ? utterance.speaker || ""
            : pronoun === "we"
              ? "Team"
              : "You";

        return buildActionItem(utterance, {
          owner,
          task: impliedOwnerMatch[2]
        });
      }

      return buildActionItem(utterance);
    });

  if (matchedActions.length) {
    return matchedActions;
  }

  const fallbackActionSource = utterances.find((utterance) => utterance.text?.trim());

  return fallbackActionSource
    ? [
        buildActionItem(fallbackActionSource, {
          task: `Follow up on: ${cleanSentence(fallbackActionSource.text)}`
        })
      ]
    : [];
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
    const summary = buildSummary(utterances) || buildFallbackSummary(utterances);
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
