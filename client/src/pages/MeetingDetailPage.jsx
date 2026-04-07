import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import AppShell from "../components/AppShell.jsx";
import ActionItemsTable from "../components/ActionItemsTable.jsx";
import ChatSection from "../components/ChatSection.jsx";
import DecisionsTable from "../components/DecisionsTable.jsx";
import MeetingSummaryCard from "../components/MeetingSummaryCard.jsx";
import MetricCard from "../components/MetricCard.jsx";
import SectionCard from "../components/SectionCard.jsx";
import SentimentTimeline from "../components/SentimentTimeline.jsx";
import SpeakerSentimentChart from "../components/SpeakerSentimentChart.jsx";
import TasksPanel from "../components/TasksPanel.jsx";
import { deleteMeeting, getMeetingById, getMeetingExportUrl, getMeetingReportUrl } from "../lib/api.js";
import { formatSpeakerLabel } from "../lib/display.js";

const toSentimentRating = (value) => Math.max(0, Math.min(100, Math.round(((value || 0) + 1) * 50)));

const formatDuration = (durationMs) => {
  if (!durationMs) {
    return "No duration";
  }

  return `${Math.max(Math.round(durationMs / 60000), 1)} minutes`;
};

const buildReadableContext = (meeting, citation) => {
  if (!meeting?.transcript?.utterances?.length || !citation) {
    return null;
  }

  const utterances = meeting.transcript.utterances;
  const citationIndex = utterances.findIndex((item) => item.utteranceId === citation.utteranceId);

  if (citationIndex === -1) {
    return {
      focus: {
        speaker: citation.speaker,
        text: citation.snippet,
        startTimeMs: citation.startTimeMs,
        endTimeMs: citation.endTimeMs,
        utteranceId: citation.utteranceId
      },
      surrounding: []
    };
  }

  const start = Math.max(0, citationIndex - 2);
  const end = Math.min(utterances.length, citationIndex + 3);

  return {
    focus: utterances[citationIndex],
    surrounding: utterances.slice(start, end)
  };
};

const buildSegmentContext = (meeting, segment) => {
  if (!meeting?.transcript?.utterances?.length || !segment?.utteranceIds?.length) {
    return null;
  }

  const utterances = meeting.transcript.utterances;
  const indexes = segment.utteranceIds
    .map((utteranceId) => utterances.findIndex((item) => item.utteranceId === utteranceId))
    .filter((index) => index >= 0);

  if (!indexes.length) {
    return null;
  }

  return {
    focus: utterances[indexes[0]],
    surrounding: utterances.slice(Math.max(0, Math.min(...indexes) - 1), Math.min(utterances.length, Math.max(...indexes) + 2))
  };
};

const MeetingDetailPage = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [selectedContext, setSelectedContext] = useState(null);

  useEffect(() => {
    const loadMeeting = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getMeetingById(meetingId);
        const nextMeeting = response.data;
        const nextDecisions = nextMeeting?.decisions || nextMeeting?.insight?.decisions || [];
        const nextActionItems =
          nextMeeting?.actionItems || nextMeeting?.insight?.actionItems || [];
        const normalizedMeeting = {
          ...nextMeeting,
          decisions: nextDecisions,
          actionItems: nextActionItems,
          insight: {
            ...(nextMeeting?.insight || {}),
            decisions: nextDecisions,
            actionItems: nextActionItems
          },
          highlights:
            nextMeeting?.highlights?.length
              ? nextMeeting.highlights
              : [
                  ...nextDecisions.slice(0, 2).map((decision) => decision.text).filter(Boolean),
                  ...nextActionItems.slice(0, 2).map((item) => item.task).filter(Boolean)
                ]
        };
        setMeeting(normalizedMeeting);
        setSelectedSegment(normalizedMeeting?.sentiment?.chunkSentiments?.[0] || null);
        setSelectedContext(nextDecisions[0]?.citations?.[0] || nextActionItems[0]?.citations?.[0] || null);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    };

    loadMeeting();
  }, [meetingId]);

  const sentimentTone = useMemo(() => {
    const score = meeting?.metrics?.averageSentiment || 0;

    if (score > 0.2) {
      return "positive";
    }

    if (score < -0.2) {
      return "negative";
    }

    return "default";
  }, [meeting]);

  const transcriptWordCount = useMemo(() => {
    return String(meeting?.transcript?.transcriptText || "")
      .split(/\s+/)
      .filter(Boolean).length;
  }, [meeting]);

  const sentimentRating = useMemo(
    () => toSentimentRating(meeting?.metrics?.averageSentiment || 0),
    [meeting]
  );

  const contextDetails = useMemo(
    () => buildReadableContext(meeting, selectedContext),
    [meeting, selectedContext]
  );
  const selectedSegmentContext = useMemo(
    () => buildSegmentContext(meeting, selectedSegment),
    [meeting, selectedSegment]
  );
  const selectedSegmentCitation = useMemo(() => {
    const focus = selectedSegmentContext?.focus;

    if (!focus) {
      return null;
    }

    return {
      utteranceId: focus.utteranceId,
      speaker: focus.speaker,
      snippet: focus.text,
      startTimeMs: focus.startTimeMs,
      endTimeMs: focus.endTimeMs
    };
  }, [selectedSegmentContext]);

  const handleDeleteMeeting = async () => {
    const confirmed = window.confirm("Delete this meeting and all extracted insights?");

    if (!confirmed) {
      return;
    }

    await deleteMeeting(meetingId);
    navigate("/meetings");
  };

  return (
    <AppShell
      title="Meeting Hub"
      subtitle="Intelligence Detail"
      assistantPanel={
        <ChatSection
          initialMeetingId={meetingId}
          title=""
          description="Ask direct questions about this meeting."
          compact
          lockMeetingId
        />
      }
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {!loading && meeting ? (
          <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-100/70 px-5 py-3 text-sm text-emerald-950">
            <div className="font-medium">Insights ready: key decisions, action items, and sentiment have been extracted for this meeting.</div>
          </div>
        ) : null}

        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--panel-border)] bg-white p-8 shadow-[var(--panel-shadow)] md:flex-row md:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-900 transition-colors hover:bg-emerald-100"
                to="/meetings"
              >
                Back to All Meetings
              </Link>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Full detail view
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{meeting?.title || "Meeting Details"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {meeting?.createdAt ? new Date(meeting.createdAt).toLocaleDateString() : "Recorded meeting"} • {formatDuration(meeting?.transcript?.stats?.durationMs)} • {meeting?.transcript?.speakers?.length || 0} participants
            </p>
          </div>
          <div className="flex items-center gap-3">
            {meetingId ? (
              <a
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                href={getMeetingReportUrl(meetingId)}
                target="_blank"
                rel="noreferrer"
              >
                Export PDF
              </a>
            ) : null}
            {meetingId ? (
              <a className="rounded-xl border border-emerald-800 px-4 py-2.5 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-50" href={getMeetingExportUrl(meetingId)}>
                Export CSV
              </a>
            ) : null}
            <button
              className="rounded-xl border border-rose-200 px-4 py-2.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50"
              type="button"
              onClick={handleDeleteMeeting}
            >
              Delete
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Loading meeting details...
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {!loading && !error && !meeting ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            Meeting details are not available yet. Return to the dashboard and process a transcript first.
          </div>
        ) : null}

        {meeting ? (
          <>
            <section className="grid gap-5 md:grid-cols-3">
              <MetricCard label="Transcript Count" value={transcriptWordCount || 0} hint="Words captured" progressPercent={Math.min(100, Math.max(12, Math.round((transcriptWordCount / 2000) * 100)))} />
              <MetricCard label="Action Items" value={meeting.metrics?.actionItemsCount || 0} hint="Open and tracked follow-ups" progressPercent={Math.min(100, Math.max(12, (meeting.metrics?.actionItemsCount || 0) * 20))} />
              <MetricCard label="Meeting Rating" value={`${sentimentRating}/100`} tone={sentimentTone} hint="Overall meeting health based on tone and blockers" progressPercent={sentimentRating} />
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
              <MeetingSummaryCard meeting={meeting} />
              <div className="space-y-6">
                <SectionCard title="Speaker Analytics" description="Most and least active participants.">
                  <div className="space-y-4 text-sm text-slate-700">
                    <div className="rounded-2xl border border-[#e1e6e2] bg-[#f3f4f2] px-4 py-4">
                      <div className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-slate-500">Most Active</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">
                        {formatSpeakerLabel(meeting.speakerAnalytics?.mostActiveSpeaker?.speaker, "-")}
                      </div>
                      <div className="mt-1 text-slate-500">
                        {meeting.speakerAnalytics?.mostActiveSpeaker?.participationPercentage || 0}% talk time
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#e1e6e2] bg-[#f3f4f2] px-4 py-4">
                      <div className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-slate-500">Least Active</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">
                        {formatSpeakerLabel(meeting.speakerAnalytics?.leastActiveSpeaker?.speaker, "-")}
                      </div>
                      <div className="mt-1 text-slate-500">
                        {meeting.speakerAnalytics?.leastActiveSpeaker?.participationPercentage || 0}% talk time
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <TasksPanel
                  actionItems={meeting.insight?.actionItems || []}
                  onViewContext={setSelectedContext}
                />
              </div>
            </div>

            <div className="grid gap-6">
              <ActionItemsTable
                actionItems={meeting.insight?.actionItems || []}
                onViewContext={setSelectedContext}
                activeCitationId={selectedContext?.utteranceId || null}
                contextDetails={contextDetails}
              />
              <DecisionsTable
                decisions={meeting.insight?.decisions || []}
                onViewContext={setSelectedContext}
                activeCitationId={selectedContext?.utteranceId || null}
                contextDetails={contextDetails}
              />
              <SentimentTimeline
                segments={meeting.sentiment?.chunkSentiments || []}
                selectedSegment={selectedSegment}
                onSelect={setSelectedSegment}
                segmentContextDetails={selectedSegmentContext}
                segmentCitation={selectedSegmentCitation}
              />
              <SpeakerSentimentChart speakerSentiments={meeting.sentiment?.speakerSentiments || []} />
            </div>
            <div className="xl:hidden">
              <ChatSection initialMeetingId={meetingId} />
            </div>
            <div className="flex justify-start">
              <Link
                className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                to="/meetings"
              >
                Back to All Meetings
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
};

export default MeetingDetailPage;
