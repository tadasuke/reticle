# バディトーク（reticle）

英会話練習アプリ。AI フレンドと英語で会話し、困ったらバディに日本語で相談できます。

## 技術スタック

- React + TypeScript（フロントエンド）
- Python + FastAPI（API / Lambda）
- Vite
- Tailwind CSS
- Anthropic Claude API（API サーバー経由）

## 環境

| 環境 | フロント | API |
|------|---------|-----|
| develop | ローカル（Vite） | ローカル（FastAPI） |
| staging / product | S3 + CloudFront | API Gateway + Lambda |

## セットアップ

### フロントエンド

```bash
npm install
cp .env.example .env
```

`.env` に API のベース URL を設定:

```
VITE_API_BASE_URL=http://localhost:8000
```

### API（Python）

```bash
cd api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

`.env` に Anthropic API キーを設定:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## 開発サーバー起動

2 つのプロセスを起動します。

**ターミナル 1 — API**

```bash
cd api
source .venv/bin/activate
uvicorn local_server:app --reload --port 8000
```

**ターミナル 2 — フロントエンド**

```bash
npm run dev
```

ブラウザで表示された URL（通常 `http://localhost:5173`）を開きます。

## ビルド

```bash
npm run build
```

staging / product 向けビルドでは、API Gateway の URL を指定します:

```
VITE_API_BASE_URL=https://your-api-gateway-url
npm run build
```

## 使い方

1. シナリオを選択する
2. 左パネルで AI フレンドと英語で会話する
3. 困ったら右パネルでチサトに日本語で相談する

## ディレクトリ構成

```
src/          # React フロントエンド
api/          # Python API（ローカル開発 + Lambda）
```

API の詳細は [api/README.md](api/README.md) を参照してください。

## 設計ドキュメント

機能の設計方針（未実装分）は [docs/](docs/) を参照してください。

- [キャラクター画像・AI 画像生成](docs/character-image-generation.md)
