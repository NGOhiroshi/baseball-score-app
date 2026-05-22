-- =========================================================================
-- 20260523_004: チーム設定（成績の規定係数）を teams に追加
--
-- タイトルホルダーの規定打席・規定投球回は「試合数 × 係数」で算出する。
-- この係数をチームごとに保持し、管理者が設定画面から調整できるようにする。
-- 草野球の試合数は少ないため既定は 1.0（試合数 = 規定打席 / 規定投球回）。
-- =========================================================================

ALTER TABLE teams
  ADD COLUMN qualified_pa_per_game      NUMERIC NOT NULL DEFAULT 1
    CHECK (qualified_pa_per_game > 0 AND qualified_pa_per_game <= 10),
  ADD COLUMN qualified_innings_per_game NUMERIC NOT NULL DEFAULT 1
    CHECK (qualified_innings_per_game > 0 AND qualified_innings_per_game <= 10);
