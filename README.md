# Intelligent Meeting Hub

## Problem
Teams generate large volumes of meeting transcripts, but the useful outputs are usually buried inside raw text. Important decisions, follow-ups, blockers, and sentiment signals are hard to recover quickly during execution, reviews, and demos.

## Solution
Intelligent Meeting Hub turns raw meeting transcripts into a structured, searchable workspace. Users can upload transcript files, process them into insights, review decisions and action items, inspect sentiment, and ask questions with supporting evidence from the original discussion.

## Features
- Upload `.txt` and `.vtt` meeting transcripts
- Parse speakers, timestamps, and transcript stats
- Extract summaries, decisions, and action items
- Build sentiment timeline and speaker sentiment view
- Chat over one meeting or across meetings with evidence-backed answers
- Surface recurring topics, concerns, and common actions across meetings
- Export structured meeting insights as CSV
- Show a quick meeting summary card for demo-friendly review

## Tech Stack
- Frontend: React, Vite, Tailwind CSS, React Router
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- AI layer: Rule-based extraction plus Hugging Face inference APIs

## Architecture Overview
1. Upload transcript files from the dashboard
2. Parse transcript into normalized utterances
3. Store meeting, transcript, and stats in MongoDB
4. Run extraction pipeline for summary, decisions, action items, sentiment, and retrieval chunks
5. Persist insights and expose them through REST APIs
6. Render dashboard, meeting detail, global insights, and chat UI

## Setup Instructions
1. Install dependencies:
```bash
npm install
```
2. Configure backend environment in `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/meeting-intelligence-hub
CACHE_TTL_MS=300000
HUGGINGFACE_API_KEY=your_key_here
```
3. Start backend:
```bash
npm run dev:server
```
4. Start frontend in a separate terminal:
```bash
npm run dev:client
```
5. Open the Vite client URL shown in the terminal.

## Demo Flow
1. Upload one or more transcript files from the dashboard
2. Wait for automatic processing and confirm the “Insights ready” state
3. Open the meeting detail page
4. Show the meeting summary card, decisions, action items, and sentiment timeline
5. Ask a question in the chat panel and highlight the citations, confidence score, and coverage badges
6. Return to the dashboard and show global insights across meetings

## Lightweight Tests
Run the lightweight validation suite:
```bash
npm run test:server
```

The test script checks:
- transcript parsing
- extraction output generation
- retrieval relevance
