---
name: start-dev
description: >-
  Start reticle local develop environment (DynamoDB Local :8001 + FastAPI :8000 + Vite :5173).
  User starts Docker Desktop manually; agent runs docker compose, table init, API, and frontend.
  Use when the user asks to start, run, or launch the local dev environment,
  or mentions start-dev skill.
disable-model-invocation: true
---

# Start develop environment

Start the reticle (バディートーク) local stack in this order:

1. **（ユーザー手動）** Docker Desktop の起動のみ
2. **（エージェント）** DynamoDB Local コンテナ起動 + テーブル init
3. **（エージェント）** API (`:8000`)
4. **（エージェント）** Frontend (`:5173`)

Repo root: `/Users/tadasuke/Documents/19_cursor/04_reticle`

## 重要: Docker Desktop だけ手動

**Docker Desktop の起動はユーザーが手動で行う。** エージェントは Docker Desktop を起動しない（`open -a Docker` も実行しない）。

**`docker compose up -d dynamodb-local` 以降はエージェントが実行する。**

## Before starting

1. List the terminals folder and check whether these are already running:
   - `docker compose` / `dynamodb-local`
   - `uvicorn local_server:app`
   - `npm run dev`
2. If DynamoDB, API, frontend are all up **and** health checks pass, report URLs and stop.
3. If only some are running, start the missing ones only.
4. If `api/.venv` is missing, tell the user to run first-time setup from `.cursor/rules/project.mdc` (venv, pip install, `.env`).
5. Confirm `api/.env` exists and includes at least:
   - `DASHSCOPE_API_KEY`
   - `DYNAMODB_ENDPOINT=http://localhost:8001`
   - `DYNAMODB_TABLE_NAME=buddy-talk`
   - `AWS_REGION=ap-northeast-1`
   - `AWS_ACCESS_KEY_ID=local`
   - `AWS_SECRET_ACCESS_KEY=local`
   If missing, tell the user to copy from `api/.env.example`.
6. Confirm `boto3` is installed: `pip install -r requirements.txt` in `api/.venv` if import errors occur.

## DynamoDB Local

**Permissions:** `docker compose` needs `required_permissions: ["all"]` (Docker socket access).

### 1. Check Docker daemon

```bash
docker info >/dev/null 2>&1 && echo "docker ok" || echo "docker unavailable"
```

**`docker unavailable` の場合:**

- 停止してユーザーに「Docker Desktop を手動で起動してから再実行してください」と案内
- API / frontend の起動は**行わない**（DynamoDB 依存機能が使えないため、部分起動は避ける）

### 2. Start container（エージェント実行）

```bash
cd /Users/tadasuke/Documents/19_cursor/04_reticle && docker compose up -d dynamodb-local
```

Poll until running:

```bash
cd /Users/tadasuke/Documents/19_cursor/04_reticle && docker compose ps dynamodb-local
```

### 3. Initialize table

```bash
cd /Users/tadasuke/Documents/19_cursor/04_reticle/api && source .venv/bin/activate && python ../scripts/init_dynamodb_local.py
```

Expected: `Created table 'buddy-talk'` or `Table 'buddy-talk' already exists.`

### 4. Verify DynamoDB Local

```bash
cd /Users/tadasuke/Documents/19_cursor/04_reticle/api && source .venv/bin/activate && set -a && source .env && set +a && python - <<'PY'
import boto3, os
client = boto3.client(
    "dynamodb",
    endpoint_url=os.environ.get("DYNAMODB_ENDPOINT", "http://localhost:8001"),
    region_name=os.environ.get("AWS_REGION", "ap-northeast-1"),
    aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", "local"),
    aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", "local"),
)
print(client.describe_table(TableName=os.environ.get("DYNAMODB_TABLE_NAME", "buddy-talk"))["Table"]["TableStatus"])
PY
```

Expected: `ACTIVE`.

## Start API (background)

**Important:** API must reach DashScope (Qwen) over HTTPS. When starting via the Shell tool, set `required_permissions: ["full_network"]`. Without it, localhost works but `POST /conversation` fails with `Connection error`.

If API is already running but Qwen check fails, stop the existing uvicorn and restart with `full_network`.

Run in background (`block_until_ms: 0`):

```bash
cd /Users/tadasuke/Documents/19_cursor/04_reticle/api && source .venv/bin/activate && uvicorn local_server:app --reload --port 8000
```

Poll until `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs` returns 2xx/3xx.

### Verify Qwen connectivity

After API is up, run (with `required_permissions: ["full_network"]`):

```bash
curl -s -X POST http://localhost:8000/conversation \
  -H 'Content-Type: application/json' \
  -d '{"type":"opening","scenarioId":"sns","friendType":"mia","buddyType":"coach","aiModel":"qwen"}'
```

- **Success:** response contains `"text"` (HTTP 200 JSON).
- **Failure:** `"detail":"Qwen API 呼び出しに失敗しました: Connection error."` — stop uvicorn and restart with `full_network`.

Also check `api/.env` has a valid `DASHSCOPE_API_KEY` if Qwen still fails after restart.

### Verify user / DynamoDB API

```bash
curl -s -X POST http://localhost:8000/users/login \
  -H 'Content-Type: application/json' \
  -d '{"userId":"dev-check"}'
```

- **Success:** HTTP 200 with `"user"` field.
- **Failure:** re-run DynamoDB steps or check `api/.env`.

## Start frontend (background)

Run in background (`block_until_ms: 0`). Network permission is not required for Vite.

```bash
cd /Users/tadasuke/Documents/19_cursor/04_reticle && npm run dev
```

Poll until Vite prints a local URL (usually `http://localhost:5173`).

## Report to user

On success, report:

- DynamoDB Local: http://localhost:8001
- API: http://localhost:8000
- App: http://localhost:5173
- Admin (character images): http://localhost:5173/admin/character-images
- ログイン・会話永続化: 利用可

If Docker Desktop was not running:

- ユーザーに Docker Desktop を手動起動してから再実行を案内

On failure, include which step failed and relevant output.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `docker unavailable` | Docker Desktop 未起動 | ユーザーが手動で Docker Desktop を起動 |
| `ResourceNotFoundException` on login | テーブル未作成 | 再実行（init スクリプト） |
| Qwen `Connection error` | API started in sandbox | Restart uvicorn with `full_network` |
| `No module named 'boto3'` | 依存未インストール | `pip install -r requirements.txt` in `api/.venv` |
| `DYNAMODB_ENDPOINT` missing | Incomplete `.env` | Copy from `api/.env.example` |
