# Model Studio API キー作成ガイド（Singapore）

`fod-short` プロファイルの RAM ユーザー `tadasuke.kato` で Qwen を使うための手順です。

## 確認済みの環境情報

| 項目 | 値 |
|------|-----|
| Alibaba Cloud アカウント ID | `5241873026971593` |
| RAM ユーザー | `tadasuke.kato` |
| リージョン | **Singapore（国際）** |
| API エンドポイント | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| 使用モデル（会話用） | `qwen3.7-plus` |

> 「Qwen3-MT Turbo」（`qwen-mt-turbo`）は**翻訳専用**のため、Reticle の会話には使いません。

---

## 手順 1: コンソールにログイン

1. ブラウザで [Alibaba Cloud ログイン](https://signin.alibabacloud.com/login.htm) を開く
2. **RAM ユーザー**としてログイン
   - ユーザー名: `tadasuke.kato`
   - アカウント ID（必要な場合）: `5241873026971593`
3. ログイン後、[Model Studio コンソール](https://modelstudio.console.alibabacloud.com/) を開く

### ログインできない場合

- ルートアカウントの管理者に、RAM ユーザーのログイン URL とパスワード（または MFA）の確認を依頼
- 初回ログイン時はパスワード変更が求められることがあります

---

## 手順 2: リージョンを Singapore に設定

1. Model Studio コンソール右上の **リージョン選択** をクリック
2. **Singapore** を選択

**重要**: API キーはリージョンごとに異なります。Beijing 用キーは Singapore では使えません。

---

## 手順 3: Model Studio を有効化（初回のみ）

1. 初回アクセス時に **Activate** / **有効化** ボタンが表示される場合があります
2. 利用規約に同意して有効化を完了
3. 無料クォータ（トークン）が付与される場合があります

### 「Activate」が表示されない / グレーアウトしている

管理者に以下を依頼してください。

- ポリシー `AliyunBailianFullAccess` の付与
- または `AliyunBailianReadOnlyAccess` + 課金権限 `AliyunBSSOrderAccess`

---

## 手順 4: API キーを作成

1. 左メニューから **API Key**（または **Key Management**）を開く
   - 見つからない場合: 右上アイコン → **API-KEY**、または [直接リンク](https://modelstudio.console.alibabacloud.com/?tab=globalset#/api-key) を試す
2. **Create API Key** をクリック
3. 設定:
   - **Workspace**: Default workspace（そのまま）
   - **Permissions**: **All**（検証用）
   - **Description**: 例 `reticle-qwen-dev`
4. **OK** / **Create** で作成
5. 表示されたキー（`sk-` で始まる）を **すぐにコピー**
   - 閉じると再表示できません

---

## 手順 5: ローカルにキーを設定

```bash
cd experiments/qwen
# .env を編集
# DASHSCOPE_API_KEY=sk-（コピーしたキー）
```

`.env` の例:

```env
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxx
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen3.7-plus
```

---

## 手順 6: テスト実行

```bash
cd experiments/qwen
source .venv/bin/activate
python smoke_test.py      # 単発接続確認
pytest -v test_qwen_chat.py   # Reticle 想定の4ケース
```

成功時の `smoke_test.py` 出力例:

```
base_url: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
model:    qwen3.7-plus
---
reply: Qwen connection OK
smoke test passed
```

---

## よくあるエラーと対処

| 症状 | 原因 | 対処 |
|------|------|------|
| API Key メニューが見えない | RAM ユーザーに Model Studio 権限がない | 管理者に `AliyunBailianFullAccess` と API キー管理権限を依頼 |
| Create API Key が押せない | ワークスペース管理者権限がない | 管理者がキーを作成して共有してもらう |
| `401 invalid_api_key` | キー誤り / リージョン不一致 | Singapore 用キーか確認。`.env` の typo を確認 |
| `403` / 権限エラー | モデル呼び出し権限不足 | Model Studio で `qwen3.7-plus` が有効か確認 |
| 課金・クォータエラー | 有効化・支払い設定未完了 | 管理者に Model Studio 有効化と課金設定を依頼 |

---

## 管理者向け: 権限付与の最小セット

RAM ユーザー `tadasuke.kato` に以下を付与:

1. **RAM コンソール** → ユーザー → `tadasuke.kato` → 権限の追加
2. システムポリシー:
   - `AliyunBailianFullAccess`（Model Studio 利用）
   - `AliyunBSSOrderAccess`（初回有効化・課金に必要な場合）
3. **Model Studio コンソール** → **Permissions** → 対象ユーザーに **API key** 権限を追加

参考ドキュメント:
- [API キーの取得](https://www.alibabacloud.com/help/en/model-studio/get-api-key)
- [権限管理](https://www.alibabacloud.com/help/en/model-studio/permission-management-overview)

---

## キー設定後

`.env` にキーを設定したら、チャットで「テストを実行して」と伝えてください。こちらで `smoke_test.py` と `pytest` を実行します。
