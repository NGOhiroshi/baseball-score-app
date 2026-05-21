-- =========================================================================
-- 20260520_002: 成績集計用 VIEW
-- 成績集計コンテキストの読み取りモデル（Read Model）。
-- アプリケーションコードからはこの VIEW を SELECT するだけで成績が取れる。
-- =========================================================================

-- =========================================================================
-- 打撃成績（年度別）
-- =========================================================================
CREATE OR REPLACE VIEW v_player_batting_stats_yearly AS
SELECT
  pa.member_id,
  m.name AS player_name,
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
JOIN members m ON m.id = pa.member_id
WHERE pa.member_id IS NOT NULL
GROUP BY pa.member_id, m.name, EXTRACT(YEAR FROM g.game_date);

-- =========================================================================
-- 打撃成績（通算）
-- =========================================================================
CREATE OR REPLACE VIEW v_player_batting_stats_career AS
SELECT
  pa.member_id,
  m.name AS player_name,
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
JOIN members m ON m.id = pa.member_id
WHERE pa.member_id IS NOT NULL
GROUP BY pa.member_id, m.name;

-- =========================================================================
-- 投手成績（年度別）
-- =========================================================================
CREATE OR REPLACE VIEW v_player_pitching_stats_yearly AS
SELECT
  pap.pitcher_member_id AS member_id,
  m.name AS player_name,
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
JOIN members m ON m.id = pap.pitcher_member_id
WHERE pap.pitcher_member_id IS NOT NULL
GROUP BY pap.pitcher_member_id, m.name, EXTRACT(YEAR FROM g.game_date);

-- =========================================================================
-- 投手成績（通算）
-- =========================================================================
CREATE OR REPLACE VIEW v_player_pitching_stats_career AS
SELECT
  pap.pitcher_member_id AS member_id,
  m.name AS player_name,
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
JOIN members m ON m.id = pap.pitcher_member_id
WHERE pap.pitcher_member_id IS NOT NULL
GROUP BY pap.pitcher_member_id, m.name;
