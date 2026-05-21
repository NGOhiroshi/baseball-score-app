# コード構造（DDDレイヤード設計）

> **このドキュメントの目的**
> ソースコードのディレクトリ構成と、各ファイルの役割を解説する。**「このファイルは何をしているか」をファイル単位で理解する**ための地図。
>
> **DDD的位置づけ**
> 戦術設計（集約・エンティティ・値オブジェクトをコードで表現する技法）をディレクトリ構造で実体化したもの。境界線（フォルダ）がそのまま依存方向のルールになる。

---

## 1. プロジェクト全体の構成

```
baseball-score-app/
├── docs/                       要件定義・設計ドキュメント（人が読む用）
├── supabase/
│   └── migrations/             DBスキーマ定義（DDL）
├── public/                     画像・favicon等（静的ファイル）
├── src/
│   ├── middleware.ts           Next.js ミドルウェア（認証チェック等。src/ 使用時はここに置く）
│   ├── app/                    Next.js App Router（プレゼンテーション層）
│   ├── contexts/               境界づけられたコンテキスト（ドメイン中核）
│   ├── shared/                 共有カーネル
│   └── lib/                    既存ライブラリのラッパー
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
├── postcss.config.mjs
├── .eslintrc.json
├── .env.local.example          環境変数のテンプレート
└── .gitignore
```

---

## 2. src/app/ - プレゼンテーション層

Next.js App Router の規約に従う。**画面とAPIエンドポイント**だけを書く。

```
src/app/
├── layout.tsx                  全画面共通レイアウト（HTMLの<html>から）
├── page.tsx                    ホーム画面
├── globals.css                 Tailwind のグローバル CSS
├── login/
│   └── page.tsx                ログイン画面
└── (将来) games/, members/, stats/  各機能の画面
```

**この層のルール**:
- ドメインロジック（打率計算など）を**直接書かない**
- ユースケースクラスを呼び出すだけの薄い層
- 例: ボタンの onClick → `createGame.execute(...)` → 結果を画面に反映

---

## 3. src/contexts/ - 境界づけられたコンテキスト

[docs/02-bounded-contexts.md](02-bounded-contexts.md) で定義したコンテキスト3つに対応。

### 3.1 各コンテキストの構造

```
src/contexts/[context-name]/
├── domain/                     ★ ドメイン層（最重要）
│   ├── [entity].ts             エンティティ
│   ├── [value-object].ts       値オブジェクト
│   └── [entity].repository.ts  リポジトリのインターフェース
├── application/                アプリケーション層
│   └── [usecase].usecase.ts    ユースケース（≒ アプリケーションサービス）
└── infrastructure/             インフラ層
    └── [entity].supabase.repository.ts  リポジトリの実装
```

### 3.2 各層の責務

#### domain/ — ★ DDD の本丸

- 集約・エンティティ・値オブジェクトの定義
- ドメインルール（不変条件）の実装
- **他の何にも依存しない**（純粋な TypeScript オブジェクト）
- 例: `game.ts` の `Game` クラスは「打順番号の重複禁止」を自分自身でチェック

#### application/ — ユースケース層

- 1つのユースケースを1つのクラスとして実装
- ドメインオブジェクトを取り出し → ドメインロジック呼び出し → リポジトリに保存
- 例:
  ```typescript
  class CreateGameUseCase {
    constructor(private gameRepo: GameRepository) {}
    async execute(params: {...}): Promise<Result<GameId>> {
      const game = Game.create(params);  // ドメインオブジェクト生成
      await this.gameRepo.save(game);    // 永続化
      return Ok(game.id);
    }
  }
  ```

#### infrastructure/ — インフラ層

- リポジトリインターフェース（domain層で定義）の実装
- Supabase との通信、SQL クエリ、外部API呼び出し
- 例: `game.supabase.repository.ts` が Game 集約を `games` + `inning_scores` 等のテーブルに保存

### 3.3 依存方向（厳守）

```
[ src/app/ ]
    │ 呼び出す
    ▼
[ application/ ]  ──  使う  ──▶  [ domain/ ]
    │
    │ 依存
    ▼
[ infrastructure/ ]  ── 実装 ──▶  [ domain/ のインターフェース ]
```

ポイント:
- **`domain/` は何にも依存しない**（独立して単体テストが書ける）
- **`infrastructure/` は `domain/` のインターフェースを実装する**（依存性逆転原則）
- **コンテキスト間の直接 import は禁止**（境界を尊重）

---

## 4. src/shared/ - 共有カーネル

複数のコンテキストで共通して使う型・ユーティリティ。

```
src/shared/
├── domain/
│   ├── identity.ts             Brand 型による型安全な ID 表現
│   └── result.ts               Result<T, E> 型（例外の代替）
└── infrastructure/
    └── (Supabase の共通設定など)
```

⚠️ **共有カーネルは慎重に**。便利だからといって何でも入れるとコンテキスト分離が形骸化する。**本当に複数コンテキストで必要な汎用型のみ**。

---

## 5. src/lib/ - 既存ライブラリのラッパー

外部ライブラリへの薄いラッパー。

```
src/lib/
├── utils.ts                    cn() ヘルパー（Tailwind クラス結合）
└── supabase/
    ├── client.ts               ブラウザ用 Supabase クライアント
    ├── server.ts               サーバー用 Supabase クライアント
    └── middleware.ts           ミドルウェアでセッション更新
```

---

## 6. supabase/migrations/ - DBスキーマ

[docs/05-er-diagram.md](05-er-diagram.md) の DDL を実 SQL ファイル化したもの。

```
supabase/migrations/
├── 20260520_001_initial_schema.sql       テーブル定義
└── 20260520_002_statistics_views.sql     成績集計用 VIEW
```

ファイル名の数字は実行順序（タイムスタンプ + 連番）。

---

## 7. ファイル別 学習チートシート（Phase 1-D 開始時に使う）

| ファイル | レイヤー | 何をするか |
|---|---|---|
| `src/contexts/X/domain/foo.ts` | ドメイン | エンティティ/値オブジェクトの定義 |
| `src/contexts/X/domain/foo.repository.ts` | ドメイン | リポジトリの**インターフェース** |
| `src/contexts/X/application/bar.usecase.ts` | アプリケーション | 1つのユースケースを実装 |
| `src/contexts/X/infrastructure/foo.supabase.repository.ts` | インフラ | リポジトリの**Supabase実装** |
| `src/app/path/page.tsx` | プレゼンテーション | 画面（ユースケースを呼ぶ） |
| `src/app/path/actions.ts` | プレゼンテーション | Server Actions（フォーム送信先） |
| `src/lib/supabase/*` | ライブラリ | Supabase 通信の共通設定 |
| `src/shared/domain/*` | 共有 | 全コンテキストで使う型 |

---

## 8. Phase 1-D 以降での増え方の例

Phase 1-D スライス1（メンバー登録）の実装で増えるファイル:

```
src/contexts/team-management/
├── domain/
│   ├── member.ts                          ← 増える: Member エンティティ
│   ├── team.ts                            ← 増える: Team 集約ルート
│   ├── member-role.ts                     ← 増える: MemberRole 値オブジェクト
│   ├── member.repository.ts               ← 増える: リポジトリインターフェース
├── application/
│   ├── register-member.usecase.ts         ← 増える: メンバー登録ユースケース
│   └── list-members.usecase.ts            ← 増える: メンバー一覧ユースケース
└── infrastructure/
    └── member.supabase.repository.ts      ← 増える: Supabase 実装
src/app/
├── members/
│   ├── page.tsx                           ← 増える: メンバー一覧画面
│   ├── new/
│   │   └── page.tsx                       ← 増える: メンバー新規登録画面
│   └── actions.ts                         ← 増える: Server Action
```

各ファイルの解説は Phase 1-D で実装時に都度行う。
