# ER 図と DB スキーマ設計

> **このドキュメントの目的**
> Phase 1-A のドメインモデルを Supabase（PostgreSQL）のテーブル構造に落とし込む。Phase 1-C でこの設計をマイグレーション SQL として実装する。
>
> **DDD的位置づけ**
> ドメインモデルとDBスキーマは **1対1ではない**。集約ルート単位でテーブルが切られる一方、値オブジェクトはカラムや子テーブルとして表現される。**インフラ層（infrastructure/）のリポジトリ実装で、テーブル ↔ 集約の変換を担う**。

---

## 0. 設計方針

1. **主キーは UUID**（Supabase 標準、テナント間衝突を避けるため Phase 2 を見据えて）
2. **すべてのテーブルに `team_id` を持たせる**（Phase 2 のマルチテナント化で RLS を効かせやすい）
3. **`created_at` / `updated_at` を全テーブルに付与**（運用・デバッグ用）
4. **物理削除を基本とする**（MVP では論理削除を採用しない。データの肥大化を避ける）
5. **CHECK 制約・UNIQUE 制約でドメインの不変条件をDB側でも守る**
6. **外部キーは `ON DELETE CASCADE` を試合関連で使用**（試合を消すと打席等も連鎖削除）

---

## 1. ER 図（テキスト版）

```
┌─────────────────────────────────────────────────────────────┐
│                 【チーム管理コンテキスト】                     │
└─────────────────────────────────────────────────────────────┘

  ┌──────────────────┐
  │     teams        │
  ├──────────────────┤
  │ id (PK)          │◄────────────────────┐
  │ name             │                     │
  └──────────────────┘                     │
                                           │
        ┌──────────────────────────────────┼──────────────────┐
        │                                  │                  │
        │  ┌──────────────────┐    ┌──────────────────┐       │
        │  │    members       │    │ guest_players    │       │
        │  ├──────────────────┤    ├──────────────────┤       │
        │  │ id (PK)          │    │ id (PK)          │       │
        │  │ team_id (FK)─────┼────┤ team_id (FK)─────┘       │
        │  │ name             │    │ name             │       │
        │  │ photo_url        │    │ created_at       │       │
        │  │ role             │    └──────────────────┘       │
        │  │ auth_user_id     │                               │
        │  └──────────────────┘                               │
        │                                                     │
┌───────┼─────────────────────────────────────────────────────┼─┐
│       │            【試合記録コンテキスト】                  │ │
└───────┼─────────────────────────────────────────────────────┼─┘
        │                                                     │
  ┌─────▼──────────┐                                          │
  │    games       │                                          │
  ├────────────────┤                                          │
  │ id (PK)        │◄─────────────────────────────────────────┤
  │ team_id (FK)   │                                          │
  │ game_date      │                                          │
  │ opponent_name  │                                          │
  └─┬──────────────┘                                          │
    │                                                         │
    │  CASCADE                                                │
    │                                                         │
    ├──────────────────────┬─────────────────────┬────────────┤
    │                      │                     │            │
    ▼                      ▼                     ▼            │
  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┴┐
  │inning_scores │  │batting_order_    │  │ plate_appearances │
  ├──────────────┤  │entries           │  ├───────────────────┤
  │ game_id (FK) │  ├──────────────────┤  │ game_id (FK)      │
  │ inning_no    │  │ game_id (FK)     │  │ member_id (FK)? ──│──→ members
  │ our_score    │  │ order_number     │  │ guest_player_id ──│──→ guest_players
  │ opponent_sc  │  │ member_id (FK)? ─┼──→members            │
  └──────────────┘  │ guest_player_id ─┼──→guest_players      │
                    │ position         │  │ inning            │
                    └──────────────────┘  │ result_category   │
                                          │ hit_type          │
  ┌──────────────────────────────────┐    │ walk_type         │
  │   pitching_appearances           │    │ out_type          │
  ├──────────────────────────────────┤    │ sacrifice_type    │
  │ id (PK)                          │    │ had_error         │
  │ game_id (FK)                     │    │ batting_direction │
  │ pitcher_member_id (FK)?    ──────┼──→ │ fielder_position  │
  │ pitcher_guest_player_id (FK)? ───┼──→ │ runs_batted_in    │
  │ entered_at_inning                │    │ run_scored        │
  └─┬────────────────────────────────┘    └───────────────────┘
    │
    │  CASCADE
    │
    ▼
  ┌──────────────────────────────┐
  │  inning_pitched_records      │
  ├──────────────────────────────┤
  │ id (PK)                      │
  │ pitching_appearance_id (FK)  │
  │ inning_number                │
  │ outs_recorded                │
  │ runs_allowed                 │
  │ earned_runs                  │
  │ hits_allowed                 │
  │ strikeouts                   │
  │ walks_allowed                │
  └──────────────────────────────┘
```

---

## 2. テーブル定義（DDL）

### 2.1 teams

```sql
CREATE TABLE teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**MVP の運用**: スミスブラザーズの 1 行のみ。Phase 2 のマルチテナント化で複数行になる。

---

### 2.2 members

```sql
CREATE TABLE members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  photo_url     TEXT,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'regular')),
  auth_user_id  UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_members_team ON members(team_id);
```

**ポイント**:
- `auth_user_id` は Supabase の `auth.users` テーブルに紐づける（ログイン認証連携）
- `auth_user_id` は NULL を許容（ログインしない選手も登録可能）
- `auth_user_id` が NULL のメンバーは「閲覧用に登録されているが、本人はログインしない」状態

---

### 2.3 guest_players

```sql
CREATE TABLE guest_players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guest_players_team ON guest_players(team_id);
```

**注意**: リピートする助っ人はメンバー化する運用なので、`guest_players` は「その試合限りの臨時選手」のみ。

---

### 2.4 games

```sql
CREATE TABLE games (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  game_date     DATE NOT NULL,
  opponent_name TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_games_team_date ON games(team_id, game_date DESC);
```

---

### 2.5 inning_scores

```sql
CREATE TABLE inning_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id         UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  inning_number   SMALLINT NOT NULL CHECK (inning_number >= 1),
  our_score       SMALLINT NOT NULL DEFAULT 0 CHECK (our_score >= 0),
  opponent_score  SMALLINT NOT NULL DEFAULT 0 CHECK (opponent_score >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, inning_number)
);
```

**最終スコアの取得方法**: `SELECT SUM(our_score), SUM(opponent_score) FROM inning_scores WHERE game_id = ?`

---

### 2.6 batting_order_entries

```sql
CREATE TABLE batting_order_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id          UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  order_number     SMALLINT NOT NULL CHECK (order_number >= 1),
  member_id        UUID REFERENCES members(id) ON DELETE SET NULL,
  guest_player_id  UUID REFERENCES guest_players(id) ON DELETE SET NULL,
  position         SMALLINT CHECK (position BETWEEN 1 AND 9),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, order_number),
  CHECK (
    (member_id IS NOT NULL AND guest_player_id IS NULL) OR
    (member_id IS NULL     AND guest_player_id IS NOT NULL)
  )
);
```

**ポイント**:
- `member_id` と `guest_player_id` は**排他**（CHECK 制約で保証）
- どちらか一方だけが NOT NULL
- メンバー削除時は `ON DELETE SET NULL` で過去データは残す

> 🎯 **DDD学習ポイント — PlayerId の値オブジェクトとテーブル設計のズレ**:
> ドメインモデルでは `PlayerId = MemberId | GuestPlayerId` という合成型として扱った。DBではこれを「2つのnullable FKカラム + CHECK制約」で表現する。**ドメインモデルとテーブル構造の不一致を、リポジトリ層で吸収する**のが典型パターン。

---

### 2.7 plate_appearances

```sql
CREATE TABLE plate_appearances (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id            UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  member_id          UUID REFERENCES members(id) ON DELETE SET NULL,
  guest_player_id    UUID REFERENCES guest_players(id) ON DELETE SET NULL,
  inning             SMALLINT NOT NULL CHECK (inning >= 1),
  sequence_in_inning SMALLINT NOT NULL DEFAULT 1,  -- 同イニング内の打席順
  result_category    TEXT NOT NULL CHECK (result_category IN ('hit','walk','out','sacrifice','errorOnly')),
  hit_type           TEXT CHECK (hit_type IN ('single','double','triple','homerun')),
  walk_type          TEXT CHECK (walk_type IN ('baseOnBalls','hitByPitch')),
  out_type           TEXT CHECK (out_type IN ('strikeout','groundOut','flyOut')),
  sacrifice_type     TEXT CHECK (sacrifice_type IN ('bunt','fly')),
  had_error          BOOLEAN NOT NULL DEFAULT FALSE,
  batting_direction  TEXT CHECK (batting_direction IN ('left', 'center', 'right', 'infield')),   -- 4分類: 左/中/右/内野
  fielder_position   SMALLINT CHECK (fielder_position BETWEEN 1 AND 9),
  runs_batted_in     SMALLINT NOT NULL DEFAULT 0 CHECK (runs_batted_in >= 0),
  run_scored         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (member_id IS NOT NULL AND guest_player_id IS NULL) OR
    (member_id IS NULL     AND guest_player_id IS NOT NULL)
  ),
  -- カテゴリと下位カテゴリの整合性
  CHECK (
    (result_category = 'hit'        AND hit_type IS NOT NULL AND walk_type IS NULL AND out_type IS NULL AND sacrifice_type IS NULL) OR
    (result_category = 'walk'       AND hit_type IS NULL AND walk_type IS NOT NULL AND out_type IS NULL AND sacrifice_type IS NULL AND had_error = FALSE) OR
    (result_category = 'out'        AND hit_type IS NULL AND walk_type IS NULL AND out_type IS NOT NULL AND sacrifice_type IS NULL AND had_error = FALSE) OR
    (result_category = 'sacrifice'  AND hit_type IS NULL AND walk_type IS NULL AND out_type IS NULL AND sacrifice_type IS NOT NULL AND had_error = FALSE) OR
    (result_category = 'errorOnly'  AND hit_type IS NULL AND walk_type IS NULL AND out_type IS NULL AND sacrifice_type IS NULL AND had_error = FALSE)
  )
);

CREATE INDEX idx_plate_app_game ON plate_appearances(game_id);
CREATE INDEX idx_plate_app_member ON plate_appearances(member_id) WHERE member_id IS NOT NULL;
```

**ポイント**:
- 大きな CHECK 制約で `BatResult` 判別共用体の制約を DB レベルで守る
- `had_error` は `hit` カテゴリでのみ TRUE 可能（他カテゴリでは FALSE 固定）
- インデックス: 試合別の閲覧と、選手別の成績集計のため2種類

---

### 2.8 pitching_appearances

```sql
CREATE TABLE pitching_appearances (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id                  UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  pitcher_member_id        UUID REFERENCES members(id) ON DELETE SET NULL,
  pitcher_guest_player_id  UUID REFERENCES guest_players(id) ON DELETE SET NULL,
  entered_at_inning        SMALLINT NOT NULL CHECK (entered_at_inning >= 1),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (pitcher_member_id IS NOT NULL AND pitcher_guest_player_id IS NULL) OR
    (pitcher_member_id IS NULL     AND pitcher_guest_player_id IS NOT NULL)
  )
);

CREATE INDEX idx_pitch_app_game ON pitching_appearances(game_id);
CREATE INDEX idx_pitch_app_member ON pitching_appearances(pitcher_member_id) WHERE pitcher_member_id IS NOT NULL;
```

---

### 2.9 inning_pitched_records

```sql
CREATE TABLE inning_pitched_records (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitching_appearance_id   UUID NOT NULL REFERENCES pitching_appearances(id) ON DELETE CASCADE,
  inning_number            SMALLINT NOT NULL CHECK (inning_number >= 1),
  outs_recorded            SMALLINT NOT NULL CHECK (outs_recorded BETWEEN 0 AND 3),
  runs_allowed             SMALLINT NOT NULL DEFAULT 0 CHECK (runs_allowed >= 0),
  earned_runs              SMALLINT NOT NULL DEFAULT 0 CHECK (earned_runs >= 0),
  hits_allowed             SMALLINT NOT NULL DEFAULT 0 CHECK (hits_allowed >= 0),
  strikeouts               SMALLINT NOT NULL DEFAULT 0 CHECK (strikeouts >= 0),
  walks_allowed            SMALLINT NOT NULL DEFAULT 0 CHECK (walks_allowed >= 0),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pitching_appearance_id, inning_number),
  CHECK (earned_runs <= runs_allowed)
);
```

**ポイント**:
- `CHECK (earned_runs <= runs_allowed)` でドメインルールを DB レベルで保証
- `outs_recorded` の上限 3 も同様

---

## 3. ドメインの不変条件 → DB 制約のマッピング

| ドメインルール | DB 表現 |
|---|---|
| 打席結果の排他（5カテゴリから1つ） | `result_category` + 巨大 CHECK 制約 |
| 「安打+失策」のみ重複可 | `had_error = TRUE` は `result_category = 'hit'` の時のみ許可（CHECK） |
| 打順番号が試合内で重複しない | `UNIQUE (game_id, order_number)` |
| イニング番号が試合内で重複しない（スコア） | `UNIQUE (game_id, inning_number)` |
| 自責点 ≤ 失点 | `CHECK (earned_runs <= runs_allowed)` |
| アウト数は 0〜3 | `CHECK (outs_recorded BETWEEN 0 AND 3)` |
| 選手は Member か Guest のどちらか一方 | 2つのFK + 排他 CHECK 制約 |

---

## 4. 成績集計用 View（読み取りモデル）

成績集計コンテキストでは、上記テーブルを SELECT で集計するクエリを VIEW として用意する。

### 4.1 打撃成績ビュー（年度別）

```sql
CREATE VIEW v_player_batting_stats_yearly AS
SELECT
  pa.member_id,
  m.name AS player_name,
  EXTRACT(YEAR FROM g.game_date)::INT AS year,
  COUNT(*) AS plate_appearances,
  COUNT(*) FILTER (WHERE pa.result_category NOT IN ('walk','sacrifice')) AS at_bats,
  COUNT(*) FILTER (WHERE pa.result_category = 'hit') AS hits,
  COUNT(*) FILTER (WHERE pa.result_category = 'hit' AND pa.hit_type = 'homerun') AS home_runs,
  COALESCE(SUM(pa.runs_batted_in), 0) AS runs_batted_in,
  COUNT(*) FILTER (WHERE pa.run_scored = TRUE) AS runs_scored,
  -- 打率の小数3桁
  ROUND(
    COUNT(*) FILTER (WHERE pa.result_category = 'hit')::NUMERIC
    / NULLIF(COUNT(*) FILTER (WHERE pa.result_category NOT IN ('walk','sacrifice')), 0),
    3
  ) AS batting_average
FROM plate_appearances pa
JOIN games g ON g.id = pa.game_id
JOIN members m ON m.id = pa.member_id
WHERE pa.member_id IS NOT NULL  -- 助っ人は通算成績には含めない方針
GROUP BY pa.member_id, m.name, EXTRACT(YEAR FROM g.game_date);
```

### 4.2 投手成績ビュー（年度別）

```sql
CREATE VIEW v_player_pitching_stats_yearly AS
SELECT
  pap.pitcher_member_id AS member_id,
  m.name AS player_name,
  EXTRACT(YEAR FROM g.game_date)::INT AS year,
  -- 投球回（合計アウト数 → X.Y形式）
  SUM(ipr.outs_recorded) AS total_outs,
  (SUM(ipr.outs_recorded) / 3) AS full_innings,
  (SUM(ipr.outs_recorded) % 3) AS partial_outs,
  SUM(ipr.runs_allowed)  AS runs_allowed,
  SUM(ipr.earned_runs)   AS earned_runs,
  SUM(ipr.hits_allowed)  AS hits_allowed,
  SUM(ipr.strikeouts)    AS strikeouts,
  SUM(ipr.walks_allowed) AS walks_allowed,
  -- 防御率 = 自責点 × 9 / 投球回（小数2桁）
  ROUND(
    (SUM(ipr.earned_runs)::NUMERIC * 9)
    / NULLIF(SUM(ipr.outs_recorded)::NUMERIC / 3, 0),
    2
  ) AS earned_run_average
FROM inning_pitched_records ipr
JOIN pitching_appearances pap ON pap.id = ipr.pitching_appearance_id
JOIN games g ON g.id = pap.game_id
JOIN members m ON m.id = pap.pitcher_member_id
WHERE pap.pitcher_member_id IS NOT NULL
GROUP BY pap.pitcher_member_id, m.name, EXTRACT(YEAR FROM g.game_date);
```

> 💡 通算成績は同様のクエリで `EXTRACT(YEAR ...)` を GROUP BY から外す形で `v_player_batting_stats_career` を用意する。

---

## 5. Phase 2 への準備

| Phase 2 機能 | 必要な変更 |
|---|---|
| マルチテナント化 | `teams.id` を RLS の判定キーに使う。全テーブルの `team_id` を必須 FK にしている既存設計で対応可能 |
| 過去データインポート | `games.is_historical` のような Boolean カラム追加で識別、または別テーブル |
| 機密情報管理 | `team_secrets` テーブルを別途追加。暗号化カラムで保存 |
| 代打・代走 | `batting_order_entries` に対する `substitutions` テーブル追加 |

---

## 6. マイグレーション戦略

Phase 1-C で Supabase に流し込む際の方針：

1. **Supabase Migration ファイルとして管理**（`supabase/migrations/` 配下に SQL を置く）
2. **シード用 SQL を別途用意**（スミスブラザーズチームのレコード作成）
3. **VIEW は別マイグレーションに分離**（テーブル変更時に DROP/CREATE が必要なため）

---

## 7. 次フェーズ（Phase 1-C）に持ち越す決定事項

- Supabase の Auth テーブルとの連携詳細（招待フロー、初回ログイン時の members 紐付け）
- RLS（Row Level Security）ポリシーは MVP では緩めに（自テーブル team_id = current_user の team_id のみ）
- ストレージ（顔写真の保存先 → Supabase Storage）
