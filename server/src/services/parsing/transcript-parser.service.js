import { AppError } from "../../utils/app-error.js";

const BRACKET_TIMESTAMP_SPEAKER_PATTERN = /^\[(\d{2}):(\d{2})\]\s*([^:]+):\s*(.+)$/;
const PLAIN_TIMESTAMP_SPEAKER_PATTERN = /^(\d{2}):(\d{2})\s+([^:]+):\s*(.+)$/;
const SPEAKER_TEXT_PATTERN = /^([^:]+):\s*(.+)$/;
const VTT_TIMESTAMP_PATTERN = /^(?:(\d{2}):)?(\d{2}):(\d{2})(?:[.,](\d{3}))?$/;

const toSentenceCase = (value) => {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");

  if (!normalized) {
    return "Unknown";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const normalizeText = (text) => String(text || "").trim();

const parseStrictTimestampMatch = (match, rawLine) => {
  const minutes = Number.parseInt(match[1], 10);
  const seconds = Number.parseInt(match[2], 10);

  if (Number.isNaN(minutes) || Number.isNaN(seconds)) {
    console.error("[parser] invalid timestamp groups", { rawLine, groups: match.slice(1, 3) });
    throw new AppError(`Invalid timestamp groups in transcript line: ${rawLine}`, 400);
  }

  const startTimeMs = (minutes * 60 + seconds) * 1000;

  if (startTimeMs == null) {
    console.error("[parser] timestamp conversion failed", { rawLine, groups: match.slice(1, 3) });
    throw new AppError(`Timestamp parsing failed for transcript line: ${rawLine}`, 400);
  }

  return startTimeMs;
};

const parseVttTimestampToMs = (timestamp) => {
  const trimmedTimestamp = String(timestamp || "").trim();
  const match = trimmedTimestamp.match(VTT_TIMESTAMP_PATTERN);

  if (!match) {
    console.error("[parser] invalid VTT timestamp", { timestamp: trimmedTimestamp });
    throw new AppError(`Invalid VTT timestamp: ${trimmedTimestamp}`, 400);
  }

  const hours = Number.parseInt(match[1] || "0", 10);
  const minutes = Number.parseInt(match[2], 10);
  const seconds = Number.parseInt(match[3], 10);
  const milliseconds = Number.parseInt(match[4] || "0", 10);

  return (((hours * 60 + minutes) * 60) + seconds) * 1000 + milliseconds;
};

const buildUtterance = ({ utteranceId, speaker, text, startTimeMs = null, endTimeMs = null }) => ({
  utteranceId,
  speaker: toSentenceCase(speaker),
  text: normalizeText(text),
  startTimeMs,
  endTimeMs
});

const logLineParse = ({ rawLine, matchFound, extractedSpeaker, extractedTime, extractedText }) => {
  console.log({
    rawLine,
    matchFound,
    extractedSpeaker,
    extractedTime,
    extractedText
  });
};

const parseTxtLine = (line, utteranceId) => {
  const rawLine = String(line || "");
  const trimmedLine = rawLine.trim();

  if (!trimmedLine) {
    return null;
  }

  let match = trimmedLine.match(BRACKET_TIMESTAMP_SPEAKER_PATTERN);

  if (match) {
    const extractedSpeaker = toSentenceCase(match[3].trim());
    const extractedTime = parseStrictTimestampMatch(match, rawLine);
    const extractedText = normalizeText(match[4]);

    logLineParse({
      rawLine,
      matchFound: true,
      extractedSpeaker,
      extractedTime,
      extractedText
    });

    return buildUtterance({
      utteranceId,
      speaker: extractedSpeaker,
      text: extractedText,
      startTimeMs: extractedTime,
      endTimeMs: null
    });
  }

  match = trimmedLine.match(PLAIN_TIMESTAMP_SPEAKER_PATTERN);

  if (match) {
    const extractedSpeaker = toSentenceCase(match[3].trim());
    const extractedTime = parseStrictTimestampMatch(match, rawLine);
    const extractedText = normalizeText(match[4]);

    logLineParse({
      rawLine,
      matchFound: true,
      extractedSpeaker,
      extractedTime,
      extractedText
    });

    return buildUtterance({
      utteranceId,
      speaker: extractedSpeaker,
      text: extractedText,
      startTimeMs: extractedTime,
      endTimeMs: null
    });
  }

  match = trimmedLine.match(SPEAKER_TEXT_PATTERN);

  if (match) {
    const extractedSpeaker = toSentenceCase(match[1].trim());
    const extractedText = normalizeText(match[2]);

    logLineParse({
      rawLine,
      matchFound: true,
      extractedSpeaker,
      extractedTime: null,
      extractedText
    });

    return buildUtterance({
      utteranceId,
      speaker: extractedSpeaker,
      text: extractedText,
      startTimeMs: null,
      endTimeMs: null
    });
  }

  console.error("[parser] failed to parse line", { rawLine });
  logLineParse({
    rawLine,
    matchFound: false,
    extractedSpeaker: null,
    extractedTime: null,
    extractedText: null
  });

  return null;
};

const finalizeTxtUtterances = (utterances) =>
  utterances.map((utterance, index, items) => {
    const nextStart = items[index + 1]?.startTimeMs ?? null;
    const startTimeMs = utterance.startTimeMs ?? null;

    return {
      ...utterance,
      startTimeMs,
      endTimeMs:
        utterance.endTimeMs ??
        startTimeMs ??
        nextStart ??
        null
    };
  });

const getUniqueSpeakers = (utterances) =>
  [...new Set(utterances.map((item) => item.speaker).filter(Boolean))];

const logParsedTranscript = (format, utterances, speakers) => {
  const validTimestamps = utterances.filter((item) => item.startTimeMs !== null).length;

  console.log("[parser] parsed utterances", utterances);
  console.log({
    totalUtterances: utterances.length,
    validTimestamps,
    uniqueSpeakers: speakers.length
  });

  if (!utterances.length) {
    console.warn("[parser] no utterances parsed");
  }

  if (format === "txt" && validTimestamps === 0) {
    throw new AppError("Timestamp parsing failed for entire transcript", 400);
  }
};

export const transcriptParserService = {
  parseTranscript({ transcriptFormat, transcriptText }) {
    if (!transcriptText?.trim()) {
      throw new AppError("Transcript text cannot be empty", 400);
    }

    if (transcriptFormat === "txt") {
      return this.parseTxt(transcriptText);
    }

    if (transcriptFormat === "vtt") {
      return this.parseVtt(transcriptText);
    }

    throw new AppError(`Unsupported transcript format: ${transcriptFormat}`, 400);
  },

  parseTxt(transcriptText) {
    const utterances = transcriptText
      .split(/\r?\n/)
      .map((line, index) => parseTxtLine(line, `utt-${index + 1}`))
      .filter((item) => item && item.text);

    const normalizedUtterances = finalizeTxtUtterances(utterances);
    const speakers = getUniqueSpeakers(normalizedUtterances);

    logParsedTranscript("txt", normalizedUtterances, speakers);

    return {
      utterances: normalizedUtterances,
      speakers
    };
  },

  parseVtt(transcriptText) {
    const lines = transcriptText.split(/\r?\n/);
    const utterances = [];

    let index = 0;
    let cueNumber = 1;

    while (index < lines.length) {
      const line = lines[index].trim();

      if (!line || line === "WEBVTT") {
        index += 1;
        continue;
      }

      if (/^\d+$/.test(line)) {
        index += 1;
      }

      const timingLine = lines[index]?.trim();

      if (!timingLine || !timingLine.includes("-->")) {
        index += 1;
        continue;
      }

      const [rawStart, rawEnd] = timingLine.split("-->").map((value) => value.trim());
      index += 1;

      const textLines = [];

      while (index < lines.length && lines[index].trim()) {
        textLines.push(lines[index].trim());
        index += 1;
      }

      const combinedText = textLines.join(" ").replace(/<[^>]+>/g, "").trim();

      if (!combinedText) {
        continue;
      }

      const parsedLine = parseTxtLine(combinedText, `utt-${cueNumber}`);

      utterances.push({
        ...parsedLine,
        startTimeMs: parseVttTimestampToMs(rawStart.split(" ")[0]),
        endTimeMs: parseVttTimestampToMs(rawEnd.split(" ")[0])
      });

      cueNumber += 1;
    }

    const speakers = getUniqueSpeakers(utterances);
    logParsedTranscript("vtt", utterances, speakers);

    return {
      utterances,
      speakers
    };
  }
};
