---
name: start-dev
description: >-
  Start reticle local develop environment (FastAPI :8000 + Vite :5173).
  Use when the user asks to start, run, or launch the local dev environment,
  or mentions start-dev skill.
disable-model-invocation: true
---

# Start develop environment

Start the reticle (バディートーク) local stack: API on port 8000 and Vite frontend on port 5173.

## Before starting

1. List the terminals folder and check whether `uvicorn local_server:app` or `npm run dev` is already running.
2. If both are running **and** the Qwen connectivity check below passes, report the URLs and stop.
3. If API is running but Qwen check fails, stop the existing uvicorn and restart API (see below).
4. If only one is running, start the missing process only.
5. If `api/.venv` is missing, tell the user to run first-time setup from `.cursor/rules/project.mdc` (venv, pip install, `.env`).

## Start API (background)

**Important:** API must reach DashScope (Qwen) over HTTPS. When starting via the Shell tool, set `required_permissions: ["full_network"]`. Without it, localhost works but `POST /conversation` fails with `Connection error`.

Run in background (`block_until_ms: 0`):

```bash
cd /Users/tadasuke/Documents/19_cursor/04_reticle/api && source .venv/bin/activate && uvicorn local_server:app --reload --port 8000
```

Poll until Uvicorn logs show the server is running on port 8000, or until `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs` returns a 2xx/3xx.

### Verify Qwen connectivity

After API is up, run (with `required_permissions: ["full_network"]`):

```bash
curl -s -X POST http://localhost:8000/conversation \
  -H 'Content-Type: application/json' \
  -d '{"type":"message","conversationMode":"real","scenarioId":"sns","mode":"translate","realFriendId":"real-0001","englishText":"ping","aiModel":"qwen"}'
```

- **Success:** response contains `"text"` (HTTP 200 JSON).
- **Failure:** `"detail":"Qwen API 呼び出しに失敗しました: Connection error."` — the uvicorn process cannot reach DashScope. Stop it and restart with `full_network`, or tell the user to start API manually in their own terminal:

  ```bash
  cd api && source .venv/bin/activate && uvicorn local_server:app --reload --port 8000
  ```

Also check `api/.env` has a valid `DASHSCOPE_API_KEY` if Qwen still fails after restart.

## Start frontend (background)

Run in background (`block_until_ms: 0`). Network permission is not required for Vite.

```bash
cd /Users/tadasuke/Documents/19_cursor/04_reticle && npm run dev
```

Poll until Vite prints a local URL (usually `http://localhost:5173`).

## Report to user

- API: http://localhost:8000
- App: http://localhost:5173
- Admin (character images): http://localhost:5173/admin/character-images

If either process failed to start, or Qwen connectivity check failed, include the error output and what to fix.
