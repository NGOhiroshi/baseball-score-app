# 境界づけられたコンテキスト（src/contexts/）

このディレクトリは [docs/02-bounded-contexts.md](../../docs/02-bounded-contexts.md) で定義した3つのコンテキストに対応します。

## コンテキスト一覧

```
contexts/
├── team-management/       チーム・メンバー・助っ人の管理
├── game-recording/        試合・打順・打席結果・投手記録
└── statistics/            打撃成績・投手成績の集計
```

## 各コンテキストの3層構造

すべてのコンテキストは以下の3層に分割されます（依存方向は上→下のみ）:

```
[ presentation (src/app/) ]
        │
        ▼  呼び出し
┌─────────────────────────────────┐
│ application/                    │ ← ユースケース（薄い指揮者）
│   - createGame.usecase.ts       │   ドメインを操作してリポジトリに保存
│   - recordPlateAppearance.ts    │
├─────────────────────────────────┤
│ domain/                         │ ← 集約・エンティティ・値オブジェクト
│   - game.ts                     │   ★ ドメインルールはここに集約
│   - plate-appearance.ts         │
│   - bat-result.ts               │
├─────────────────────────────────┤
│ infrastructure/                 │ ← リポジトリ実装、外部API呼び出し
│   - game.repository.ts          │   Supabase との通信などはここに隔離
└─────────────────────────────────┘
```

## ⚠️ 依存方向のルール

- `domain/` は他のどの層・他のコンテキストにも依存しない（純粋なTSオブジェクト）
- `application/` は同じコンテキストの `domain/` のみに依存
- `infrastructure/` は同じコンテキストの `domain/`、共通の `src/lib/`、`src/shared/` に依存可
- **コンテキスト間の直接 import は禁止**。必要なら `application/` で薄いインターフェース経由

## 命名規約

| ファイル種別 | 命名 | 例 |
|---|---|---|
| エンティティ | `[名前].ts` | `game.ts`, `member.ts` |
| 値オブジェクト | `[名前].ts` | `bat-result.ts`, `score.ts` |
| ユースケース | `[動詞-名詞].usecase.ts` | `create-game.usecase.ts` |
| リポジトリインターフェース | `[エンティティ].repository.ts` | `game.repository.ts`（domain層） |
| リポジトリ実装 | `[エンティティ].supabase.repository.ts` | `game.supabase.repository.ts`（infrastructure層） |

詳細は [docs/07-code-structure.md](../../docs/07-code-structure.md) を参照。
