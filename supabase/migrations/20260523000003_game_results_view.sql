-- =========================================================================
-- 20260523_003: 試合結果 VIEW（直近フォーム表示用）
--
-- 試合ごとの自/相手合計と勝敗（win/loss/draw/none）を返す。
-- 直近の連勝・連敗などの「勢い」を表示するために使う。
-- RLS を効かせるため security_invoker=true。
-- =========================================================================

CREATE OR REPLACE VIEW v_game_results
WITH (security_invoker = true) AS
SELECT
  g.id          AS game_id,
  g.team_id,
  g.game_date,
  g.opponent_name,
  COALESCE(s.our, 0) AS our_score,
  COALESCE(s.opp, 0) AS opp_score,
  CASE
    WHEN s.game_id IS NULL THEN 'none'
    WHEN s.our > s.opp THEN 'win'
    WHEN s.our < s.opp THEN 'loss'
    ELSE 'draw'
  END AS result
FROM games g
LEFT JOIN (
  SELECT game_id,
    SUM(our_score) AS our,
    SUM(opponent_score) AS opp
  FROM inning_scores
  GROUP BY game_id
) s ON s.game_id = g.id;
