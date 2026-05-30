-- =========================================================================
-- past-game-data の一括クリア（運用スクリプト・マイグレーションではない）
--
-- ⚠️ 破壊的操作。Supabase Dashboard の SQL Editor から **意図して** 実行する。
-- ⚠️ 必ず実行前に /export-import で全データをバックアップしてから流すこと。
-- =========================================================================
-- 残るもの:
--   - teams（チーム本体）
--   - members（メンバー一覧と認証紐付け）
--   - platform_admins / auth.users（認証）
-- 消えるもの:
--   - games（試合）と CASCADE で連動する子テーブル
--     ├─ batting_order_entries
--     ├─ plate_appearances
--     ├─ pitching_appearances
--     │   └─ inning_pitched_records
--     └─ inning_scores
--   - （オプション）guest_players
-- =========================================================================

-- ▼ メイン: 試合データを全消去（子テーブルは ON DELETE CASCADE で連動）
DELETE FROM games;

-- ▼ オプション: 助っ人選手も一緒に消す（テスト用助っ人を一掃したい場合のみ）
--   恒久的な助っ人を残したい場合は次の1行を `--` でコメントアウト
DELETE FROM guest_players;

-- ▼ 確認用: 主要テーブルの行数を表示
SELECT 'games' AS table_name, COUNT(*) AS row_count FROM games
UNION ALL SELECT 'batting_order_entries', COUNT(*) FROM batting_order_entries
UNION ALL SELECT 'plate_appearances', COUNT(*) FROM plate_appearances
UNION ALL SELECT 'pitching_appearances', COUNT(*) FROM pitching_appearances
UNION ALL SELECT 'inning_pitched_records', COUNT(*) FROM inning_pitched_records
UNION ALL SELECT 'inning_scores', COUNT(*) FROM inning_scores
UNION ALL SELECT 'guest_players', COUNT(*) FROM guest_players
UNION ALL SELECT 'members', COUNT(*) FROM members;
