import { useMemo } from "react";

import { queryChat } from "../lib/api.js";
import SectionCard from "./SectionCard.jsx";
import { useEffect, useRef, useState } from "react";

const formatTimestamp = (startTimeMs, endTimeMs) => {
  if (startTimeMs == null && endTimeMs == null) {
    return "No timestamp";
  }

  return `${startTimeMs ?? 0}ms - ${endTimeMs ?? startTimeMs ?? 0}ms`;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeToken = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseStructuredAnswer = (answer) => {
  const content = String(answer || "");
  const summaryMatch = content.match(/Summary:\s*([\s\S]*?)(?=\n\nCoverage:|\n\nKey Points:|$)/i);
  const coverageMatch = content.match(/Coverage:\s*([\s\S]*?)(?=\n\nKey Points:|$)/i);
  const keyPointsMatch = content.match(/Key Points:\s*([\s\S]*?)(?=\n\nSupporting Evidence:|$)/i);
  const evidenceMatch = content.match(/Supporting Evidence:\s*([\s\S]*)$/i);

  const summary = (summaryMatch?.[1] || content).trim();
  const coverage = (coverageMatch?.[1] || "").trim();
  const keyPoints = (keyPointsMatch?.[1] || "")
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
  const supportingEvidence = (evidenceMatch?.[1] || "")
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  return {
    summary,
    coverage,
    keyPoints,
    supportingEvidence
  };
};

const highlightText = (text, keywords) => {
  const activeKeywords = [...new Set((keywords || []).map(normalizeToken).filter(Boolean))];

  if (!text || !activeKeywords.length) {
    return text;
  }

  const pattern = new RegExp(`(${activeKeywords.map(escapeRegExp).join("|")})`, "gi");
  const parts = String(text).split(pattern);

  return parts.map((part, index) => {
    const isMatch = activeKeywords.includes(normalizeToken(part));

    if (!isMatch) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <mark key={`${part}-${index}`} className="rounded bg-amber-200 px-1 text-slate-900">
        {part}
      </mark>
    );
  });
};

const DetailBlock = ({ label, children, dark = false }) => {
  return (
    <div className={`rounded-xl border px-4 py-4 ${dark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"}`}>
      <p className={`mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.16em] ${dark ? "text-slate-300" : "text-slate-500"}`}>
        {label}
      </p>
      {children}
    </div>
  );
};

const ChatSection = ({
  initialMeetingId = "",
  title = "Chat",
  description = "Ask a question against one meeting or across all processed meetings.",
  compact = false
}) => {
  const [question, setQuestion] = useState("");
  const [meetingId, setMeetingId] = useState(initialMeetingId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const responseRef = useRef(null);

  useEffect(() => {
    setMeetingId(initialMeetingId || "");
  }, [initialMeetingId]);

  useEffect(() => {
    if (result && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const parsedAnswer = useMemo(() => parseStructuredAnswer(result?.answer), [result?.answer]);

  const highlightKeywords = useMemo(() => {
    if (!result?.sources?.length) {
      return [];
    }

    return [...new Set(result.sources.flatMap((source) => source.matchedKeywords || []))];
  }, [result]);

  const meetingCount = useMemo(() => {
    if (!result?.sources?.length) {
      return 0;
    }

    return new Set(result.sources.map((source) => source.meetingId).filter(Boolean)).size;
  }, [result]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!question.trim()) {
      setError("Question is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await queryChat({
        question: question.trim(),
        meetingId: meetingId.trim() || undefined
      });

      const normalizedSources = (response.sources || []).length
        ? response.sources
        : [
            {
              chunkText: "No relevant discussion found.",
              speaker: "System",
              matchedKeywords: []
            }
          ];

      setResult({
        ...response,
        answer:
          response.answer ||
          "Summary: No relevant discussion found.\n\nCoverage: Based on 0 meetings and 0 transcript segments.\n\nKey Points:\n- Try a more specific question.\n\nSupporting Evidence:\n- No supporting discussion was returned.",
        sources: normalizedSources
      });
    } catch (requestError) {
      setError(requestError.message);
      setResult({
        answer:
          "Summary: No relevant discussion found.\n\nCoverage: Based on 0 meetings and 0 transcript segments.\n\nKey Points:\n- The assistant could not complete the request.\n\nSupporting Evidence:\n- Try again or choose a specific meeting.",
        confidenceScore: 0,
        fallbackUsed: true,
        sources: [
          {
            chunkText: "No relevant discussion found.",
            speaker: "System",
            matchedKeywords: []
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const cardClass = compact
    ? "border-none bg-transparent p-0 shadow-none"
    : "";

  return (
    <SectionCard title={title} description={description} className={cardClass}>
      <form className={compact ? "space-y-3" : "space-y-4"} onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-700">
          Question
          <textarea
            className="mt-1 min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-300"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Why was the API launch delayed?"
            disabled={loading}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Meeting ID
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-300"
            type="text"
            value={meetingId}
            onChange={(event) => setMeetingId(event.target.value)}
            placeholder="Optional: search all meetings if empty"
            disabled={loading}
          />
        </label>

        <button
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Generating answer..." : "Send Message"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {!result && !loading ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
          Ask about decisions, delays, budgets, owners, or action items from your meetings.
        </div>
      ) : null}

      {result ? (
        <div ref={responseRef} className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white">
              Confidence: {Math.round((result.confidenceScore || 0) * 100)}%
            </span>
            {result.fallbackUsed ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800">
                AI fallback used
              </span>
            ) : null}
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700">
              Answer generated from meeting discussions
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">
              {result.meetingCount || meetingCount || 0} meetings
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">
              {result.chunkCount || result.sources?.length || 0} transcript segments
            </span>
          </div>

          <div className="rounded-2xl bg-slate-900 px-4 py-4 text-slate-100 shadow-sm">
            <div className="mb-3 flex flex-wrap gap-4 text-[11px] uppercase tracking-[0.16em] text-slate-300">
              <span>{result.sources?.length || 0} chunks used</span>
              <span>{meetingCount || 0} meetings referenced</span>
            </div>

            <div className="space-y-3 text-sm leading-6">
              <DetailBlock label="Summary" dark>
                <p>{highlightText(parsedAnswer.summary, highlightKeywords)}</p>
              </DetailBlock>

              <DetailBlock label="Coverage" dark>
                <p>{parsedAnswer.coverage || `Answer generated from ${result.meetingCount || meetingCount || 0} meetings and ${result.chunkCount || result.sources?.length || 0} transcript segments.`}</p>
              </DetailBlock>

              <DetailBlock label="Key Points" dark>
                {parsedAnswer.keyPoints.length ? (
                  <ul className="space-y-2 pl-5">
                    {parsedAnswer.keyPoints.map((point, index) => (
                      <li key={`${point}-${index}`}>{highlightText(point, highlightKeywords)}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No key points available.</p>
                )}
              </DetailBlock>

              <DetailBlock label="Supporting Evidence" dark>
                {parsedAnswer.supportingEvidence.length ? (
                  <ul className="space-y-2 pl-5">
                    {parsedAnswer.supportingEvidence.map((item, index) => (
                      <li key={`${item}-${index}`}>{highlightText(item, highlightKeywords)}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No supporting evidence available.</p>
                )}
              </DetailBlock>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-900">Source Chunks</p>
            {result.sources?.length ? (
              result.sources.map((source, index) => (
                <div
                  key={`${source.chunkId || index}-${index}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {source.speaker || "Unknown speaker"}
                    </span>
                    {source.matchedKeywords?.length ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        Matched: {source.matchedKeywords.join(", ")}
                      </span>
                    ) : null}
                  </div>
                  <div className="mb-2 text-xs text-slate-500">
                    {formatTimestamp(source.startTimeMs, source.endTimeMs)}
                  </div>
                  <div className="whitespace-pre-wrap leading-6">
                    {highlightText(source.chunkText, source.matchedKeywords || highlightKeywords)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                No relevant discussion found.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
};

export default ChatSection;
