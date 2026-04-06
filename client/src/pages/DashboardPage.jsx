import { useEffect, useMemo, useState } from "react";

import AppShell from "../components/AppShell.jsx";
import ChatSection from "../components/ChatSection.jsx";
import GlobalInsightsPanel from "../components/GlobalInsightsPanel.jsx";
import MeetingSummaryCard from "../components/MeetingSummaryCard.jsx";
import MeetingsOverview from "../components/MeetingsOverview.jsx";
import MetricCard from "../components/MetricCard.jsx";
import ProcessSection from "../components/ProcessSection.jsx";
import UploadSection from "../components/UploadSection.jsx";
import { getGlobalInsights, listMeetings } from "../lib/api.js";

const DashboardPage = () => {
  const [latestMeetingId, setLatestMeetingId] = useState("");
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [meetingsError, setMeetingsError] = useState("");
  const [globalInsights, setGlobalInsights] = useState(null);
  const [loadingGlobalInsights, setLoadingGlobalInsights] = useState(true);
  const [globalInsightsError, setGlobalInsightsError] = useState("");
  const [latestProcessedMeeting, setLatestProcessedMeeting] = useState(null);

  const loadMeetings = async () => {
    setLoadingMeetings(true);
    setMeetingsError("");

    try {
      const response = await listMeetings();
      const nextMeetings = response.data || [];

      setMeetings(nextMeetings);

      if (!latestMeetingId && nextMeetings[0]?._id) {
        setLatestMeetingId(nextMeetings[0]._id);
      }
    } catch (error) {
      setMeetingsError(error.message);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const loadGlobalInsights = async () => {
    setLoadingGlobalInsights(true);
    setGlobalInsightsError("");

    try {
      const response = await getGlobalInsights();
      setGlobalInsights(response);
    } catch (error) {
      setGlobalInsightsError(error.message);
    } finally {
      setLoadingGlobalInsights(false);
    }
  };

  useEffect(() => {
    loadMeetings();
    loadGlobalInsights();
  }, []);

  const handleUploaded = (createdMeetings) => {
    const firstMeetingId = createdMeetings?.[0]?._id || "";

    if (firstMeetingId) {
      setLatestMeetingId(firstMeetingId);
    }

    setLatestProcessedMeeting(createdMeetings?.[0] || null);

    loadMeetings();
    loadGlobalInsights();
  };

  const totals = useMemo(() => {
    const totalMeetings = meetings.length;
    const totalActions = meetings.reduce((sum, meeting) => sum + (meeting.actionItemsCount || 0), 0);
    const totalDecisions = meetings.reduce((sum, meeting) => sum + (meeting.decisionsCount || 0), 0);
    const averageSentiment = totalMeetings
      ? meetings.reduce((sum, meeting) => sum + (meeting.averageSentiment || 0), 0) / totalMeetings
      : 0;

    return {
      totalMeetings,
      totalActions,
      totalDecisions,
      averageSentiment: averageSentiment.toFixed(2)
    };
  }, [meetings]);

  return (
    <AppShell
      title="Meeting Analyzer"
      subtitle="Dashboard Overview"
      assistantPanel={<ChatSection initialMeetingId={latestMeetingId} title="" description="" compact />}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <UploadSection onUploaded={handleUploaded} />

        {latestProcessedMeeting ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
            <div className="font-bold">Insights ready</div>
            <div className="mt-1">
              {latestProcessedMeeting.title} has been uploaded, processed, and added to chat/search.
            </div>
          </div>
        ) : null}

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Analyzed" value={totals.totalMeetings} hint="Meetings in workspace" />
          <MetricCard label="Pending Items" value={totals.totalActions} hint="Action items tracked" />
          <MetricCard label="Decisions Made" value={totals.totalDecisions} hint="Structured decisions extracted" />
          <MetricCard label="Sentiment Avg" value={totals.averageSentiment} hint="Cross-meeting sentiment score" />
        </section>

        <div className="grid gap-8 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <GlobalInsightsPanel
              insights={globalInsights}
              loading={loadingGlobalInsights}
              error={globalInsightsError}
              onRefresh={loadGlobalInsights}
            />
          </div>

          <div className="xl:col-span-5">
            <MeetingsOverview
              meetings={meetings}
              loading={loadingMeetings}
              error={meetingsError}
              onRefresh={loadMeetings}
            />
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.1fr,0.9fr]">
          <ProcessSection initialMeetingId={latestMeetingId} />
          <div className="space-y-8">
            <MeetingSummaryCard meeting={latestProcessedMeeting} />
            <div className="xl:hidden">
              <ChatSection initialMeetingId={latestMeetingId} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default DashboardPage;
