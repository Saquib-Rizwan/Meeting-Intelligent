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
  /\b(?:final decision is|final decision was|decision is|decision was|decided to|approved|approval granted for)\s+(.+)/i,
  /\b(?:we will go with|moving forward with|let'?s proceed with|chosen approach is|selected option is)\s+(.+)/i,
  /\b(?:we will|we'll)\s+(use|launch|ship|move forward with|adopt|deprecate|prioritize|proceed with|standardize on)\s+(.+)/i,
  /\b(?:choose|chose|chosen|select|selected)\s+(.+)/i
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
const NON_DECISION_QUALIFIERS = [
  /\b(?:agree|agreed|agreement|aligned|alignment)\b/i,
  /\b(?:maybe|perhaps|probably|possibly|might|could|can|should|would)\b/i,
  /\b(?:think|proposal|propose|proposed|suggest|suggested|recommend|recommended|prefer|preferred)\b/i,
  /\b(?:discuss|discussed|consider|considering|explore|exploring|review|reviewing|brainstorm)\b/i
];
const STRONG_DECISION_SIGNAL_PATTERN =
  /\b(?:final decision|decision is|decision was|approved|approval granted|selected|chosen|decided to|we will go with|moving forward with|let'?s proceed with|we(?:\s+will|'ll)\s+(?:use|launch|ship|move forward with|adopt|deprecate|prioritize|proceed with|standardize on))\b/i;
const WEAK_DECISION_TEXT_PATTERN =
  /^(?:agree|agreed|agreement|aligned|alignment|yes|yeah|okay|ok|sounds good)\b/i;
const NON_DECISION_LEAD_PATTERN =
  /^(?:review|revisit|discuss|consider|explore|brainstorm|check|investigate|follow up on)\b/i;
const normalizeToken = (token) => token.toLowerCase().replace(/[^a-z0-9]/g, "");
const normalizeWhitespace = (text) => String(text || "").replace(/\s+/g, " ").trim();
const cleanSentence = (text) => normalizeWhitespace(String(text || "").replace(/^[\-\*\d.\s]+/, ""));
const TARGET_YOU_WILL_PATTERN = /\b([A-Z][a-z]+),?\s+you will\b/i;
const TARGET_WILL_PATTERN = /\b([A-Z][a-z]+)\s+will\b/i;
const TARGET_ASSIGN_PATTERN = /\bassign\s+([A-Z][a-z]+)\s+to\b/i;
const DECISION_PREFIX_CLEANUP_PATTERNS = [
  /^(?:we\s+)?agreed\s+to\s+/i,
  /^(?:the\s+)?final decision\s+(?:is|was)\s+/i,
  /^(?:the\s+)?decision\s+(?:is|was)\s+/i,
  /^we\s+will\s+go\s+with\s+/i,
  /^moving\s+forward\s+with\s+/i,
  /^let'?s\s+proceed\s+with\s+/i,
  /^approved\s+/i
];

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
    (utterance.speaker && utterance.speaker !== "Unknown" ? utterance.speaker : "Unknown"),
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

const normalizeDecisionText = (text) => {
  let normalized = cleanSentence(text)
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  DECISION_PREFIX_CLEANUP_PATTERNS.forEach((pattern) => {
    normalized = normalized.replace(pattern, "");
  });

  normalized = normalized.replace(/^to\s+/i, "");
  normalized = normalized.replace(/\b(?:by|before)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b.*$/i, "").trim();
  normalized = normalized.replace(/[.?!]+$/, "").trim();

  if (!normalized) {
    return cleanSentence(text);
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const isCredibleDecision = (utterance, decisionText) => {
  const sourceText = cleanSentence(utterance?.text);
  const normalizedDecision = cleanSentence(decisionText);
  const hasStrongDecisionSignal = STRONG_DECISION_SIGNAL_PATTERN.test(sourceText);

  if (!sourceText || !normalizedDecision || normalizedDecision.length < 8) {
    return false;
  }

  if (/\?$/.test(sourceText)) {
    return false;
  }

  if (WEAK_DECISION_TEXT_PATTERN.test(normalizedDecision)) {
    return false;
  }

  if (NON_DECISION_LEAD_PATTERN.test(normalizedDecision) && !hasStrongDecisionSignal) {
    return false;
  }

  if (
    NON_DECISION_QUALIFIERS.some((pattern) => pattern.test(sourceText)) &&
    !hasStrongDecisionSignal
  ) {
    return false;
  }

  if (/^(?:yes|yeah|agreed|sounds good|okay|ok)\b/i.test(sourceText)) {
    return false;
  }

  return true;
};

const extractDecisionText = (utterance) => {
  const sentence = cleanSentence(utterance.text);

  for (const pattern of DECISION_PATTERNS) {
    const match = sentence.match(pattern);

    if (!match) {
      continue;
    }

    if (match[1] && match[2]) {
      return normalizeDecisionText(`${match[1]} ${match[2]}`);
    }

    if (match[1]) {
      return normalizeDecisionText(match[1]);
    }
  }

  return null;
};

const buildDecisions = (utterances) => {
  const matchedDecisions = utterances
    .map((utterance) => ({
      utterance,
      decisionText: extractDecisionText(utterance)
    }))
    .filter((item) => item.decisionText && isCredibleDecision(item.utterance, item.decisionText))
    .filter(
      (item, index, items) =>
        items.findIndex(
          (candidate) =>
            cleanSentence(candidate.decisionText).toLowerCase() ===
            cleanSentence(item.decisionText).toLowerCase()
        ) === index
    )
    .slice(0, 10)
    .map(({ utterance, decisionText }) => ({
      text: decisionText,
      citations: [buildCitation(utterance)]
    }));

  return matchedDecisions;
};

const inferDeadline = (text) => {
  for (const pattern of DEADLINE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return null;
};

const inferActionOwner = (utterance) => {
  const sentence = String(utterance.text || "");
  const speaker = utterance.speaker && utterance.speaker !== "Unknown" ? utterance.speaker : "Unknown";
  const youWillMatch = sentence.match(TARGET_YOU_WILL_PATTERN);

  if (youWillMatch?.[1]) {
    return youWillMatch[1];
  }

  const assignMatch = sentence.match(TARGET_ASSIGN_PATTERN);

  if (assignMatch?.[1]) {
    return assignMatch[1];
  }

  const willMatch = sentence.match(TARGET_WILL_PATTERN);

  if (willMatch?.[1]) {
    return willMatch[1];
  }

  return speaker;
};

const buildActionItems = (utterances) => {
  const matchedActions = utterances
    .filter((utterance) => ACTION_PATTERNS.some((pattern) => pattern.test(utterance.text)))
    .slice(0, 15)
    .map((utterance) =>
      buildActionItem(utterance, {
        owner: inferActionOwner(utterance),
        task: cleanSentence(utterance.text),
        deadline: inferDeadline(utterance.text)
      })
    );

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

export const buildSpeakerStats = (utterances) => {
  const speakerStats = {};

  utterances.forEach((utterance) => {
    const speaker = utterance.speaker && utterance.speaker !== "Unknown" ? utterance.speaker : "Unknown";
    speakerStats[speaker] = (speakerStats[speaker] || 0) + 1;
  });

  console.log("Speaker stats:", speakerStats);

  const speakers = Object.entries(speakerStats)
    .map(([speaker, utteranceCount]) => ({ speaker, utteranceCount }))
    .sort((left, right) => right.utteranceCount - left.utteranceCount);

  return {
    speakerStats,
    mostActiveSpeaker: speakers[0] || null,
    leastActiveSpeaker: speakers[speakers.length - 1] || null
  };
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
    const speakerTracking = buildSpeakerStats(utterances);
    console.log("Parsed utterances:", utterances);
    console.log("[extraction] extracted decisions", decisions);
    console.log("Extracted actions:", actionItems);

    if (!decisions.length) {
      console.warn("[extraction] no decisions extracted");
    }

    if (!actionItems.length) {
      console.warn("[extraction] no action items extracted");
    }

    const sentimentTimeline = buildSentimentTimeline(utterances);
    const speakerSentiments = buildSpeakerSentiments(sentimentTimeline);
    const transcriptChunks = buildTranscriptChunks(utterances);

    return {
      summary,
      decisions,
      actionItems,
      speakerTracking,
      sentimentTimeline,
      speakerSentiments,
      transcriptChunks
    };
  }
};
