-- =========================================================================
-- 20260523_005: 選手の打球分布 VIEW（打球傾向の表示用）
--
-- 選手×年度ごとに、打球位置から導いた方向（左/中/右/内野）の本数と、
-- 三振数・打席数を返す。打球傾向の表示と「異名（一言）」算出に使う。
--   7（左翼）→ 左, 8（中堅）→ 中, 9（右翼）→ 右, 1〜6 → 内野
-- RLS を効かせるため security_invoker=true。
-- =========================================================================

CREATE OR REPLACE VIEW v_player_spray_by_year
WITH (security_invoker = true) AS
SELECT
  g.team_id,
  CASE WHEN pa.member_id IS NOT NULL THEN 'member' ELSE 'guest' END AS player_kind,
  COALESCE(pa.member_id, pa.guest_player_id) AS player_id,
  EXTRACT(YEAR FROM g.game_date)::int AS year,
  COUNT(*) FILTER (WHERE pa.fielder_position = 7) AS left_count,
  COUNT(*) FILTER (WHERE pa.fielder_position = 8) AS center_count,
  COUNT(*) FILTER (WHERE pa.fielder_position = 9) AS right_count,
  COUNT(*) FILTER (WHERE pa.fielder_position BETWEEN 1 AND 6) AS infield_count,
  COUNT(*) FILTER (
    WHERE pa.result_category = 'out' AND pa.out_type = 'strikeout'
  ) AS strikeouts,
  COUNT(*) AS plate_appearances
FROM plate_appearances pa
JOIN games g ON g.id = pa.game_id
GROUP BY
  g.team_id,
  (CASE WHEN pa.member_id IS NOT NULL THEN 'member' ELSE 'guest' END),
  COALESCE(pa.member_id, pa.guest_player_id),
  EXTRACT(YEAR FROM g.game_date);
