import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import ActionItemsTable from "../components/ActionItemsTable.jsx";
import AppShell from "../components/AppShell.jsx";
import ChatSection from "../components/ChatSection.jsx";
import DecisionsTable from "../components/DecisionsTable.jsx";
import InsightsSummaryPanel from "../components/InsightsSummaryPanel.jsx";
import MeetingSummaryCard from "../components/MeetingSummaryCard.jsx";
import MetricCard from "../components/MetricCard.jsx";
import SectionCard from "../components/SectionCard.jsx";
import SentimentTimeline from "../components/SentimentTimeline.jsx";
import SpeakerSentimentChart from "../components/SpeakerSentimentChart.jsx";
import { getMeetingById, getMeetingExportUrl } from "../lib/api.js";

const formatSentiment = (value) => {
  if (value > 0) {
    return `+${value.toFixed(2)}`;
  }

  return value.toFixed(2);
};

const MeetingDetailPage = () => {
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSegment, setSelectedSegment] = useState(null);

  useEffect(() => {
    const loadMeeting = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getMeetingById(meetingId);
        console.log("[MeetingDetailPage] GET /api/meetings/:id response", response);
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

  return (
    <AppShell
      title="Meeting Analyzer"
      subtitle={meeting?.title || "Meeting Details"}
      assistantPanel={<ChatSection initialMeetingId={meetingId} title="" description="" compact />}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-[0_8px_24px_rgba(15,23,42,0.04)] md:flex-row md:items-end">
          <div>
            <Link className="text-sm font-bold text-indigo-600" to="/">
              Back to Dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">{meeting?.title || "Meeting Details"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review decisions, action items, sentiment, and evidence-backed AI answers for this meeting.
            </p>
          </div>
          {meetingId ? (
            <a className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white" href={getMeetingExportUrl(meetingId)}>
              Export CSV
            </a>
          ) : null}
        </div>

        {loading ? <p className="text-sm text-slate-500">Loading meeting details...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {meeting ? (
          <>
            <section className="grid gap-6 md:grid-cols-3">
              <MetricCard label="Transcript Count" value={meeting.metrics?.transcriptCount || 0} hint="Transcript files linked" />
              <MetricCard label="Action Items" value={meeting.metrics?.actionItemsCount || 0} hint="Open and tracked follow-ups" />
              <MetricCard label="Sentiment Score" value={formatSentiment(meeting.metrics?.averageSentiment || 0)} tone={sentimentTone} hint="Average discussion sentiment" />
            </section>

            <MeetingSummaryCard meeting={meeting} />
            <InsightsSummaryPanel meeting={meeting} />

            <section className="grid gap-8 xl:grid-cols-[1.2fr,0.8fr]">
              <SpeakerSentimentChart speakerSentiments={meeting.sentiment?.speakerSentiments || []} />
              <SectionCard title="Speaker Analytics" description="Participation levels across speakers.">
                <div className="space-y-4 text-sm text-slate-700">
                  <div className="rounded-xl bg-slate-50 px-4 py-4">
                    <div className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-slate-500">Most Active</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">
                      {meeting.speakerAnalytics?.mostActiveSpeaker?.speaker || "-"}
                    </div>
                    <div className="mt-1 text-slate-500">
                      {meeting.speakerAnalytics?.mostActiveSpeaker?.participationPercentage || 0}% participation
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-4">
                    <div className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-slate-500">Least Active</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">
                      {meeting.speakerAnalytics?.leastActiveSpeaker?.speaker || "-"}
                    </div>
                    <div className="mt-1 text-slate-500">
                      {meeting.speakerAnalytics?.leastActiveSpeaker?.participationPercentage || 0}% participation
                    </div>
                  </div>
                </div>
              </SectionCard>
            </section>

            <SentimentTimeline
              segments={meeting.sentiment?.chunkSentiments || []}
              selectedSegment={selectedSegment}
              onSelect={setSelectedSegment}
            />

            <DecisionsTable decisions={meeting.insight?.decisions || []} />
            <ActionItemsTable actionItems={meeting.insight?.actionItems || []} />
            <div className="xl:hidden">
              <ChatSection initialMeetingId={meetingId} />
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
};

export default MeetingDetailPage;
