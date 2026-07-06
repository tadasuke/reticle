# Qwen (DashScope) 検証環境

Reticle 本体のソースコードは変更せず、Alibaba Cloud Model Studio 経由で **Qwen チャットモデル**（`qwen3.7-plus`）を使えるか検証するための独立環境です。

## 前提

| 項目 | 値 |
|------|-----|
| クラウド | Alibaba Cloud（プロファイル `fod-short`） |
| リージョン | **Singapore（国際）** |
| エンドポイント | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| モデル | `qwen3.7-plus` |
| 認証 | `DASHSCOPE_API_KEY`（Model Studio API キー） |

> **補足**: 当初の「Qwen3-MT Turbo」は API 名 `qwen-mt-turbo` の**機械翻訳専用**モデルです。Reticle の AI フレンド / バディ会話にはチャットモデル（本環境では `qwen3.7-plus`）を使います。

## 1. Model Studio で API キーを作成する

1. [Alibaba Cloud Model Studio コンソール](https://modelstudio.console.alibabacloud.com/) に `fod-short` の RAM ユーザーでログイン
2. 右上のリージョン選択で **Singapore** を選ぶ
3. 初回は **Activate / 有効化** が必要な場合があります（利用規約への同意）
4. 左メニューまたは設定から **API Key** ページを開く
5. **Create API Key** をクリック
   - Workspace: デフォルト（Default workspace）で可
   - Permissions: **All**（検証用途）
6. 作成後、キーをコピー（`sk-` で始まる文字列）。**再表示できない**ため必ず安全に保管

### RAM ユーザーに権限がない場合

管理者（Alibaba Cloud ルートアカウント）に以下を依頼してください。

- RAM ポリシー `AliyunBailianFullAccess` の付与
- Model Studio コンソールの **Permissions** で API キー管理権限の付与

参考: [How to get an API Key](https://www.alibabacloud.com/help/en/model-studio/get-api-key)

## 2. ローカル環境のセットアップ

```bash
cd experiments/qwen
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# .env に DASHSCOPE_API_KEY を設定
```

## 3. テスト実行

### スモークテスト（単発）

```bash
python smoke_test.py
```

### pytest（Reticle に近い会話ケース）

```bash
pytest -v test_qwen_chat.py
```

## 4. 検証内容

| テスト | 内容 |
|--------|------|
| `test_basic_chat_returns_non_empty_text` | 基本的なチャット応答 |
| `test_system_prompt_english_only` | AI フレンド想定：英語のみ・短い返答 |
| `test_multi_turn_conversation` | マルチターン会話 |
| `test_japanese_coach_style` | バディ想定：日本語フィードバック |

## 5. 次のステップ（Reticle 本体統合時）

- `api/.env` に `DASHSCOPE_API_KEY` を追加
- モデル選択 UI と `conversation_service.py` のプロバイダ切り替え
- Claude / Qwen でメッセージ形式・トークン制限の差分を吸収
