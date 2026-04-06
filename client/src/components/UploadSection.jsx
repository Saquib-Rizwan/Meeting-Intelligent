import { useState } from "react";

import { uploadMeetings } from "../lib/api.js";
import SectionCard from "./SectionCard.jsx";

const UploadSection = ({ onUploaded }) => {
  const [files, setFiles] = useState([]);
  const [titlePrefix, setTitlePrefix] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!files.length) {
      setError("Select at least one .txt or .vtt transcript file.");
      return;
    }

    setLoading(true);
    setError("");
    setStatusMessage("Uploading transcripts and processing insights...");

    try {
      const response = await uploadMeetings({ files, titlePrefix });
      const meetings = response.data || [];

      setResult(meetings);
      setStatusMessage(
        meetings.length
          ? `Insights ready for ${meetings.length} meeting${meetings.length === 1 ? "" : "s"}.`
          : "Upload completed."
      );
      onUploaded?.(meetings);
    } catch (requestError) {
      setError(requestError.message);
      setStatusMessage("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Upload Meeting Recording" description="Drop transcript files here and create searchable meeting records.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center transition-colors hover:border-indigo-300">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-xl font-bold text-indigo-600">
            UP
          </div>
          <h3 className="text-xl font-bold text-slate-900">Upload meeting transcripts</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Use TXT or VTT transcripts. The system will parse speakers, process insights, and prepare chat-ready chunks.
          </p>

          <div className="mx-auto mt-6 max-w-xl space-y-4 text-left">
            <label className="block text-sm font-medium text-slate-700">
              Title Prefix
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-300"
                type="text"
                value={titlePrefix}
                onChange={(event) => setTitlePrefix(event.target.value)}
                placeholder="Optional prefix for uploaded meetings"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Transcript Files
              <input
                className="mt-1 block w-full text-sm text-slate-700"
                type="file"
                multiple
                accept=".txt,.vtt"
                disabled={loading}
                onChange={(event) => setFiles(Array.from(event.target.files || []))}
              />
            </label>
          </div>

          <button
            className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Processing meeting..." : "Select Files and Upload"}
          </button>
        </div>
      </form>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {statusMessage && !error ? <p className="mt-4 text-sm font-medium text-indigo-700">{statusMessage}</p> : null}

      {result.length ? (
        <div className="mt-5 space-y-3 text-sm text-slate-700">
          <p className="font-bold text-emerald-700">Insights ready</p>
          {result.map((meeting) => (
            <div key={meeting._id} className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="font-semibold text-slate-900">{meeting.title}</div>
              <div className="mt-1 text-xs text-slate-500">Meeting ID: {meeting._id}</div>
              <div className="mt-1 text-xs text-slate-500">
                Decisions: {meeting.insight?.decisions?.length || 0} | Action items: {meeting.insight?.actionItems?.length || 0}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </SectionCard>
  );
};

export default UploadSection;
