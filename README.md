# 草野球スコア管理アプリ（仮称）

スミスブラザーズをはじめとする草野球チームのスコア・成績管理を効率化するWebアプリ。

## ステータス

**Phase 1-B: 要件定義 v2 & ER図 完了**（2026-05-20）

## ドキュメント

### Phase 1-A: ドメインモデリング
- [01. ユビキタス言語辞書](docs/01-ubiquitous-language.md) — プロジェクトで使う用語の定義集
- [02. 境界づけられたコンテキスト](docs/02-bounded-contexts.md) — ドメインの責務分割
- [03. ドメインモデル](docs/03-domain-model.md) — 集約・エンティティ・値オブジェクト設計

### Phase 1-B: 要件定義 v2 & ER図
- [04. ユースケース一覧](docs/04-use-cases.md) — アクター別の機能仕様
- [05. ER図と DB スキーマ](docs/05-er-diagram.md) — Supabase PostgreSQL のテーブル定義
- [06. 画面遷移ラフ](docs/06-screen-flow.md) — モバイルファーストの画面設計

## 技術スタック（予定）

- Next.js + TypeScript
- Supabase（PostgreSQL + Auth）
- Vercel（デプロイ）

## ロードマップ

- [x] Phase 0: 方針決定
- [x] Phase 1-A: ドメインモデリング
- [x] Phase 1-B: 要件定義 v2 + ER図
- [ ] Phase 1-C: 技術基盤セットアップ
- [ ] Phase 1-D: 機能実装（5スライス）
- [ ] **2026-06-10: MVP リリース目標**
- [ ] Phase 2: マルチテナント化、過去データインポート、他
