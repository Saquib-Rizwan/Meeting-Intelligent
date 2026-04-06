import { useEffect, useState } from "react";

import { processMeeting } from "../lib/api.js";
import SectionCard from "./SectionCard.jsx";

const ProcessSection = ({ initialMeetingId = "" }) => {
  const [meetingId, setMeetingId] = useState(initialMeetingId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    setMeetingId(initialMeetingId || "");
  }, [initialMeetingId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!meetingId.trim()) {
      setError("Meeting ID is required.");
      return;
    }

    setLoading(true);
    setError("");
    setStatusMessage("Processing meeting...");

    try {
      const response = await processMeeting(meetingId.trim());
      setResult(response.data);
      setStatusMessage("Insights ready.");
    } catch (requestError) {
      setError(requestError.message);
      setStatusMessage("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Process Transcript" description="Run extraction, sentiment analysis, and transcript chunk generation for a meeting.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-700">
          Meeting ID
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-300"
            type="text"
            value={meetingId}
            onChange={(event) => setMeetingId(event.target.value)}
            placeholder="Enter a meeting ID"
          />
        </label>

        <button
          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Processing..." : "Process Meeting"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {statusMessage && !error ? <p className="mt-4 text-sm font-medium text-indigo-700">{statusMessage}</p> : null}

      {result ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          <div className="font-bold">Insights ready</div>
          <div className="mt-1">Status: {result.processingStatus}</div>
          <div className="mt-1 text-emerald-800">{result.insight?.summary || "Meeting processed successfully."}</div>
        </div>
      ) : null}
    </SectionCard>
  );
};

export default ProcessSection;
