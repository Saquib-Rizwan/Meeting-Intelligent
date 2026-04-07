import { API_BASE_URL } from "./config.js";

const parseResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Request failed");
  }

  return payload;
};

const request = async (url, options) => {
  try {
    const response = await fetch(url, options);
    return await parseResponse(response);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Unable to reach the API. Check that the server is running and the API URL is correct.");
    }

    throw error;
  }
};

export const getMeetingExportUrl = (meetingId) => `${API_BASE_URL}/api/meetings/${meetingId}/export`;
export const getMeetingReportUrl = (meetingId) =>
  `${API_BASE_URL}/api/meetings/${meetingId}/export/report`;

export const getGlobalInsights = async () => {
  return request(`${API_BASE_URL}/api/insights/global`);
};

export const listMeetings = async () => {
  return request(`${API_BASE_URL}/api/meetings`);
};

export const getMeetingById = async (meetingId) => {
  return request(`${API_BASE_URL}/api/meetings/${meetingId}`);
};

export const uploadMeetings = async ({ files, titlePrefix }) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("transcripts", file);
  });

  if (titlePrefix) {
    formData.append("titlePrefix", titlePrefix);
  }

  return request(`${API_BASE_URL}/api/meetings/upload`, {
    method: "POST",
    body: formData
  });
};

export const processMeeting = async (meetingId) => {
  return request(`${API_BASE_URL}/api/meetings/${meetingId}/process`, {
    method: "POST"
  });
};

export const deleteMeeting = async (meetingId) => {
  return request(`${API_BASE_URL}/api/meetings/${meetingId}`, {
    method: "DELETE"
  });
};

export const queryChat = async ({ question, meetingId }) => {
  return request(`${API_BASE_URL}/api/chat/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      question,
      meetingId
    })
  });
};
