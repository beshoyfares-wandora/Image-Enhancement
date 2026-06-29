# AI Ecommerce Image Enhancer

A local, single-user desktop web app that turns a raw product photo into
polished ecommerce imagery.

1. Upload one product image.
2. **Claude Opus** analyses it and writes an editing prompt.
3. The original image + prompt are sent to **Gemini 3 Pro ("Nano Banana")** and
   **GPT Image 2** in parallel.
4. The original and both enhanced results are shown side by side, each
   downloadable.

All model calls are routed through [Requesty](https://requesty.ai). No
authentication, everything runs on your machine.

## Tech stack

| Layer    | Stack                                                        |
| -------- | ----------------------------------------------------------- |
| Frontend | React + Vite + TypeScript + TailwindCSS                     |
| Backend  | Node.js + Express + TypeScript (clean architecture)         |
| AI       | Claude Opus, Gemini 3 Pro, GPT Image 2 — all via Requesty   |
| Tooling  | npm workspaces (monorepo)                                   |

## Project structure

```
image-enhancer/
├── package.json            # npm workspaces root + dev scripts
├── backend/                # Express API (clean architecture)
│   └── src/
│       ├── domain/         # Entities + service interfaces (no dependencies)
│       ├── application/    # Use cases (business orchestration)
│       ├── infrastructure/ # Requesty AI adapters
│       ├── interfaces/http # Controllers, routes, middleware, validation
│       ├── composition/    # Dependency wiring (composition root)
│       ├── config/         # Validated environment config
│       └── shared/         # Logger, errors
└── frontend/               # React + Vite app
    └── src/
        ├── components/     # UI components
        ├── hooks/          # useImageEnhancer
        ├── services/       # API client
        ├── types/          # Shared types
        ├── utils/          # File helpers
        └── config/         # Public env access
```

The backend follows clean architecture: dependencies point inward. `domain`
knows nothing about Express or Requesty; `application` depends only on domain
interfaces; `infrastructure` and `interfaces` implement those interfaces and are
wired together in `composition/container.ts`.

## Getting started

### 1. Install dependencies (from the repo root)

```bash
npm install
```

This installs both workspaces at once.

### 2. Configure environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Frontend
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` and set your Requesty API key (and adjust model slugs to
match what's available in your Requesty account):

```
REQUESTY_API_KEY=your_requesty_api_key_here
CLAUDE_PROMPT_MODEL=anthropic/claude-opus-4-20250514
GEMINI_IMAGE_MODEL=google/gemini-3-pro-image
GPT_IMAGE_MODEL=openai/gpt-image-2
```

### 3. Run both apps in dev mode (from the repo root)

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:4000 (health check at `/api/health`)

The Vite dev server proxies `/api` to the backend, so no CORS setup is needed
during development.

### Run individually

```bash
npm run dev:backend
npm run dev:frontend
```

## Build for production

```bash
npm run build          # builds backend + frontend
npm run start          # serves the built backend
npm run preview --workspace frontend   # preview the built frontend
```

## API

### `POST /api/enhance`

Request:

```json
{ "image": "data:image/png;base64,<...>" }
```

Response:

```json
{
  "prompt": "Studio-lit product hero shot on seamless white...",
  "results": [
    { "provider": "gemini", "model": "google/gemini-3-pro-image", "image": "data:image/png;base64,...", "error": null },
    { "provider": "gpt-image", "model": "openai/gpt-image-2", "image": "data:image/png;base64,...", "error": null }
  ]
}
```

Individual provider failures are returned per-result (with `image: null` and an
`error` message) rather than failing the whole request.

## Notes

- The Requesty model slugs in `.env.example` are placeholders matching the names
  in the project brief. Update them to the exact identifiers your Requesty
  account exposes.
- The image enhancers call Requesty's OpenAI-compatible chat completions
  endpoint with image output. If a provider uses a different image API shape,
  adjust `backend/src/infrastructure/ai/ChatImageEnhancer.ts`.
```
