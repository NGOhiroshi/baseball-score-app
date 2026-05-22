-- =========================================================================
-- 20260522_002: 成績集計 VIEW を「メンバー＋助っ人」両対応に作り直す
--
-- 旧 VIEW は members のみを集計対象にしていた（member_id 列）。
-- 助っ人も集計対象に含めるため、plate_appearances / pitching_appearances の
-- member_id・guest_player_id の双方を LEFT JOIN し、選手を
--   player_kind ('member'|'guest') + player_id + player_name
-- という統一した読み取りモデルの列で表現する。
--
-- 列名（member_id → player_kind/player_id）が変わるため CREATE OR REPLACE では
-- 置換できない。一旦 DROP してから作り直す。
-- =========================================================================

DROP VIEW IF EXISTS v_player_batting_stats_yearly;
DROP VIEW IF EXISTS v_player_batting_stats_career;
DROP VIEW IF EXISTS v_player_pitching_stats_yearly;
DROP VIEW IF EXISTS v_player_pitching_stats_career;

-- =========================================================================
-- 打撃成績（年度別）
-- =========================================================================
CREATE VIEW v_player_batting_stats_yearly AS
SELECT
  g.team_id,
  CASE WHEN pa.member_id IS NOT NULL THEN 'member' ELSE 'guest' END AS player_kind,
  COALESCE(pa.member_id, pa.guest_player_id) AS player_id,
  COALESCE(m.name, gp.name) AS player_name,
  EXTRACT(YEAR FROM g.game_date)::INT AS year,
  COUNT(*) AS plate_appearances,
  COUNT(*) FILTER (WHERE pa.result_category NOT IN ('walk','sacrifice')) AS at_bats,
  COUNT(*) FILTER (WHERE pa.result_category = 'hit') AS hits,
  COUNT(*) FILTER (WHERE pa.result_category = 'hit' AND pa.hit_type = 'homerun') AS home_runs,
  COALESCE(SUM(pa.runs_batted_in), 0)::INT AS runs_batted_in,
  COUNT(*) FILTER (WHERE pa.run_scored = TRUE) AS runs_scored,
  ROUND(
    COUNT(*) FILTER (WHERE pa.result_category = 'hit')::NUMERIC
    / NULLIF(COUNT(*) FILTER (WHERE pa.result_category NOT IN ('walk','sacrifice')), 0),
    3
  ) AS batting_average
FROM plate_appearances pa
JOIN games g ON g.id = pa.game_id
LEFT JOIN members m ON m.id = pa.member_id
LEFT JOIN guest_players gp ON gp.id = pa.guest_player_id
GROUP BY
  g.team_id,
  CASE WHEN pa.member_id IS NOT NULL THEN 'member' ELSE 'guest' END,
  COALESCE(pa.member_id, pa.guest_player_id),
  COALESCE(m.name, gp.name),
  EXTRACT(YEAR FROM g.game_date);

-- =========================================================================
-- 打撃成績（通算）
-- =========================================================================
CREATE VIEW v_player_batting_stats_career AS
SELECT
  g.team_id,
  CASE WHEN pa.member_id IS NOT NULL THEN 'member' ELSE 'guest' END AS player_kind,
  COALESCE(pa.member_id, pa.guest_player_id) AS player_id,
  COALESCE(m.name, gp.name) AS player_name,
  COUNT(*) AS plate_appearances,
  COUNT(*) FILTER (WHERE pa.result_category NOT IN ('walk','sacrifice')) AS at_bats,
  COUNT(*) FILTER (WHERE pa.result_category = 'hit') AS hits,
  COUNT(*) FILTER (WHERE pa.result_category = 'hit' AND pa.hit_type = 'homerun') AS home_runs,
  COALESCE(SUM(pa.runs_batted_in), 0)::INT AS runs_batted_in,
  COUNT(*) FILTER (WHERE pa.run_scored = TRUE) AS runs_scored,
  ROUND(
    COUNT(*) FILTER (WHERE pa.result_category = 'hit')::NUMERIC
    / NULLIF(COUNT(*) FILTER (WHERE pa.result_category NOT IN ('walk','sacrifice')), 0),
    3
  ) AS batting_average
FROM plate_appearances pa
JOIN games g ON g.id = pa.game_id
LEFT JOIN members m ON m.id = pa.member_id
LEFT JOIN guest_players gp ON gp.id = pa.guest_player_id
GROUP BY
  g.team_id,
  CASE WHEN pa.member_id IS NOT NULL THEN 'member' ELSE 'guest' END,
  COALESCE(pa.member_id, pa.guest_player_id),
  COALESCE(m.name, gp.name);

-- =========================================================================
-- 投手成績（年度別）
-- =========================================================================
CREATE VIEW v_player_pitching_stats_yearly AS
SELECT
  g.team_id,
  CASE WHEN pap.pitcher_member_id IS NOT NULL THEN 'member' ELSE 'guest' END AS player_kind,
  COALESCE(pap.pitcher_member_id, pap.pitcher_guest_player_id) AS player_id,
  COALESCE(m.name, gp.name) AS player_name,
  EXTRACT(YEAR FROM g.game_date)::INT AS year,
  SUM(ipr.outs_recorded)::INT AS total_outs,
  (SUM(ipr.outs_recorded) / 3)::INT AS full_innings,
  (SUM(ipr.outs_recorded) % 3)::INT AS partial_outs,
  SUM(ipr.runs_allowed)::INT  AS runs_allowed,
  SUM(ipr.earned_runs)::INT   AS earned_runs,
  SUM(ipr.hits_allowed)::INT  AS hits_allowed,
  SUM(ipr.strikeouts)::INT    AS strikeouts,
  SUM(ipr.walks_allowed)::INT AS walks_allowed,
  ROUND(
    (SUM(ipr.earned_runs)::NUMERIC * 9)
    / NULLIF(SUM(ipr.outs_recorded)::NUMERIC / 3, 0),
    2
  ) AS earned_run_average
FROM inning_pitched_records ipr
JOIN pitching_appearances pap ON pap.id = ipr.pitching_appearance_id
JOIN games g ON g.id = pap.game_id
LEFT JOIN members m ON m.id = pap.pitcher_member_id
LEFT JOIN guest_players gp ON gp.id = pap.pitcher_guest_player_id
GROUP BY
  g.team_id,
  CASE WHEN pap.pitcher_member_id IS NOT NULL THEN 'member' ELSE 'guest' END,
  COALESCE(pap.pitcher_member_id, pap.pitcher_guest_player_id),
  COALESCE(m.name, gp.name),
  EXTRACT(YEAR FROM g.game_date);

-- =========================================================================
-- 投手成績（通算）
-- =========================================================================
CREATE VIEW v_player_pitching_stats_career AS
SELECT
  g.team_id,
  CASE WHEN pap.pitcher_member_id IS NOT NULL THEN 'member' ELSE 'guest' END AS player_kind,
  COALESCE(pap.pitcher_member_id, pap.pitcher_guest_player_id) AS player_id,
  COALESCE(m.name, gp.name) AS player_name,
  SUM(ipr.outs_recorded)::INT AS total_outs,
  (SUM(ipr.outs_recorded) / 3)::INT AS full_innings,
  (SUM(ipr.outs_recorded) % 3)::INT AS partial_outs,
  SUM(ipr.runs_allowed)::INT  AS runs_allowed,
  SUM(ipr.earned_runs)::INT   AS earned_runs,
  SUM(ipr.hits_allowed)::INT  AS hits_allowed,
  SUM(ipr.strikeouts)::INT    AS strikeouts,
  SUM(ipr.walks_allowed)::INT AS walks_allowed,
  ROUND(
    (SUM(ipr.earned_runs)::NUMERIC * 9)
    / NULLIF(SUM(ipr.outs_recorded)::NUMERIC / 3, 0),
    2
  ) AS earned_run_average
FROM inning_pitched_records ipr
JOIN pitching_appearances pap ON pap.id = ipr.pitching_appearance_id
JOIN games g ON g.id = pap.game_id
LEFT JOIN members m ON m.id = pap.pitcher_member_id
LEFT JOIN guest_players gp ON gp.id = pap.pitcher_guest_player_id
GROUP BY
  g.team_id,
  CASE WHEN pap.pitcher_member_id IS NOT NULL THEN 'member' ELSE 'guest' END,
  COALESCE(pap.pitcher_member_id, pap.pitcher_guest_player_id),
  COALESCE(m.name, gp.name);
