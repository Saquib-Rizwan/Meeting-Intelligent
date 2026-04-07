import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AppShell from "../components/AppShell.jsx";
import SectionCard from "../components/SectionCard.jsx";
import UploadSection from "../components/UploadSection.jsx";

const HomePage = () => {
  const navigate = useNavigate();
  const [lastUploadedMeeting, setLastUploadedMeeting] = useState(null);

  const handleUploaded = (createdMeetings) => {
    const firstMeeting = createdMeetings?.[0] || null;

    if (!firstMeeting?._id) {
      return;
    }

    localStorage.setItem("selectedMeetingId", firstMeeting._id);
    setLastUploadedMeeting(firstMeeting);
  };

  return (
    <AppShell title="Meeting Hub" subtitle="Upload and start">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <SectionCard
          title="Meeting Intelligence, without the clutter"
          description="Upload a transcript here. Then continue to Meetings to work against one meeting at a time."
        >
          <div className="grid gap-5 md:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-2xl border border-[#e1e6e2] bg-[#f7f8f6] px-5 py-5">
              <div className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Recommended flow
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>1. Upload one meeting transcript.</p>
                <p>2. Let the system process insights automatically.</p>
                <p>3. Open Meetings and select that meeting.</p>
                <p>4. Ask questions only in the context of that meeting.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e1e6e2] bg-white px-5 py-5">
              <div className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                After upload
              </div>
              {lastUploadedMeeting ? (
                <div className="mt-4 space-y-3">
                  <div className="text-lg font-bold tracking-tight text-slate-900">
                    {lastUploadedMeeting.title}
                  </div>
                  <div className="text-sm text-slate-500">
                    Uploaded and ready to open in the Meetings section.
                  </div>
                  <button
                    className="rounded-xl bg-emerald-900 px-4 py-2 text-sm font-bold text-white"
                    type="button"
                    onClick={() => navigate("/meetings")}
                  >
                    Go to Meetings
                  </button>
                </div>
              ) : (
                <div className="mt-4 text-sm text-slate-500">
                  Upload your first meeting to begin.
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <UploadSection onUploaded={handleUploaded} />

        <div className="flex items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-white px-5 py-4 shadow-[var(--panel-shadow)]">
          <div>
            <div className="text-sm font-bold text-slate-900">Already uploaded meetings?</div>
            <div className="mt-1 text-sm text-slate-500">
              Open the Meetings section to select a meeting and ask questions there.
            </div>
          </div>
          <Link className="rounded-xl bg-emerald-900 px-4 py-2 text-sm font-bold text-white" to="/meetings">
            Open Meetings
          </Link>
        </div>
      </div>
    </AppShell>
  );
};

export default HomePage;
