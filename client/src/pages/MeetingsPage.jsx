import { useEffect, useState } from "react";

import AppShell from "../components/AppShell.jsx";
import ChatSection from "../components/ChatSection.jsx";
import MeetingSelectionList from "../components/MeetingSelectionList.jsx";
import SelectedMeetingWorkspace from "../components/SelectedMeetingWorkspace.jsx";
import { getMeetingById, listMeetings } from "../lib/api.js";

const MeetingsPage = () => {
  const [selectedMeetingId, setSelectedMeetingId] = useState(
    () => localStorage.getItem("selectedMeetingId") || ""
  );
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [meetingsError, setMeetingsError] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loadingSelectedMeeting, setLoadingSelectedMeeting] = useState(false);
  const [selectedMeetingError, setSelectedMeetingError] = useState("");

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

  useEffect(() => {
    loadMeetings();
  }, []);

  useEffect(() => {
    if (selectedMeetingId) {
      localStorage.setItem("selectedMeetingId", selectedMeetingId);
    }

    loadSelectedMeeting(selectedMeetingId);
  }, [selectedMeetingId]);

  const handleProcessed = (meeting) => {
    if (meeting?._id) {
      setSelectedMeetingId(meeting._id);
      loadMeetings();
      loadSelectedMeeting(meeting._id);
    }
  };

  const handleDeleted = (deletedMeetingId) => {
    const remainingMeetings = meetings.filter((meeting) => meeting._id !== deletedMeetingId);
    const nextSelectedMeetingId =
      selectedMeetingId === deletedMeetingId ? remainingMeetings[0]?._id || "" : selectedMeetingId;

    setMeetings(remainingMeetings);
    setSelectedMeetingId(nextSelectedMeetingId);

    if (!remainingMeetings.length) {
      setSelectedMeeting(null);
    }
  };

  return (
    <AppShell
      title="Meeting Hub"
      subtitle="Meetings"
      assistantPanel={
        <ChatSection
          initialMeetingId={selectedMeetingId}
          title=""
          description=""
          compact
          lockMeetingId={Boolean(selectedMeetingId)}
        />
      }
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="grid gap-6 xl:grid-cols-[0.78fr,1.22fr]">
          <MeetingSelectionList
            meetings={meetings}
            loading={loadingMeetings}
            error={meetingsError}
            selectedMeetingId={selectedMeetingId}
            onRefresh={loadMeetings}
            onSelect={setSelectedMeetingId}
            onDeleted={handleDeleted}
          />

          <SelectedMeetingWorkspace
            meeting={selectedMeeting}
            loading={loadingSelectedMeeting}
            error={selectedMeetingError}
            onReprocessed={handleProcessed}
          />
        </div>
      </div>
    </AppShell>
  );
};

export default MeetingsPage;
