# Intelligent Meeting Hub

Intelligent Meeting Hub transforms raw meeting transcripts into structured, searchable outputs for quick decision review, follow-up tracking, sentiment analysis, and evidence-backed Q&A.

## Problem
Meeting transcripts are long, noisy, and hard to operationalize. Teams need a fast way to turn discussion history into decisions, action items, themes, and trustworthy answers without manually rereading every transcript.

## Solution
This project provides an end-to-end meeting intelligence workflow:
- ingest transcript files
- extract actionable insights
- visualize sentiment and participation
- answer questions with citations
- surface recurring patterns across meetings

## Screenshots
Dashboard preview:

![Dashboard Preview](docs/assets/dashboard-preview.svg)

Meeting detail preview:

![Meeting Detail Preview](docs/assets/meeting-detail-preview.svg)

## Features
- Upload `.txt` and `.vtt` transcripts
- Automatic parsing and processing after upload
- Structured summary, decisions, and action items
- Sentiment timeline and speaker sentiment view
- Explainable chat with supporting evidence and confidence score
- Cross-meeting global insights
- CSV export for meeting actions and decisions
- Lightweight test coverage for parser, extraction, and retrieval

## Tech Stack
- Frontend: React, Vite, Tailwind CSS, React Router
- Backend: Node.js, Express, Mongoose
- Database: MongoDB
- AI: rule-based extraction plus Hugging Face inference APIs

## Architecture
Architecture diagram:

![Architecture Overview](docs/assets/architecture-overview.svg)

Simple flow:
1. Upload transcript
2. Parse utterances and timestamps
3. Store meeting and transcript in MongoDB
4. Extract summary, decisions, action items, sentiment, and chunks
5. Serve dashboard, meeting detail, global insights, and chat APIs
6. Retrieve relevant chunks for evidence-backed answers

## Setup
1. Install dependencies:
```bash
npm install
```
2. Create `server/.env` using `server/.env.example` and set:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/meeting-intelligence-hub
CACHE_TTL_MS=300000
HUGGINGFACE_API_KEY=your_key_here
CLIENT_ORIGIN=http://localhost:5173
```
3. Optionally set the frontend API URL in your client environment:
```env
VITE_API_BASE_URL=http://localhost:5000
```
4. Start the backend:
```bash
npm start
```
5. Start the frontend in a separate terminal:
```bash
npm run dev:client
```

## Build
Frontend production build:
```bash
npm run build:client
```

Backend production start:
```bash
npm start
```

## Demo Steps
1. Upload a transcript file from the dashboard
2. Wait for the “Processing meeting...” and “Insights ready” states
3. Open the meeting detail page
4. Show the meeting summary card, extracted decisions, and action items
5. Show the sentiment timeline and speaker sentiment view
6. Ask a question in chat and highlight the structured answer, citations, and confidence
7. Return to the dashboard and show global insights

Detailed script:
- [Demo Script](docs/demo-script.md)

## Sample Queries
- `Why was the API launch delayed?`
- `What decisions were made about budget approval?`
- `Who owns the next follow-up item?`
- `What concerns are repeating across meetings?`
- `Summarize the main outcome of this meeting.`

## Testing
Run the lightweight validation suite:
```bash
npm run test:server
```

The current tests cover:
- transcript parsing
- extraction output generation
- retrieval relevance
