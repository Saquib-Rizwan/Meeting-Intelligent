import { useEffect, useMemo, useRef, useState } from "react";

import { queryChat } from "../lib/api.js";
import { formatSpeakerLabel, formatTimeRange } from "../lib/display.js";
import SectionCard from "./SectionCard.jsx";

const QUICK_PROMPTS = [
  "What decisions were actually made?",
  "Who owns the next step?",
  "Why was the launch delayed?"
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeToken = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseAnswerBlocks = (answer) =>
  String(answer || "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (/^[-*]\s/m.test(block)) {
        return {
          type: "list",
          items: block
            .split("\n")
            .map((line) => line.replace(/^[-*]\s*/, "").trim())
            .filter(Boolean)
        };
      }

      return {
        type: "paragraph",
        text: block
      };
    });

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

const renderPlainText = (text) => <span className="break-words">{text}</span>;

const createFallbackAssistantResult = (message) => ({
  answer:
    message ||
    "I could not find a confident answer in the transcript. Try asking a narrower question or selecting a specific meeting.",
  confidenceScore: 0,
  fallbackUsed: true,
  meetingCount: 0,
  chunkCount: 0,
  sources: [
    {
      chunkText: "No relevant discussion found.",
      speaker: "Meeting Assistant",
      matchedKeywords: []
    }
  ]
});

const formatMessageTime = (value) =>
  new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

const AssistantMessage = ({ result, createdAt }) => {
  const [showSources, setShowSources] = useState(false);
  const answerBlocks = useMemo(() => parseAnswerBlocks(result?.answer), [result?.answer]);
  const highlightKeywords = useMemo(
    () => [...new Set((result?.sources || []).flatMap((source) => source.matchedKeywords || []))],
    [result?.sources]
  );
  const meetingCount = useMemo(() => {
    if (!result?.sources?.length) {
      return 0;
    }

    return new Set(result.sources.map((source) => source.meetingId).filter(Boolean)).size;
  }, [result?.sources]);

  return (
    <div className="w-full max-w-[94%]">
      <div className="rounded-[22px] rounded-tl-md border border-[#d9e3dc] bg-white px-4 py-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-900">Meeting Assistant</div>
          <div className="text-[11px] text-slate-500">
            {Math.round((result.confidenceScore || 0) * 100)}% confidence
          </div>
        </div>

        <div className="space-y-3 text-sm leading-6 text-slate-700">
          {answerBlocks.map((block, index) =>
            block.type === "list" ? (
              <div key={`list-${index}`} className="space-y-2 rounded-2xl bg-[#f5f7f4] px-3 py-3">
                {block.items.map((item, itemIndex) => (
                  <div key={`${item}-${itemIndex}`} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-700" />
                    <span>{renderPlainText(item)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p
                key={`paragraph-${index}`}
                className={index === 0 ? "text-[15px] font-medium text-slate-900" : ""}
              >
                {renderPlainText(block.text)}
              </p>
            )
          )}

          <p className="text-xs text-slate-500">
            Based on {result.meetingCount || meetingCount || 0} meetings and{" "}
            {result.chunkCount || result.sources?.length || 0} transcript segments.
          </p>
        </div>

        <div className="mt-4">
          <button
            className="inline-flex items-center rounded-full border border-[#d7ddd8] bg-[#f8faf8] px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-900"
            type="button"
            onClick={() => setShowSources((current) => !current)}
          >
            {showSources ? "Hide sources" : "Show sources"} ({result.chunkCount || result.sources?.length || 0})
            {result.fallbackUsed ? " | fallback" : ""}
          </button>

          {showSources ? (
            <div className="mt-3 space-y-2">
              {result.sources?.length ? (
                result.sources.map((source, index) => (
                  <div
                    key={`${source.chunkId || index}-${index}`}
                    className="rounded-2xl border border-[#e2e7e3] bg-[#f8faf8] px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-800">
                        {formatSpeakerLabel(source.speaker, "Meeting segment")}
                      </span>
                      <span>{source.meetingId ? `Meeting ${source.meetingId}` : "Selected meeting"}</span>
                      <span>{formatTimeRange(source.startTimeMs, source.endTimeMs)}</span>
                    </div>
                    {source.matchedKeywords?.length ? (
                      <div className="mt-2 text-[11px] font-semibold text-amber-800">
                        Matched: {source.matchedKeywords.join(", ")}
                      </div>
                    ) : null}
                    <div className="mt-1.5 break-words text-sm leading-6 text-slate-700">
                      {highlightText(source.chunkText, source.matchedKeywords || highlightKeywords)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  No relevant citations found.
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-2 pl-1 text-[11px] text-slate-400">{formatMessageTime(createdAt)}</div>
    </div>
  );
};

const UserMessage = ({ text, createdAt }) => (
  <div className="max-w-[85%] rounded-[22px] rounded-br-md bg-emerald-900 px-4 py-3 text-sm leading-6 text-white shadow-sm">
    <div className="break-words">{text}</div>
    <div className="mt-1.5 text-right text-[11px] font-medium text-emerald-100/80">
      {formatMessageTime(createdAt)}
    </div>
  </div>
);

const ChatSection = ({
  initialMeetingId = "",
  title = "Chat",
  description = "Ask natural questions and get a direct answer grounded in this meeting.",
  compact = false,
  lockMeetingId = false
}) => {
  const [question, setQuestion] = useState("");
  const [meetingId, setMeetingId] = useState(initialMeetingId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const threadRef = useRef(null);

  useEffect(() => {
    setMeetingId(initialMeetingId || "");
  }, [initialMeetingId]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!question.trim()) {
      setError("Question is required.");
      return;
    }

    const submittedQuestion = question.trim();
    setQuestion("");
    setLoading(true);
    setError("");
    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text: submittedQuestion,
        createdAt: Date.now()
      }
    ]);

    try {
      const response = await queryChat({
        question: submittedQuestion,
        meetingId: meetingId.trim() || undefined
      });

      const normalizedSources = (response.sources || []).length
        ? response.sources
        : createFallbackAssistantResult().sources;

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          createdAt: Date.now(),
          result: {
            ...response,
            answer: response.answer || createFallbackAssistantResult().answer,
            sources: normalizedSources
          }
        }
      ]);
    } catch (requestError) {
      setError(requestError.message);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          createdAt: Date.now(),
          result: createFallbackAssistantResult(
            "I could not complete that answer reliably. Try again or choose a more specific meeting question."
          )
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const cardClass = compact ? "h-full border-none bg-transparent p-0 shadow-none" : "";

  return (
    <SectionCard title={title} description={description} className={cardClass}>
      <div className="flex h-full min-h-[70vh] flex-col overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,#fbfcfb_0%,#f2f5f2_100%)]">
        <div className="border-b border-[#e3e8e4] bg-white/88 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900">Meeting assistant</div>
              <div className="text-xs text-slate-500">
                Ask a question and get cited answers.
              </div>
            </div>
            {!lockMeetingId ? (
              <input
                className="w-36 rounded-xl border border-[#d7ddd8] bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-700"
                type="text"
                value={meetingId}
                onChange={(event) => setMeetingId(event.target.value)}
                placeholder="Meeting ID or all"
                disabled={loading}
              />
            ) : (
              <div className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
                This meeting
              </div>
            )}
          </div>
        </div>

        <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {!messages.length ? (
            <div className="flex h-full min-h-[320px] items-center justify-center">
              <div className="max-w-sm rounded-[24px] border border-dashed border-[#d3dbd4] bg-white/85 px-5 py-5 text-center text-sm leading-6 text-slate-500">
                Ask about decisions, action items, concerns, or reasoning from the transcript.
                <div className="mt-2 text-slate-400">
                  Keep it simple and the assistant will return the answer with sources.
                </div>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      className="rounded-full border border-[#d7ddd8] bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-900"
                      type="button"
                      onClick={() => setQuestion(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <UserMessage text={message.text} createdAt={message.createdAt} />
              </div>
            ) : (
              <div key={message.id} className="flex justify-start">
                <AssistantMessage result={message.result} createdAt={message.createdAt} />
              </div>
            )
          )}

          {loading ? (
            <div className="flex justify-start">
              <div className="rounded-[22px] rounded-tl-md border border-[#d9e3dc] bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                Thinking through the transcript...
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-[#e3e8e4] bg-white/92 px-4 py-3">
          {error ? (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <form className="space-y-2.5" onSubmit={handleSubmit}>
            <textarea
              className="min-h-20 max-h-36 w-full resize-y rounded-2xl border border-[#d7ddd8] bg-[#fbfcfb] px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-700"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Type your question..."
              disabled={loading}
            />

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Answers include citations.
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  disabled={loading || !messages.length}
                  onClick={() => {
                    setMessages([]);
                    setError("");
                  }}
                >
                  Clear
                </button>
                <button
                  className="rounded-2xl bg-emerald-900 px-5 py-3 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </SectionCard>
  );
};

export default ChatSection;
