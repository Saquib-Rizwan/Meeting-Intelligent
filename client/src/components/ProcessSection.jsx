import { useEffect, useState } from "react";

import { processMeeting } from "../lib/api.js";
import SectionCard from "./SectionCard.jsx";

const ProcessSection = ({ initialMeetingId = "", onProcessed }) => {
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
      onProcessed?.(response.data);
    } catch (requestError) {
      setError(requestError.message);
      setStatusMessage("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Processing Control" description="Re-run extraction for a meeting when you want to refresh insights.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-700">
          Meeting ID
          <input
            className="mt-1 w-full rounded-xl border border-[#d7ddd8] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-700"
            type="text"
            value={meetingId}
            onChange={(event) => setMeetingId(event.target.value)}
            placeholder="Enter a meeting ID"
          />
        </label>

        <button
          className="rounded-xl bg-emerald-900 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Processing..." : "Process Meeting"}
        </button>
      </form>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {statusMessage && !error ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {statusMessage}
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          <div className="font-bold">Insights ready</div>
          <div className="mt-1">Status: {result.processingStatus}</div>
          <div className="mt-1 text-emerald-800">{result.insight?.summary || "Meeting processed successfully."}</div>
        </div>
      ) : null}
    </SectionCard>
  );
};

export default ProcessSection;
