import assert from "node:assert/strict";

import { transcriptParserService } from "../src/services/parsing/transcript-parser.service.js";
import { meetingAiService } from "../src/services/ai/meeting-ai.service.js";
import { retrievalService } from "../src/services/retrieval/retrieval.service.js";
import { Insight } from "../src/models/insight.model.js";

const runParserTest = () => {
  const transcript = [
    "Alice: We agreed to launch on Friday.",
    "Bob: I will send the final checklist by Thursday."
  ].join("\n");

  const result = transcriptParserService.parseTranscript({
    transcriptFormat: "txt",
    transcriptText: transcript
  });

  assert.equal(result.utterances.length, 2);
  assert.equal(result.utterances[0].speaker, "Alice");
  assert.equal(result.utterances[1].speaker, "Bob");
};

const runExtractionTest = async () => {
  const utterances = [
    {
      utteranceId: "u1",
      speaker: "Alice",
      text: "We agreed to launch the API on Friday."
    },
    {
      utteranceId: "u2",
      speaker: "Bob",
      text: "Bob will send the final checklist by Thursday."
    }
  ];

  const result = await meetingAiService.processMeeting({ utterances });

  assert.ok(result.summary);
  assert.ok(result.decisions.length >= 1);
  assert.ok(result.actionItems.length >= 1);
  assert.match(result.decisions[0].text, /launch|agreed|decision/i);
  assert.match(result.actionItems[0].task, /checklist|follow up|send/i);
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

const run = async () => {
  const tests = [
    ["parser", runParserTest],
    ["extraction", runExtractionTest],
    ["retrieval", runRetrievalTest]
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
