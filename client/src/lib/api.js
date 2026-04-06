const API_BASE_URL = "http://localhost:5000";

const parseResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Request failed");
  }

  return payload;
};

export const getMeetingExportUrl = (meetingId) => `${API_BASE_URL}/api/meetings/${meetingId}/export`;

export const getGlobalInsights = async () => {
  const response = await fetch(`${API_BASE_URL}/api/insights/global`);
  return parseResponse(response);
};

export const listMeetings = async () => {
  const response = await fetch(`${API_BASE_URL}/api/meetings`);
  return parseResponse(response);
};

export const getMeetingById = async (meetingId) => {
  const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}`);
  return parseResponse(response);
};

export const uploadMeetings = async ({ files, titlePrefix }) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("transcripts", file);
  });

  if (titlePrefix) {
    formData.append("titlePrefix", titlePrefix);
  }

  const response = await fetch(`${API_BASE_URL}/api/meetings/upload`, {
    method: "POST",
    body: formData
  });

  return parseResponse(response);
};

export const processMeeting = async (meetingId) => {
  const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}/process`, {
    method: "POST"
  });

  return parseResponse(response);
};

export const queryChat = async ({ question, meetingId }) => {
  const response = await fetch(`${API_BASE_URL}/api/chat/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      question,
      meetingId
    })
  });

  return parseResponse(response);
};
