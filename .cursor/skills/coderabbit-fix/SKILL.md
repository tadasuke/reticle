---
name: coderabbit-fix
description: >-
  Reticle（バディートーク）プロジェクトで CodeRabbit レビュー結果
  （.cursor/reviews/ の Markdown または coderabbit review findings）に基づき指摘を修正する。
  experiments/ ・ assets/real-friends/ 配下は絶対に修正しない。再レビューは行わない。
  ユーザーがレビュー結果を元に修正、CodeRabbitの指摘を直して等を依頼したときに使う。
disable-model-invocation: true
---

# Reticle: CodeRabbit レビュー指摘の修正

## 概要

- **プロジェクトパス**: `/Users/tadasuke/Documents/19_cursor/04_reticle`
- **入力**: `.cursor/reviews/coderabbit-*.md` または `coderabbit review findings`
- **修正後**: `npm run build`（および API 変更時は `compileall`）を実行し、Reticle 完了レポートを出力する
- **再レビューは行わない**（ユーザーが `@coderabbit-review` を別途呼び出した場合のみ）
- **修正禁止**: `experiments/`、`assets/real-friends/` 配下（絶対に修正しない）

> 自発的に CodeRabbit を実行しない。本スキル呼び出し時のみ修正を行う。

## 呼び出し例

```
@coderabbit-fix
```

```
@coderabbit-fix .cursor/reviews/coderabbit-20260703-162700.md
```

```
@coderabbit-fix
最新のレビュー結果の critical と major だけ修正して。
```

---

## ワークフロー

### STEP 1 — レビュー Doc の特定

1. ユーザーがファイルパスを指定していればそれを使用する
2. 未指定の場合、`.cursor/reviews/` 内の `coderabbit-*.md` を更新日時の新しい順に探し、最新を使用する
3. Markdown が見つからない場合、フォールバックとして以下を実行する:

```bash
coderabbit review findings
```

4. どちらも取得できない場合は「レビュー結果がありません。先に `@coderabbit-review` を実行してください」と報告して終了する

### STEP 2 — 修正対象のフィルタ

**必須除外（ユーザー指示より優先）:**

- 除外パス配下の指摘は**絶対に修正対象にしない**
- ファイルパスが除外プレフィックスで始まる指摘はスキップし、完了レポートの「スキップした指摘」に記載する

```python
EXCLUDED_PREFIXES = ("experiments/", "assets/real-friends/")
if any(file_path.startswith(p) for p in EXCLUDED_PREFIXES):
    skip  # 絶対に修正しない
```

ユーザー指示に従い severity をフィルタする。

| ユーザー指示 | 対象 severity |
|-------------|--------------|
| 未指定（デフォルト） | `critical`, `major` |
| 「すべて」「全部」 | すべて（ただし除外パスは除外） |
| 「critical のみ」 | `critical`（ただし除外パスは除外） |
| 「nit 無視」「trivial 無視」 | `critical`, `major`, `minor`（ただし除外パスは除外） |

フィルタ後に対象が 0 件の場合は、その旨を報告して終了する。

### STEP 3 — 指摘の修正

レビュー Doc の「内容」「修正方針」は**日本語**で記載されている前提で読む（`@coderabbit-review` が STEP 3.5 で日本語化して保存する）。

各指摘について:

1. **対象ファイルが除外パス配下ならスキップする**（絶対に修正しない）
2. 対象ファイルを読み、日本語の「内容」「修正方針」を確認する
3. [`.cursor/rules/project.mdc`](../../rules/project.mdc) のコーディング規約に従って修正する
4. 日本語の「修正方針」を優先し、コードブロック（suggestions）を実装の参照とする。既存コードのスタイルに合わせる
5. 1件ずつ修正する

**自発的に `coderabbit` を実行しない。**

### STEP 4 — ビルド・構文検証

プロジェクトルートで以下を実行する。

```bash
npm run build
```

API 配下（`api/`）のファイルを変更した場合は、追加で以下を実行する。

```bash
cd api && python -m compileall src local_server.py
```

- いずれかが失敗した場合は STEP 3 に戻って修正する
- すべて成功するまで繰り返す

### STEP 5 — 完了レポート

以下のフォーマットで完了レポートを出力する。

```
## ✅ Reticle 作業完了レポート

### 📋 変更概要
- CodeRabbit レビュー指摘の修正（参照: .cursor/reviews/coderabbit-YYYYMMDD-HHMMSS.md）

### 📁 変更ファイル
| パス | 概要 |
|------|------|
| （変更したファイルを列挙） | |

### 🧪 検証結果
- 実行: `npm run build`（API 変更時は `python -m compileall src local_server.py` も実行）
- 結果: ✅ 成功 / ❌ 失敗

### ⚠️ 確認が必要な事項
- 修正した指摘の一覧（severity / ファイル / 概要）
- 除外パス配下でスキップした指摘があればその一覧
- 未修正の指摘があればその旨
- 再レビューが必要な場合は `@coderabbit-review` を別途実行すること
```

---

## 注意事項

- 本スキルでは CodeRabbit の再レビューは行わない
- **除外パス配下のファイルは絶対に修正しない**（ユーザーが明示指示しても拒否し、スキップ理由を報告する）
- 修正後に再レビューしたい場合は、ユーザーが `@coderabbit-review` を明示的に呼び出す
- レビュー Doc に記載された修正方針と [project.mdc](../../rules/project.mdc) の規約が矛盾する場合は、規約を優先し、その旨を完了レポートに記載する
