import assert from "node:assert/strict";

import { transcriptParserService } from "../src/services/parsing/transcript-parser.service.js";
import { buildSpeakerStats, meetingAiService } from "../src/services/ai/meeting-ai.service.js";
import { retrievalService } from "../src/services/retrieval/retrieval.service.js";
import { Insight } from "../src/models/insight.model.js";
import { insightExtractionService } from "../src/services/ai/insight-extraction.service.js";
import { huggingFaceProvider } from "../src/services/ai/providers/huggingface.provider.js";
import { chatService } from "../src/services/chat-v2.service.js";
import { queryCacheService } from "../src/services/cache/query-cache.service.js";

const runParserTest = () => {
  const transcript = [
    "[00:10] Alice: Hello",
    "[00:20] Bob: Hi"
  ].join("\n");

  const result = transcriptParserService.parseTranscript({
    transcriptFormat: "txt",
    transcriptText: transcript
  });

  assert.equal(result.utterances.length, 2);
  assert.equal(result.speakers.length, 2);
  assert.equal(result.utterances[0].speaker, "Alice");
  assert.equal(result.utterances[1].speaker, "Bob");
  assert.equal(result.utterances[0].startTimeMs, 10000);
  assert.equal(result.utterances[1].startTimeMs, 20000);
};

const runExtractionTest = async () => {
  const transcript = [
    "[00:10] Alice: Charlie, you will update docs by Friday",
    "[00:20] Bob: I will fix backend by Monday",
    "[00:30] Alice: We agreed to review the API options tomorrow",
    "[00:40] Bob: The final decision is to ship the beta to internal users first"
  ].join("\n");
  const parsed = transcriptParserService.parseTranscript({
    transcriptFormat: "txt",
    transcriptText: transcript
  });
  const utterances = parsed.utterances;

  const result = await meetingAiService.processMeeting({ utterances });
  const speakerTracking = buildSpeakerStats(utterances);

  assert.ok(result.summary);
  assert.equal(result.decisions.length, 1);
  assert.equal(utterances[0].speaker, "Alice");
  assert.equal(utterances[3].speaker, "Bob");
  assert.equal(utterances[0].startTimeMs, 10000);
  assert.equal(utterances[3].startTimeMs, 40000);
  assert.equal(result.actionItems.length, 3);

  const charlieAction = result.actionItems.find((item) => item.owner === "Charlie");
  const bobAction = result.actionItems.find((item) => item.owner === "Bob");

  assert.ok(charlieAction);
  assert.ok(bobAction);
  assert.match(charlieAction.task, /update docs by Friday/i);
  assert.equal(charlieAction.deadline, "by Friday");
  assert.match(bobAction.task, /fix backend by Monday/i);
  assert.equal(bobAction.deadline, "by Monday");
  assert.match(result.decisions[0].text, /ship the beta to internal users first/i);
  assert.ok(
    result.decisions.every((item) => !/\bagreed\b/i.test(item.text)),
    "Decision text should not promote weak agreement language"
  );

  assert.equal(speakerTracking.speakerStats.Alice, 2);
  assert.equal(speakerTracking.speakerStats.Bob, 2);
  assert.equal(speakerTracking.mostActiveSpeaker?.speaker, "Alice");
  assert.equal(speakerTracking.leastActiveSpeaker?.speaker, "Bob");
};

const runRetrievalTest = async () => {
  const originalFind = Insight.find;

  Insight.find = () => ({
    lean: async () => [
      {
        meetingId: "m1",
        transcriptChunks: [
          {
            chunkId: "chunk-1",
            meetingId: "m1",
            text: "The API launch was delayed because QA found a regression bug.",
            keywords: ["api", "launch", "delayed", "qa", "bug"],
            utteranceIds: ["u1"],
            startTimeMs: 1000,
            endTimeMs: 5000,
            speaker: "Alice"
          }
        ]
      }
    ]
  });

  try {
    const results = await retrievalService.searchTranscriptChunks({
      query: "Why was the API launch delayed?",
      meetingId: "m1",
      limit: 3
    });

    assert.equal(results.length, 1);
    assert.equal(results[0].chunkId, "chunk-1");
    assert.ok(results[0].score > 0);
  } finally {
    Insight.find = originalFind;
  }
};

const runWhyRetrievalPrioritizesCauseTest = async () => {
  const originalFind = Insight.find;

  Insight.find = () => ({
    lean: async () => [
      {
        meetingId: "m2",
        transcriptChunks: [
          {
            chunkId: "chunk-1",
            meetingId: "m2",
            text: "We have four topics today: API launch timing, pricing rollout, mobile crash fixes, and customer migration.",
            keywords: ["api", "launch", "timing"],
            utteranceIds: ["u1"],
            startTimeMs: 0,
            endTimeMs: 1000,
            speaker: "Ravi"
          },
          {
            chunkId: "chunk-2",
            meetingId: "m2",
            text: "QA found a regression in token refresh, staging failed twice, and Finance warned the current launch plan could increase support costs by 18 percent.",
            keywords: ["qa", "regression", "token", "support", "costs"],
            utteranceIds: ["u2"],
            startTimeMs: 1000,
            endTimeMs: 2000,
            speaker: "Multiple"
          }
        ]
      }
    ]
  });

  try {
    const results = await retrievalService.searchTranscriptChunks({
      query: "Why was the API launch delayed?",
      meetingId: "m2",
      limit: 2
    });

    assert.equal(results.length, 2);
    assert.equal(results[0].chunkId, "chunk-2");
    assert.match(results[0].text, /token refresh|support costs/i);
  } finally {
    Insight.find = originalFind;
  }
};

const runNoForcedDecisionFallbackTest = async () => {
  const originalSummarizeChunk = huggingFaceProvider.summarizeChunk;
  const transcript = [
    "[00:10] Alice: We agreed to revisit the pricing doc tomorrow",
    "[00:20] Bob: I will send the revised numbers by Monday"
  ].join("\n");

  huggingFaceProvider.summarizeChunk = async () => "";

  try {
    const parsed = transcriptParserService.parseTranscript({
      transcriptFormat: "txt",
      transcriptText: transcript
    });

    const result = await insightExtractionService.extractInsights({
      meetingId: "test-meeting",
      title: "Fallback Safety Test",
      transcriptText: transcript,
      utterances: parsed.utterances
    });

    assert.equal(result.decisions.length, 0);
    assert.ok(result.actionItems.length >= 1);
  } finally {
    huggingFaceProvider.summarizeChunk = originalSummarizeChunk;
  }
};

const runConversationalChatTest = async () => {
  const originalSearchTranscriptChunks = retrievalService.searchTranscriptChunks;
  const originalGenerateGroundedAnswer = huggingFaceProvider.generateGroundedAnswer;

  queryCacheService.clear();

  retrievalService.searchTranscriptChunks = async () => [
    {
      chunkId: "chunk-1",
      meetingId: "m42",
      text: "Priya said the public API launch should be delayed because error rates rose after the latest deployment and support tickets spiked overnight.",
      utteranceIds: ["u-1"],
      startTimeMs: 120000,
      endTimeMs: 180000,
      speaker: "Priya",
      score: 28
    },
    {
      chunkId: "chunk-2",
      meetingId: "m42",
      text: "The team agreed to stabilize the service first and revisit the launch date after the hotfix was verified.",
      utteranceIds: ["u-2"],
      startTimeMs: 181000,
      endTimeMs: 220000,
      speaker: "Maya",
      score: 22
    }
  ];

  huggingFaceProvider.generateGroundedAnswer = async () =>
    "The API launch was delayed because error rates increased after the latest deployment and support tickets jumped, so the team wanted the hotfix verified before launching.";

  try {
    const result = await chatService.answerQuestion({
      question: "Why was the API launch delayed?",
      meetingId: "m42"
    });

    assert.match(result.answer, /error rates increased/i);
    assert.equal(result.answerMode, "generated");
    assert.equal(result.sources.length, 2);
    assert.equal(result.meetingCount, 1);
    assert.equal(result.chunkCount, 2);
    assert.equal(result.fallbackUsed, false);
  } finally {
    retrievalService.searchTranscriptChunks = originalSearchTranscriptChunks;
    huggingFaceProvider.generateGroundedAnswer = originalGenerateGroundedAnswer;
    queryCacheService.clear();
  }
};

const run = async () => {
  const tests = [
    ["parser", runParserTest],
    ["extraction", runExtractionTest],
    ["retrieval", runRetrievalTest],
    ["why-retrieval-prioritizes-cause", runWhyRetrievalPrioritizesCauseTest],
    ["no-forced-decision-fallback", runNoForcedDecisionFallbackTest],
    ["conversational-chat", runConversationalChatTest]
  ];

  for (const [name, testFn] of tests) {
    await testFn();
    console.log(`PASS ${name}`);
  }

  console.log("All lightweight tests passed.");
};

run().catch((error) => {
  console.error("Test run failed.");
  console.error(error);
  process.exit(1);
});
