# 草野球スコア管理アプリ（仮称）

スミスブラザーズをはじめとする草野球チームのスコア・成績管理を効率化するWebアプリ。

## ステータス

**Phase 1-C: 技術基盤セットアップ完了**（2026-05-20）

## 技術スタック

- **Next.js 15** (App Router) + **TypeScript** + **React 19**
- **Tailwind CSS 3** + shadcn/ui スタイル（color variables）
- **Supabase** (PostgreSQL + Auth)
- **Vercel** デプロイ予定
- パッケージマネージャ: **pnpm**

## セットアップ手順

### 1. 依存パッケージのインストール

```bash
pnpm install
```

### 2. Supabase プロジェクトの作成

1. https://supabase.com にサインアップ
2. 新規プロジェクトを作成（Region は Tokyo がおすすめ）
3. プロジェクトの「Settings > API」から以下を取得
   - `Project URL`
   - `anon public` API key
4. SQL Editor で `supabase/migrations/` 配下の SQL を順番に実行

### 3. 環境変数の設定

```bash
cp .env.local.example .env.local
# .env.local を編集して上で取得した値を貼り付ける
```

### 4. 開発サーバー起動

```bash
pnpm dev
# http://localhost:3000 を開く
```

## ディレクトリ構造

```
src/
├── app/                    Next.js App Router（プレゼンテーション層）
├── contexts/               境界づけられたコンテキスト（DDD中核）
│   ├── team-management/    チーム・メンバー管理
│   ├── game-recording/     試合・打席・投手記録
│   └── statistics/         成績集計
├── shared/                 共有カーネル
└── lib/                    外部ライブラリのラッパー（supabase, utils）
```

詳細は [docs/07-code-structure.md](docs/07-code-structure.md) を参照。

## ドキュメント

### Phase 1-A: ドメインモデリング
- [01. ユビキタス言語辞書](docs/01-ubiquitous-language.md)
- [02. 境界づけられたコンテキスト](docs/02-bounded-contexts.md)
- [03. ドメインモデル](docs/03-domain-model.md)

### Phase 1-B: 要件定義 v2 & ER図
- [04. ユースケース一覧](docs/04-use-cases.md)
- [05. ER図と DB スキーマ](docs/05-er-diagram.md)
- [06. 画面遷移ラフ](docs/06-screen-flow.md)

### Phase 1-C: 技術基盤
- [07. コード構造（DDDレイヤード）](docs/07-code-structure.md)

## 開発コマンド

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # 本番ビルド
pnpm start        # 本番サーバー起動
pnpm lint         # ESLint 実行
pnpm type-check   # TypeScript の型チェック
```

## ロードマップ

- [x] Phase 0: 方針決定
- [x] Phase 1-A: ドメインモデリング
- [x] Phase 1-B: 要件定義 + ER図
- [x] Phase 1-C: 技術基盤セットアップ
- [ ] Phase 1-D: 機能実装（5スライス）
- [ ] **2026-06-10: MVP リリース目標**
- [ ] Phase 2: マルチテナント化、過去データインポート、他
