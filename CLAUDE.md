# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

草野球チームのスコア・成績管理アプリ。Next.js 15 (App Router) + TypeScript + Supabase + Tailwind。pnpm 管理。
**著者は本リポジトリを通じて DDD（ドメイン駆動設計）の学習**を目的にしているため、設計判断は単なる動作よりも**レイヤー分離・不変条件の集約・ユビキタス言語の徹底**を優先する。

## 主要コマンド

```bash
pnpm dev              # 開発サーバー
pnpm build            # 本番ビルド
pnpm type-check       # tsc --noEmit
pnpm test             # vitest run（全テスト）
pnpm test:watch       # ウォッチ
pnpm lint             # next lint

# 単一テスト
pnpm vitest run src/contexts/game-recording/domain/bat-result.test.ts
```

変更を入れたら **`pnpm type-check && pnpm test && pnpm build`** を必ず通す（CIで弾かれるより手元で）。

## アーキテクチャ（big picture）

### 境界づけられたコンテキスト
`src/contexts/` 直下に3つ:
- **team-management**: メンバー・助っ人・チーム設定（規定打席係数等）
- **game-recording**: 試合・打順・打席結果・投手記録・スコア（草野球ドメインの中核）
- **statistics**: 成績集計（読み取りモデル / CQRS の右側）

同じ単語でもコンテキスト間で意味が違うことがある（例: 「Player」「Team」）。コンテキストをまたぐ修正は基本やらない。

### 各コンテキストのレイヤー
```
domain/         エンティティ・値オブジェクト・リポジトリ「インターフェース」
application/    ユースケース（薄く・例外を投げない・Result<T,E> を返す）
infrastructure/ Supabase 実装（リポジトリの具象）
```

依存方向: `infrastructure → domain ← application`。**ドメインがインフラを知らない**。

### ドメインの典型パターン
- **集約ルート**: `game-recording/domain/game.ts` が打順・打席・スコア・投手記録の整合性を1つの境界で守る。子の変更は必ず Game 経由（`addPlateAppearance`, `replaceInningScores` 等）。
- **判別共用体の値オブジェクト**: `bat-result.ts` の `BatResult`（hit/walk/out/sacrifice/errorOnly）。不正な組み合わせを型レベルで作れない。
- **エンティティの不変更新**: `withRunScored(...)`, `withAccount(...)`, `withInningRecords(...)` のように **新しいインスタンスを返す**。ID は保ったまま。Member/PlateAppearance/PitchingAppearance に同じパターンが使われている。
- **派生値は持たない**: スコア・打率・防御率はフィールドではなくメソッド/getter で都度計算（Single Source of Truth）。`Game.finalScore()`, `TeamStats.battingAverage` など。
- **生成は factory 経由**: 新規 = `register()` / `record()` / `create()`、復元 = `restore()`。コンストラクタは private。

### プレゼンテーション層（`src/app/`）
- App Router の **Server Component が既定**。データ取得はサーバーで完結。
- 変更系は **Server Action**。Server Action はユースケースを呼ぶ「薄いアダプタ」だけ。ドメインルールは書かない。
- 認可は **Server Action 冒頭で `requireAdmin()` / `getCurrentMember()`**（[src/lib/auth/current-member.ts](src/lib/auth/current-member.ts)）。クライアントから渡ってきた `isAdmin` を信用しない。
- **ログインは Server Action 必須**（[src/app/login/actions.ts](src/app/login/actions.ts)）。ブラウザ側 `signInWithPassword` + `router.push` は本番で Cookie レースに当たる。理由は当該ファイルのコメントとコミット `18ec49d` 参照。
- 数値入力は共通の **`NumberField`**（[src/components/NumberField.tsx](src/components/NumberField.tsx)）。素の `<input type="number">` は「0が消せない」「inputModeなし」などの問題を共通解決済み。

### Supabase / RLS（重要）
- **anon key は `NEXT_PUBLIC_` で全ブラウザに配布される公開鍵**。リポジトリも Public。
- **本物のセキュリティ境界は RLS**。アプリ層の認可（middleware や requireAdmin）はUIを守るだけ。RLS が無いと anon key で REST 直接アクセスから全データが見える。
- 全テーブル RLS 有効、ロール階層は `superadmin（platform_admins）` / `admin（members.role）` / `regular`。詳細: [supabase/migrations/20260523000001_enable_rls.sql](supabase/migrations/20260523000001_enable_rls.sql)。
- **service_role キー**は `NEXT_PUBLIC_` を絶対に付けない。サーバー専用の `SUPABASE_SERVICE_ROLE_KEY`。利用は [src/lib/supabase/admin.ts](src/lib/supabase/admin.ts) からのみ。

### Supabase クライアント使い分け
- ブラウザ側: `src/lib/supabase/client.ts`
- サーバー側（Server Component / Server Action / Route Handler）: `src/lib/supabase/server.ts`
- middleware: `src/lib/supabase/middleware.ts`
- 管理操作（service_role / RLS 貫通）: `src/lib/supabase/admin.ts`

### 統計（statistics コンテキスト）の方針
- **集約を作らない**。CQRSの読み取り側として、集計は **DB の VIEW** で行い、アプリは取得した数値を整形するだけ。
- ビューは `security_invoker = true` で **RLS を貫通させる**（重要：これがないと所有者権限で全データが見えてしまう）。
- 異名（一言）など「数値からの派生概念」も統計ドメインに置く（[player-epithet.ts](src/contexts/statistics/domain/player-epithet.ts)）。

## マイグレーション
`supabase/migrations/YYYYMMDDNNNNNN_xxx.sql`。Supabase Dashboard の SQL Editor で手動実行する運用（CLI連携はしていない）。**新しい migration を追加する PR は、本文に「DBに手動実行してください」を明記**。

## テスト方針
- vitest、`src/**/*.test.ts` を拾う。**ドメイン層のみ**をテスト（DBもモックも使わない）。
- アプリケーション層・インフラ層は型と本番動作で担保。
- `pnpm vitest run <file>` で単一実行。

## ドキュメント

`docs/` に設計・運用ドキュメントが揃っている。**変更内容に応じて該当ドキュメントも更新**:

| ファイル | 内容 |
|---|---|
| [01-ubiquitous-language.md](docs/01-ubiquitous-language.md) | ユビキタス言語辞書 |
| [02-bounded-contexts.md](docs/02-bounded-contexts.md) | コンテキストマップ |
| [03-domain-model.md](docs/03-domain-model.md) | 集約・エンティティ・値オブジェクトの説明 |
| [04-use-cases.md](docs/04-use-cases.md) | UCシナリオ |
| [05-er-diagram.md](docs/05-er-diagram.md) | ER図 |
| [06-screen-flow.md](docs/06-screen-flow.md) | 画面遷移 |
| [07-code-structure.md](docs/07-code-structure.md) | ディレクトリ構造とレイヤー対応 |
| [08-operations.md](docs/08-operations.md) | 本番運用ランブック |
| [09-phase-2-plan.md](docs/09-phase-2-plan.md) | マルチテナント化（Phase 2）の計画 |
| [10-ddd-learning-outline.md](docs/10-ddd-learning-outline.md) | DDD学習コンテンツの章立て |
| [11-sonarqube-guide.md](docs/11-sonarqube-guide.md) | SonarQube 導入ガイド（Cloud / GitLab セルフホスト / Rancher Desktop） |

`docs/private/` は `.gitignore` 済み（運用者固有のメモ置き場）。

## コミット規約

- メッセージは日本語（既存履歴に揃える）
- 末尾に: `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`
- 通常は HEREDOC で改行を保持して `git commit -m "$(cat <<'EOF' ... EOF)"`
- main は **force push 禁止** のブランチ保護を入れる方針

## よくある落とし穴
- **`SMITH_BROTHERS_TEAM_ID` ハードコード**: Phase 1 は単一チーム前提。Phase 2 で撤去予定（[docs/09](docs/09-phase-2-plan.md) Slice D）。今は触らない。
- **打席結果の `direction` は廃止**。打球位置（`fielderPosition`）から `battingDirectionOf(r)` で導出する。新規追加で `direction` を入力に戻さない。
- **Supabase の組み込みメールはレート制限が厳しい**（プロジェクト全体で約2通/時間）。マジックリンクや確認メールに依存する設計を入れない（現状の Email+パスワードは通常ログインでメール0通）。
- **CSV import の `auth_user_id` は payload から除外して upsert**。既存ログイン紐付けを壊さないため（[src/app/export-import/actions.ts](src/app/export-import/actions.ts)）。
