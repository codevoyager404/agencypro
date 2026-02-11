# AgencyPro Gen2 Agent (LangGraph + Composio + Next.js)

This repo implements the same pattern shown in your screenshot:

- Left panel: chat conversation
- Right panel: live tool logs
- Dynamic auth card: "Connect {App}"
- Backend loop: LangGraph orchestrator with Composio meta-tools and workbench support

## Architecture

### Backend (`/backend`)

- `FastAPI` streaming endpoint (`/api/chat`) that emits **Vercel UI Message Stream Protocol**
- `LangGraph` state machine with loop:
  1. ensure tool-router session
  2. ask LLM for next action
  3. execute selected tool (`COMPOSIO_*` meta-tool or regular tool)
  4. repeat until final answer
- Composio session config:
  - managed connections enabled
  - toolkit filter defaults to `ALL` (search across all apps)
  - workbench auto-offload threshold enabled

### Frontend (`/web`)

- `Next.js` App Router
- `useChat` from Vercel AI SDK
- split layout (`2/3` chat, `1/3` logs)
- collapsible tool cards for each streamed action
- custom auth component when `COMPOSIO_MANAGE_CONNECTIONS` returns an auth URL

## Run

## 1) Backend

```bash
cd /Users/bruce/Documents/agencypro/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# fill OPENAI_API_KEY + COMPOSIO_API_KEY
uvicorn app.main:app --reload --port 8000
```

## 2) Frontend

```bash
cd /Users/bruce/Documents/agencypro/web
npm install
cp .env.example .env.local
npm run dev
```

Open: `http://localhost:3000`

## Env variables

Backend (`/backend/.env`):

- `OPENAI_API_KEY`
- `COMPOSIO_API_KEY`
- `OPENAI_MODEL` (default: `gpt-4.1-mini`)
- `TOOLKIT_FILTER` (default: `ALL`; use comma-separated slugs to restrict)
- `WORKBENCH_AUTO_OFFLOAD_THRESHOLD` (default: `300`)

Frontend (`/web/.env.local`):

- `AGENT_BACKEND_URL` (default: `http://127.0.0.1:8000`)

## Notes

- If API keys are missing, backend enters setup mode and responds with a guidance message.
- Session storage is currently in-memory; for production, persist chat-to-session mapping in Redis or DB.
