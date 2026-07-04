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

Set `DASHSCOPE_API_KEY` in `.env` (required for Qwen chat and character image studio). See `.env.example` for image model variables.

## Local development

```bash
uvicorn local_server:app --reload --port 8000
```

Admin character image studio: `http://localhost:5173/admin/character-images` (local only, not on Lambda).

## API

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

Deploy to API Gateway (HTTP API) with proxy integration. Set `ANTHROPIC_API_KEY` as a Lambda environment variable.

## DynamoDB (future)

Conversation persistence is not implemented yet. Planned table design:

| Table | PK | SK | Purpose |
|-------|----|----|---------|
| Conversations | sessionId | timestamp | Learning history storage |
