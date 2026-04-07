import { useEffect, useMemo, useRef, useState } from "react";

import { uploadMeetings } from "../lib/api.js";
import SectionCard from "./SectionCard.jsx";

const detectMeetingDate = (value) => {
  const source = String(value || "");
  const match =
    source.match(/\b(20\d{2})[-_](\d{2})[-_](\d{2})\b/) ||
    source.match(/\b(\d{2})[-_](\d{2})[-_](20\d{2})\b/);

  if (!match) {
    return "Date not detected";
  }

  const yearFirst = match[1].length === 4;
  const year = yearFirst ? match[1] : match[3];
  const month = yearFirst ? match[2] : match[2];
  const day = yearFirst ? match[3] : match[1];
  const parsed = new Date(`${year}-${month}-${day}`);

  if (Number.isNaN(parsed.getTime())) {
    return "Date not detected";
  }

  return parsed.toLocaleDateString();
};

const countWords = (value) =>
  String(value || "")
    .replace(/WEBVTT/gi, " ")
    .replace(/\d{2}:\d{2}(?::\d{2})?\.\d{3}\s+-->\s+\d{2}:\d{2}(?::\d{2})?\.\d{3}/g, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

const UploadSection = ({ onUploaded }) => {
  const [files, setFiles] = useState([]);
  const [titlePrefix, setTitlePrefix] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!loading) {
      setUploadProgress((current) => (current === 100 ? current : 0));
      return undefined;
    }

    const interval = window.setInterval(() => {
      setUploadProgress((current) => {
        if (current >= 92) {
          return current;
        }

        return current + (current < 40 ? 12 : current < 70 ? 7 : 3);
      });
    }, 180);

    return () => window.clearInterval(interval);
  }, [loading]);

  const selectedFileSummaries = useMemo(
    () =>
      files.map((file) => ({
        name: file.name,
        estimatedDate: detectMeetingDate(file.name),
        extension: file.name.split(".").pop()?.toUpperCase() || "FILE",
        sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`
      })),
    [files]
  );

  const handleFileSelection = (nextFiles) => {
    setFiles(nextFiles);
    setError("");
  };

  const handleRemoveSelectedFile = (fileName) => {
    setFiles((current) => current.filter((file) => file.name !== fileName));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!files.length) {
      setError("Select at least one .txt or .vtt transcript file.");
      return;
    }

    setLoading(true);
    setError("");
    setUploadProgress(12);
    setStatusMessage("Uploading transcripts and processing insights...");

    try {
      const response = await uploadMeetings({ files, titlePrefix });
      const meetings = response.data || [];

      setResult(meetings);
      setUploadProgress(100);
      setStatusMessage(
        meetings.length
          ? `Insights ready for ${meetings.length} meeting${meetings.length === 1 ? "" : "s"}.`
          : "Upload completed."
      );
      onUploaded?.(meetings);
    } catch (requestError) {
      setError(requestError.message);
      setStatusMessage("");
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelection(Array.from(event.dataTransfer.files || []));
  };

  return (
    <SectionCard title="Upload Meeting Recording" description="Drop transcript files here and create searchable meeting records.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div
          className={`rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            isDragging
              ? "border-emerald-500 bg-emerald-50"
              : "border-[#d7ddd8] bg-[#f3f4f2] hover:border-emerald-300"
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (event.currentTarget.contains(event.relatedTarget)) {
              return;
            }
            setIsDragging(false);
          }}
          onDrop={handleDrop}
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-800">
            UP
          </div>
          <h3 className="text-xl font-bold tracking-tight text-slate-900">Upload meeting transcripts</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Drag files in or browse for TXT and VTT transcripts. The system will parse speakers, process insights, and prepare chat-ready chunks.
          </p>

          <div className="mx-auto mt-6 max-w-xl space-y-4 text-left">
            <label className="block text-sm font-medium text-slate-700">
              Title Prefix
              <input
                className="mt-1 w-full rounded-xl border border-[#d7ddd8] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-700"
                type="text"
                value={titlePrefix}
                onChange={(event) => setTitlePrefix(event.target.value)}
                placeholder="Optional prefix for uploaded meetings"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Transcript Files
              <input
                ref={fileInputRef}
                className="mt-1 block w-full text-sm text-slate-700"
                type="file"
                multiple
                accept=".txt,.vtt"
                disabled={loading}
                onChange={(event) => handleFileSelection(Array.from(event.target.files || []))}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              Browse files
            </button>
            <button
              className="rounded-xl bg-emerald-900 px-6 py-3 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? "Processing meeting..." : "Upload and Process"}
            </button>
          </div>

          {loading ? (
            <div className="mx-auto mt-6 max-w-xl text-left">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <span>Upload progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-700 via-emerald-500 to-lime-400 transition-[width] duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
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

      {selectedFileSummaries.length && !loading ? (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
              Ready to upload
            </div>
            <button
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
              type="button"
              onClick={() => setFiles([])}
            >
              Clear all
            </button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {selectedFileSummaries.map((file) => (
              <div key={file.name} className="rounded-2xl border border-[#e1e6e2] bg-[#f8faf8] px-4 py-4 text-sm text-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">{file.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{file.sizeLabel}</div>
                  </div>
                  <div className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    {file.extension}
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500">Detected date: {file.estimatedDate}</div>
                <div className="mt-3 flex justify-end">
                  <button
                    className="text-xs font-semibold text-rose-700 hover:underline"
                    type="button"
                    onClick={() => handleRemoveSelectedFile(file.name)}
                  >
                    Remove file
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {result.length ? (
        <div className="mt-5 space-y-3 text-sm text-slate-700">
          <p className="font-bold text-emerald-700">Insights ready</p>
          {result.map((meeting) => (
            <div key={meeting._id} className="rounded-2xl border border-[#dfe5e0] bg-slate-50 px-4 py-4">
              <div className="font-semibold text-slate-900">{meeting.title}</div>
              <div className="mt-1 text-xs text-slate-500">Meeting ID: {meeting._id}</div>
              <div className="mt-4 grid gap-3 text-xs text-slate-600 md:grid-cols-4">
                <div className="rounded-xl bg-white px-3 py-3">
                  <div className="font-bold uppercase tracking-[0.12em] text-slate-400">Date</div>
                  <div className="mt-1 text-slate-900">
                    {detectMeetingDate(meeting.sourceFileName || meeting.title || "")}
                  </div>
                </div>
                <div className="rounded-xl bg-white px-3 py-3">
                  <div className="font-bold uppercase tracking-[0.12em] text-slate-400">Speakers</div>
                  <div className="mt-1 text-slate-900">{meeting.transcript?.stats?.speakerCount || meeting.transcript?.speakers?.length || 0}</div>
                </div>
                <div className="rounded-xl bg-white px-3 py-3">
                  <div className="font-bold uppercase tracking-[0.12em] text-slate-400">Word Count</div>
                  <div className="mt-1 text-slate-900">{countWords(meeting.transcript?.transcriptText || "")}</div>
                </div>
                <div className="rounded-xl bg-white px-3 py-3">
                  <div className="font-bold uppercase tracking-[0.12em] text-slate-400">Insights</div>
                  <div className="mt-1 text-slate-900">
                    {meeting.insight?.decisions?.length || 0} decisions / {meeting.insight?.actionItems?.length || 0} actions
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </SectionCard>
  );
};

export default UploadSection;
