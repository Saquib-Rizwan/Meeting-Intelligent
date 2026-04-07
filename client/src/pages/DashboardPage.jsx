import { useEffect, useMemo, useState } from "react";

import AppShell from "../components/AppShell.jsx";
import GlobalInsightsPanel from "../components/GlobalInsightsPanel.jsx";
import MeetingSelectionList from "../components/MeetingSelectionList.jsx";
import SelectedMeetingWorkspace from "../components/SelectedMeetingWorkspace.jsx";
import UploadSection from "../components/UploadSection.jsx";
import { getGlobalInsights, getMeetingById, listMeetings } from "../lib/api.js";
import { formatSentimentRating } from "../lib/display.js";

const DashboardPage = () => {
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [meetingsError, setMeetingsError] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loadingSelectedMeeting, setLoadingSelectedMeeting] = useState(false);
  const [selectedMeetingError, setSelectedMeetingError] = useState("");
  const [globalInsights, setGlobalInsights] = useState(null);
  const [loadingGlobalInsights, setLoadingGlobalInsights] = useState(true);
  const [globalInsightsError, setGlobalInsightsError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const loadMeetings = async () => {
    setLoadingMeetings(true);
    setMeetingsError("");

    try {
      const response = await listMeetings();
      const nextMeetings = response.data || [];

      setMeetings(nextMeetings);

      if (!selectedMeetingId && nextMeetings[0]?._id) {
        setSelectedMeetingId(nextMeetings[0]._id);
      }
    } catch (error) {
      setMeetingsError(error.message);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const loadSelectedMeeting = async (meetingId) => {
    if (!meetingId) {
      setSelectedMeeting(null);
      setSelectedMeetingError("");
      return;
    }

    setLoadingSelectedMeeting(true);
    setSelectedMeetingError("");

    try {
      const response = await getMeetingById(meetingId);
      setSelectedMeeting(response.data || null);
    } catch (error) {
      setSelectedMeeting(null);
      setSelectedMeetingError(error.message);
    } finally {
      setLoadingSelectedMeeting(false);
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

  useEffect(() => {
    loadSelectedMeeting(selectedMeetingId);
  }, [selectedMeetingId]);

  const handleUploaded = (createdMeetings) => {
    const firstMeetingId = createdMeetings?.[0]?._id || "";

    if (firstMeetingId) {
      setSelectedMeetingId(firstMeetingId);
      setStatusMessage(`Meeting uploaded and selected: ${createdMeetings[0].title}`);
    }

    loadMeetings();
    loadGlobalInsights();
  };

  const handleProcessed = (meeting) => {
    if (meeting?._id) {
      setSelectedMeetingId(meeting._id);
      setStatusMessage(`Insights refreshed for ${meeting.title}.`);
      loadSelectedMeeting(meeting._id);
      loadMeetings();
      loadGlobalInsights();
    }
  };

  const selectedMeetingSummary = useMemo(() => {
    if (!selectedMeeting) {
      return "Select a meeting from the list to work on one meeting at a time.";
    }

    return selectedMeeting?.insight?.summary || selectedMeeting?.summary || "Meeting selected.";
  }, [selectedMeeting]);

  const dashboardMetrics = useMemo(() => {
    const totalMeetings = meetings.length;
    const totalActionItems = meetings.reduce((sum, meeting) => sum + (meeting.actionItemsCount || 0), 0);
    const totalDecisions = meetings.reduce((sum, meeting) => sum + (meeting.decisionsCount || 0), 0);
    const averageSentiment = totalMeetings
      ? meetings.reduce((sum, meeting) => sum + (meeting.averageSentiment || 0), 0) / totalMeetings
      : 0;

    return {
      totalMeetings,
      totalActionItems,
      totalDecisions,
      averageSentiment
    };
  }, [meetings]);

  return (
    <AppShell title="Meeting Hub" subtitle="Meeting-first workspace" assistantPanel={null}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {statusMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
            <div className="font-bold">Workspace updated</div>
            <div className="mt-1">{statusMessage}</div>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[var(--panel-border)] bg-white px-5 py-5 shadow-[var(--panel-shadow)]">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Meetings</div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{dashboardMetrics.totalMeetings}</div>
            <div className="mt-1 text-sm text-slate-500">Uploaded meeting records in the workspace.</div>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-white px-5 py-5 shadow-[var(--panel-shadow)]">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Action Items</div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{dashboardMetrics.totalActionItems}</div>
            <div className="mt-1 text-sm text-slate-500">Tracked follow-ups extracted across meetings.</div>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-white px-5 py-5 shadow-[var(--panel-shadow)]">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Decisions</div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{dashboardMetrics.totalDecisions}</div>
            <div className="mt-1 text-sm text-slate-500">Confirmed decisions available for review or export.</div>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-white px-5 py-5 shadow-[var(--panel-shadow)]">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Overall Sentiment</div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {formatSentimentRating(dashboardMetrics.averageSentiment)}
            </div>
            <div className="mt-1 text-sm text-slate-500">Weighted view of team tone across uploaded meetings.</div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.78fr,1.22fr]">
          <div className="space-y-6">
            <UploadSection onUploaded={handleUploaded} />
            <MeetingSelectionList
              meetings={meetings}
              loading={loadingMeetings}
              error={meetingsError}
              selectedMeetingId={selectedMeetingId}
              onRefresh={loadMeetings}
              onSelect={setSelectedMeetingId}
            />
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--panel-border)] bg-white px-6 py-5 shadow-[var(--panel-shadow)]">
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Selected Meeting
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {selectedMeeting?.title || "No meeting selected"}
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {selectedMeetingSummary}
              </p>
            </div>

            <SelectedMeetingWorkspace
              meeting={selectedMeeting}
              loading={loadingSelectedMeeting}
              error={selectedMeetingError}
              onReprocessed={handleProcessed}
            />
          </div>
        </div>

        <GlobalInsightsPanel
          insights={globalInsights}
          loading={loadingGlobalInsights}
          error={globalInsightsError}
          onRefresh={loadGlobalInsights}
        />
      </div>
    </AppShell>
  );
};

export default DashboardPage;
