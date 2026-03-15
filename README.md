# AgencyPro Gen2 Agent

AgencyPro Gen2 is a full-stack AI agent application that combines a chat-first interface with live execution visibility. Users can interact with an autonomous agent through a modern web UI, while the system streams tool activity, authentication prompts, and final responses in real time.

The project is designed around a practical agent workflow:

- A chat interface for user requests
- A live logs panel for tool execution events
- Dynamic app connection flows for third-party integrations
- A backend orchestration loop that selects and executes tools until a final answer is produced

## Overview

The application consists of two main parts:

- `web/`: a Next.js frontend that renders the chat experience and real-time tool logs
- `backend/`: a FastAPI service that runs the agent loop using LangGraph, OpenAI, and Composio

This architecture makes it suitable for building assistant-style internal tools, productivity agents, and multi-tool operator experiences where users need both conversational UX and transparency into what the agent is doing.

## Key Features

- Real-time chat interface powered by the Vercel AI SDK
- Live streamed tool logs alongside the conversation
- LangGraph-based orchestration loop for iterative agent execution
- Composio tool discovery and integration across connected apps
- Dynamic authentication flow when a requested tool requires an external connection
- Approval step for potentially dangerous or write-capable tool actions
- Remote workbench support for more complex tasks that require code execution
- Setup mode fallback when API keys are missing

## Tech Stack

### Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Vercel AI SDK (`ai`, `@ai-sdk/react`)
- Lucide React

### Backend

- Python
- FastAPI
- Uvicorn
- LangGraph
- OpenAI Python SDK
- Composio SDK
- Pydantic
- python-dotenv

## Architecture

### Frontend

The frontend is built with the Next.js App Router and provides a split-screen interface:

- Left panel: chat conversation
- Right panel: live tool execution logs

It uses `useChat` from the Vercel AI SDK and proxies requests through a local Next.js API route to the backend streaming endpoint. The UI also handles:

- auth callback resume flows
- approval prompts for sensitive actions
- collapsible tool log cards
- error and loading states

### Backend

The backend exposes a streaming `/api/chat` endpoint using FastAPI and Server-Sent Events. It emits messages in the Vercel UI Message Stream Protocol format so the frontend can render both assistant responses and structured tool events.

The agent loop is implemented with LangGraph and follows this pattern:

1. Create or recover a tool-router session
2. Ask the LLM for the next action
3. Execute the selected tool
4. Stream logs back to the UI
5. Repeat until a final answer is available or the iteration limit is reached

The backend also includes:

- automatic setup-mode behavior when required credentials are missing
- approval gating for potentially destructive actions
- support for Composio managed connections
- optional remote workbench execution for more advanced tasks

## Repository Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── graph.py
│   │   ├── composio_runtime.py
│   │   ├── schemas.py
│   │   └── utils.py
│   ├── .env.example
│   └── requirements.txt
├── web/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── .env.example
│   └── package.json
└── README.md
```

## Prerequisites

Before running the project locally, make sure you have:

- Python 3.10+ recommended
- Node.js 18+ recommended
- An OpenAI API key
- A Composio API key

## Local Development

### 1. Start the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set the required values in `backend/.env`:

```env
OPENAI_API_KEY=your_openai_key
COMPOSIO_API_KEY=your_composio_key
OPENAI_MODEL=gpt-4.1-mini
DEFAULT_USER_ID=demo-user
TOOLKIT_FILTER=ALL
WORKBENCH_AUTO_OFFLOAD_THRESHOLD=10000
BACKEND_PORT=8000
```

Then run the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

### 2. Start the frontend

```bash
cd web
npm install
cp .env.example .env.local
```

Set the frontend environment variable:

```env
AGENT_BACKEND_URL=http://127.0.0.1:8000
NEXT_PUBLIC_APP_TITLE=AgencyPro Gen2 Agent
```

Then run the frontend:

```bash
npm run dev
```

Open the app at [http://localhost:3000](http://localhost:3000).

## Environment Variables

### Backend

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | API key for OpenAI |
| `COMPOSIO_API_KEY` | Yes | API key for Composio |
| `OPENAI_MODEL` | No | OpenAI model used by the backend |
| `DEFAULT_USER_ID` | No | Fallback user ID for local development |
| `TOOLKIT_FILTER` | No | Comma-separated filter for available toolkits |
| `WORKBENCH_AUTO_OFFLOAD_THRESHOLD` | No | Threshold for remote workbench offloading |
| `BACKEND_PORT` | No | Backend port for local execution |

### Frontend

| Variable | Required | Description |
| --- | --- | --- |
| `AGENT_BACKEND_URL` | Yes | Base URL of the FastAPI backend |
| `NEXT_PUBLIC_APP_TITLE` | No | UI title shown in the frontend |

## API Endpoints

### Backend

- `GET /health`: health and readiness status
- `POST /api/chat`: streaming chat endpoint for agent execution

## Development Notes

- If credentials are missing, the backend enters setup mode and returns a guidance response instead of running the agent.
- Chat-to-session storage is currently in memory. For production use, persistent storage such as Redis or a database should be introduced.
- CORS is currently permissive for development convenience and should be restricted in production.

## Production Considerations

Before deploying to production, consider:

- persisting session state outside process memory
- tightening CORS configuration
- adding authentication and authorization to the app itself
- improving observability around tool calls and failures
- introducing rate limiting and retry policies
- validating Composio toolkit access by environment

## License

Add your project license here if this repository is intended for public or shared use.
