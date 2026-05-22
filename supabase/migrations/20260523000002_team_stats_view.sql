-- =========================================================================
-- 20260523_002: チーム成績の年度別集計 VIEW
--
-- 年度（team_id, year）ごとに、勝敗・チーム打撃・チーム投手の「生の合計値」を返す。
-- 通算はアプリ側で年度行を合算し、率（打率・防御率）は合計から再計算する
-- （年度別の率を平均してはいけないため）。年度推移もこの行をそのまま使う。
--
-- RLS を効かせるため security_invoker=true（閲覧ユーザーの権限で実行）。
-- =========================================================================

CREATE OR REPLACE VIEW v_team_stats_by_year
WITH (security_invoker = true) AS
WITH game_scored AS (
  -- 試合ごとの自/相手合計と「スコア入力済みか」
  SELECT
    g.id,
    g.team_id,
    EXTRACT(YEAR FROM g.game_date)::int AS year,
    COALESCE(s.our, 0) AS our,
    COALESCE(s.opp, 0) AS opp,
    (s.game_id IS NOT NULL) AS has_score
  FROM games g
  LEFT JOIN (
    SELECT game_id,
      SUM(our_score) AS our,
      SUM(opponent_score) AS opp
    FROM inning_scores
    GROUP BY game_id
  ) s ON s.game_id = g.id
),
results AS (
  SELECT
    team_id,
    year,
    COUNT(*) AS games,
    COUNT(*) FILTER (WHERE our > opp) AS wins,
    COUNT(*) FILTER (WHERE our < opp) AS losses,
    COUNT(*) FILTER (WHERE has_score AND our = opp) AS draws
  FROM game_scored
  GROUP BY team_id, year
),
batting AS (
  SELECT
    g.team_id,
    EXTRACT(YEAR FROM g.game_date)::int AS year,
    COUNT(*) AS plate_appearances,
    COUNT(*) FILTER (WHERE pa.result_category NOT IN ('walk','sacrifice')) AS at_bats,
    COUNT(*) FILTER (WHERE pa.result_category = 'hit') AS hits,
    COUNT(*) FILTER (WHERE pa.result_category = 'hit' AND pa.hit_type = 'homerun') AS home_runs,
    COALESCE(SUM(pa.runs_batted_in), 0)::int AS runs_batted_in,
    COUNT(*) FILTER (WHERE pa.run_scored = TRUE) AS runs_scored
  FROM plate_appearances pa
  JOIN games g ON g.id = pa.game_id
  GROUP BY g.team_id, EXTRACT(YEAR FROM g.game_date)
),
pitching AS (
  SELECT
    g.team_id,
    EXTRACT(YEAR FROM g.game_date)::int AS year,
    SUM(ipr.outs_recorded)::int AS outs,
    SUM(ipr.runs_allowed)::int  AS runs_allowed,
    SUM(ipr.earned_runs)::int   AS earned_runs,
    SUM(ipr.hits_allowed)::int  AS hits_allowed,
    SUM(ipr.strikeouts)::int    AS strikeouts,
    SUM(ipr.walks_allowed)::int AS walks_allowed
  FROM inning_pitched_records ipr
  JOIN pitching_appearances pap ON pap.id = ipr.pitching_appearance_id
  JOIN games g ON g.id = pap.game_id
  GROUP BY g.team_id, EXTRACT(YEAR FROM g.game_date)
)
SELECT
  r.team_id,
  r.year,
  r.games,
  r.wins,
  r.losses,
  r.draws,
  COALESCE(b.plate_appearances, 0) AS plate_appearances,
  COALESCE(b.at_bats, 0)           AS at_bats,
  COALESCE(b.hits, 0)              AS hits,
  COALESCE(b.home_runs, 0)         AS home_runs,
  COALESCE(b.runs_batted_in, 0)    AS runs_batted_in,
  COALESCE(b.runs_scored, 0)       AS runs_scored,
  COALESCE(p.outs, 0)              AS outs,
  COALESCE(p.runs_allowed, 0)      AS runs_allowed,
  COALESCE(p.earned_runs, 0)       AS earned_runs,
  COALESCE(p.hits_allowed, 0)      AS hits_allowed,
  COALESCE(p.strikeouts, 0)        AS strikeouts,
  COALESCE(p.walks_allowed, 0)     AS walks_allowed
FROM results r
LEFT JOIN batting b ON b.team_id = r.team_id AND b.year = r.year
LEFT JOIN pitching p ON p.team_id = r.team_id AND p.year = r.year;
