---
name: coderabbit-review
description: >-
  Reticle（バディートーク）プロジェクトで CodeRabbit CLI により未コミット変更をレビューし、
  指摘を日本語化して .cursor/reviews/ に Markdown ドキュメントとして保存する。
  experiments/ 配下はレビュー対象外。修正は行わない。
  ユーザーが CodeRabbit レビュー、レビュー結果の保存等を依頼したときに使う。
disable-model-invocation: true
---

# Reticle: CodeRabbit レビュー（ドキュメント保存のみ）

## 概要

- **プロジェクトパス**: `/Users/tadasuke/Documents/19_cursor/04_reticle`
- **レビューコマンド**: `coderabbit --agent -t uncommitted --base develop`
- **保存先**: `.cursor/reviews/coderabbit-YYYYMMDD-HHMMSS.md`
- **指摘の言語**: 「内容」「修正方針」は**日本語**で記載する（STEP 3.5）
- **修正は行わない**
- **レビュー対象外**: `experiments/` 配下（絶対にレビューしない）

> 機能実装・コミット時に自発的に CodeRabbit を実行しない。本スキル呼び出し時のみ実行する。

## 前提条件

CLI が未インストール・未認証の場合は、実行前にユーザーへ案内する。

```bash
brew install coderabbit
coderabbit auth login
coderabbit auth status
coderabbit doctor
```

## 呼び出し例

```
@coderabbit-review
```

```
@coderabbit-review
現在の未コミット変更をレビューして。修正はしないで。
```

---

## ワークフロー

### STEP 1 — コンテキスト取得

以下を並列で実行する。

```bash
git branch --show-current
git status
git diff --stat
```

- 現在ブランチ・変更ファイル一覧を把握する
- 変更がない場合でも STEP 2 へ進み、空レビューとして記録する

### STEP 2 — CodeRabbit レビュー実行

```bash
coderabbit --agent -t uncommitted --base develop
```

- [`.coderabbit.yaml`](../../.coderabbit.yaml) の `path_filters` により `experiments/**` 等は CLI レビュー対象外
- 完了まで待機する（変更量により 7〜30 分以上かかることがある）
- npm パッケージとしてインストールしない（グローバル CLI を使用）
- 失敗時は `coderabbit doctor` の結果を確認し、ユーザーに報告する

全ファイルレビュー（ルートコミット基準）の場合:

```bash
ROOT=$(git rev-list --max-parents=0 HEAD)
coderabbit --agent -t all --base-commit "$ROOT"
```

- 上記でも `path_filters` により除外パスは対象外のまま

### STEP 3 — JSON 解析

stdout を1行ずつ読み、`type: "finding"` のイベントを収集する。

- `heartbeat` は無視する
- `complete` で完了を確認する
- `review_skipped` または変更なしの場合は指摘 0 件として扱う
- **除外パスの finding は除外する**（`path_filters` 漏れの二重ガード）

除外判定:

```python
EXCLUDED_PREFIXES = ("experiments/",)
if any(fileName.startswith(p) for p in EXCLUDED_PREFIXES):
    continue
```

各 finding から以下を抽出する（この時点では英語の原文を保持する）:

| 項目 | ソース |
|------|--------|
| severity | `severity` |
| ファイル | `fileName` |
| 内容（原文） | `comment` |
| 修正方針（原文） | `codegenInstructions`（空なら `comment` を使用） |
| コード例 | `suggestions`（あれば） |

### STEP 3.5 — 指摘の日本語化

指摘が 1 件以上ある場合、STEP 4 の前に各 finding の説明文を日本語化する。指摘 0 件の場合は本ステップをスキップする。

#### 日本語化ルール

| 項目 | ルール |
|------|--------|
| 対象 | 各 finding の「内容」「修正方針」の**説明文** |
| 言語 | 必ず日本語（敬体・技術文書調） |
| 原文 | CLI の英語 `comment` / `codegenInstructions` は**そのまま貼らない** |
| コード | `suggestions` や codegen 内の TypeScript/Python/YAML 等は**翻訳せずそのまま**コードブロックで残す |
| 構造 | `severity`・`fileName`・行番号・識別子（関数名、環境変数名等）は原文維持 |
| 空の場合 | `codegenInstructions` が空なら `comment` を日本語化して「内容」に使う |
| 品質 | 何が問題か（原因）と何をすべきか（対策）を分けて簡潔に書く（各 1〜4 文程度） |

#### 日本語化の例

**内容（Before — CLI 原文）**

> Remove the temporary debug logging from conversation_service.py...

**内容（After — Doc 用）**

> `conversation_service.py` に一時的なデバッグ用ログが残っており、リクエストごとに不要なファイル書き込みが発生する。本番向けのログ方針に合わせて削除し、エラーハンドリングは維持すること。

**修正方針**

- codegen のコードブロックはそのまま残す
- 説明がコードのみの場合は、コードブロックの直前に 1 文の日本語要約を付ける

### STEP 4 — Markdown ドキュメント作成

ファイル名: `.cursor/reviews/coderabbit-YYYYMMDD-HHMMSS.md`（実行時刻の JST）

STEP 3.5 で日本語化したテキストを使って Doc を組み立てる。英語原文の転記は禁止。

#### ドキュメントテンプレート

```markdown
# CodeRabbit レビュー結果

## メタ情報

| 項目 | 値 |
|------|-----|
| 実行日時 | YYYY-MM-DD HH:MM:SS (JST) |
| コマンド | `coderabbit --agent -t uncommitted --base develop` |
| ブランチ | （git branch の結果） |
| base ブランチ | develop |
| 変更ファイル | （git diff --stat の概要） |
| 除外パス | `experiments/**` 等（レビュー対象外） |

## サマリー

| Severity | 件数 |
|----------|------|
| critical | 0 |
| major | 0 |
| minor | 0 |
| trivial | 0 |
| info | 0 |
| **合計** | **0** |

## 指摘一覧

（指摘がない場合は「指摘なし」と記載）

### 1. [major] api/src/conversation_service.py

**内容:**

会話 API のレスポンスログにユーザー入力全文を出力しており、個人情報がログに残る可能性がある。

**修正方針:**

`log_step` では文字数（`message_length`）のみを記録し、本文はログに含めない。

```python
message_length=len(user_message),
```
```

- severity 別に件数を集計する
- 指摘は severity の高い順（critical → info）に並べる
- 同一ファイルの指摘は連続して記載する
- 「内容」「修正方針」は STEP 3.5 で日本語化したテキストを使用する
- コードブロックは翻訳せずそのまま記載する

### STEP 5 — 完了報告

**修正は行わない。** 以下を報告して終了する。

- 保存したファイルパス
- severity 別件数サマリー
- critical / major があれば一覧を簡潔に提示（日本語で要約）

---

## 注意事項

- 本スキルではコードの修正・再レビューは行わない
- **除外パス配下は絶対にレビュー対象にしない**（指摘が出ても Doc に含めない）
- CLI の `--agent` 出力は英語だが、Doc の「内容」「修正方針」は必ず日本語で記載する（英語原文の転記禁止）
- 修正が必要な場合は `@coderabbit-fix` を別途呼び出す
- PR 上の CodeRabbit レビュー（`develop` 向け）とも `path_filters` で除外パスは対象外
