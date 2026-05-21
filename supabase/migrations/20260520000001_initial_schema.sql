-- =========================================================================
-- 20260520_001: 初期スキーマ
-- docs/05-er-diagram.md の DDL を実体化したもの。
-- Phase 1-C のセットアップで Supabase Dashboard の SQL Editor から流す。
-- =========================================================================

-- =========================================================================
-- 1. チーム管理コンテキスト
-- =========================================================================

CREATE TABLE teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE guest_players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guest_players_team ON guest_players(team_id);

-- =========================================================================
-- 2. 試合記録コンテキスト
-- =========================================================================

CREATE TABLE games (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  game_date     DATE NOT NULL,
  opponent_name TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_games_team_date ON games(team_id, game_date DESC);

CREATE TABLE inning_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id         UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  inning_number   SMALLINT NOT NULL CHECK (inning_number >= 1),
  our_score       SMALLINT NOT NULL DEFAULT 0 CHECK (our_score >= 0),
  opponent_score  SMALLINT NOT NULL DEFAULT 0 CHECK (opponent_score >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, inning_number)
);

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

CREATE TABLE plate_appearances (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id            UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  member_id          UUID REFERENCES members(id) ON DELETE SET NULL,
  guest_player_id    UUID REFERENCES guest_players(id) ON DELETE SET NULL,
  inning             SMALLINT NOT NULL CHECK (inning >= 1),
  sequence_in_inning SMALLINT NOT NULL DEFAULT 1,
  result_category    TEXT NOT NULL CHECK (result_category IN ('hit','walk','out','sacrifice','errorOnly')),
  hit_type           TEXT CHECK (hit_type IN ('single','double','triple','homerun')),
  walk_type          TEXT CHECK (walk_type IN ('baseOnBalls','hitByPitch')),
  out_type           TEXT CHECK (out_type IN ('strikeout','groundOut','flyOut')),
  sacrifice_type     TEXT CHECK (sacrifice_type IN ('bunt','fly')),
  had_error          BOOLEAN NOT NULL DEFAULT FALSE,
  batting_direction  TEXT CHECK (batting_direction IN ('left','center','right','infield')),
  fielder_position   SMALLINT CHECK (fielder_position BETWEEN 1 AND 9),
  runs_batted_in     SMALLINT NOT NULL DEFAULT 0 CHECK (runs_batted_in >= 0),
  run_scored         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (member_id IS NOT NULL AND guest_player_id IS NULL) OR
    (member_id IS NULL     AND guest_player_id IS NOT NULL)
  ),
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

-- =========================================================================
-- 3. シード（MVP は単一チーム「スミスブラザーズ」のみ）
-- =========================================================================

INSERT INTO teams (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'スミスブラザーズ');
