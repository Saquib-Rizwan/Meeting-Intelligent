# Architecture Notes

## Backend

- `controllers/`: request/response orchestration
- `models/`: MongoDB data models
- `routes/`: REST endpoint definitions
- `services/`: parsing, intelligence, storage, and caching services
- `middlewares/`: centralized error handling and request guards
- `utils/`: reusable helpers

## Frontend

- `components/`: reusable UI blocks
- `pages/`: route-level screens
- `features/`: domain-level UI and API adapters
- `lib/`: low-level utilities and HTTP client

## Core Processing Flow

1. Upload transcript files
2. Parse transcript into normalized utterances with timestamps
3. Store transcript and metadata
4. Run local intelligence pipeline for summary, decisions, action items, and sentiment
5. Build transcript chunks for semantic-style retrieval and timeline jump
6. Support chat with citations using local retrieval over stored chunks
