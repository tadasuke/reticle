# Buddy Talk API

Python API for Buddy Talk. Same business logic runs locally (FastAPI) and on AWS Lambda.

## Setup

```bash
cd api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set `DASHSCOPE_API_KEY` in `.env` (required for Qwen chat and character image studio). See `.env.example` for DynamoDB and image model variables.

## Local development

**DynamoDB Local** (required for user login and AI conversation persistence):

```bash
# from repo root
docker compose up -d dynamodb-local
cd api && source .venv/bin/activate && python ../scripts/init_dynamodb_local.py
```

**API server**:

```bash
uvicorn local_server:app --reload --port 8000
```

Admin character image studio: `http://localhost:5173/admin/character-images` (local only, not on Lambda).

## API

### `POST /users/login`

```json
{ "userId": "tanaka" }
```

Response: `{ "user": { "userId", "createdAt", "lastLoginAt" }, "isNew": true }`

userId: 3–32 chars, `[a-zA-Z0-9_-]` only. Creates user if not exists.

### User AI conversations

All endpoints below require header `X-User-Id` matching path `{userId}`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/users/{userId}/ai-conversations` | List conversations (sorted by `lastInteractionAt` desc) |
| POST | `/users/{userId}/ai-conversations` | Create conversation |
| GET | `/users/{userId}/ai-conversations/{convId}` | Get conversation + messages |
| PUT | `/users/{userId}/ai-conversations/{convId}/messages` | Save all messages |
| PATCH | `/users/{userId}/ai-conversations/{convId}` | Update metadata (e.g. `supportType`) |

### `POST /conversation`

**Opening (AI friend's first message)**

```json
{
  "type": "opening",
  "scenarioId": "casual",
  "friendType": "friend-0001",
  "buddyType": "coach",
  "aiModel": "qwen"
}
```

**Message**

```json
{
  "type": "message",
  "scenarioId": "casual",
  "friendType": "friend-0001",
  "buddyType": "coach",
  "aiModel": "qwen",
  "character": "friend",
  "messages": [
    {
      "id": "...",
      "speaker": "friend",
      "channel": "friend",
      "content": "Hello!",
      "timestamp": 0
    }
  ]
}
```

Response: `{ "text": "..." }`

### Admin character images (local only)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/characters` | List image studio characters and reference status |
| GET | `/admin/characters/{characterId}` | Spec, gallery, reference |
| PUT | `/admin/characters/{characterId}/spec` | Update visual_anchor / negative_prompt |
| POST | `/admin/characters/{characterId}/generate` | Generate candidates (`count` 1–4) |
| POST | `/admin/characters/{characterId}/edit` | Edit selected image |
| POST | `/admin/characters/{characterId}/stress-test` | Run 3-scene consistency test |
| POST | `/admin/characters/{characterId}/adopt` | Adopt image as `reference.png` |

Static files: `GET /media/friends/*`, `GET /media/buddies/*`, `GET /media/images/*`.

## Lambda

Entry point: `src.handler.lambda_handler`

Deploy to API Gateway (HTTP API) with proxy integration. Set `DASHSCOPE_API_KEY` as a Lambda environment variable.

**Note:** Lambda currently handles `POST /conversation` only. User / AI conversation endpoints are implemented in `local_server.py` and require API Gateway route expansion for staging/product.

## DynamoDB

Table name: `buddy-talk` (env: `DYNAMODB_TABLE_NAME`)

| PK | SK | Purpose |
|----|-----|---------|
| `USER#{userId}` | `PROFILE` | User profile |
| `USER#{userId}` | `CONV#{conversationId}` | AI conversation metadata + `messages[]` |

Billing: PAY_PER_REQUEST

### Local (develop)

- `DYNAMODB_ENDPOINT=http://localhost:8001`
- Dummy credentials: `AWS_ACCESS_KEY_ID=local`, `AWS_SECRET_ACCESS_KEY=local`
- Start: `docker compose up -d dynamodb-local` then `python scripts/init_dynamodb_local.py`

### Staging / product (manual setup until IaC)

Create table in AWS Console or CLI with:

- Partition key: `PK` (String)
- Sort key: `SK` (String)
- Billing mode: On-demand

Set Lambda/API env vars (no `DYNAMODB_ENDPOINT` — uses AWS default endpoint):

- `DYNAMODB_TABLE_NAME=buddy-talk`
- `AWS_REGION=ap-northeast-1`

Example AWS CLI:

```bash
aws dynamodb create-table \
  --table-name buddy-talk \
  --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --profile madfaction \
  --region ap-northeast-1
```
