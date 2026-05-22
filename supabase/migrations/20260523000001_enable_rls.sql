-- =========================================================================
-- 20260523_001: RLS（行レベルセキュリティ）を有効化 + superadmin 基盤
--
-- 公開された anon key だけでは何もできないようにする「裏口の鍵」。
-- ロール階層:
--   superadmin（プラットフォーム）… 全チーム全操作（マスターキー）
--   admin（チーム）              … メンバー管理 + 試合データ読み書き
--   regular（メンバー）          … 試合データ読み書き + メンバー閲覧
--   未ログイン / 非メンバー        … 何もできない
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. superadmin を保持するテーブル（プラットフォーム役割。MemberRole とは別物）
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_admins (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 2. 判定ヘルパ関数
--    SECURITY DEFINER（所有者権限で実行）にすることで、関数内の members /
--    platform_admins への参照が RLS を再帰的に発動しないようにする。
--    （members のポリシーが members を参照すると無限ループになるのを防ぐ）
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_member()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM members WHERE auth_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM members WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_admin() TO anon, authenticated;

-- -------------------------------------------------------------------------
-- 3. RLS を全テーブルで有効化
--    （有効化した瞬間、ポリシーが無いものは「全部拒否」になる）
-- -------------------------------------------------------------------------
ALTER TABLE platform_admins        ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE members                ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_players          ENABLE ROW LEVEL SECURITY;
ALTER TABLE games                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE batting_order_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE plate_appearances      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitching_appearances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inning_pitched_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE inning_scores          ENABLE ROW LEVEL SECURITY;

-- platform_admins: ポリシーを作らない＝API からは触れない。
-- 参照は SECURITY DEFINER 関数経由、書き込みは service_role / SQL のみ。

-- -------------------------------------------------------------------------
-- 4. teams: メンバー/superadmin が閲覧、書き込みは superadmin のみ
-- -------------------------------------------------------------------------
CREATE POLICY teams_select ON teams FOR SELECT TO authenticated
  USING (is_team_member() OR is_super_admin());
CREATE POLICY teams_modify ON teams FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- -------------------------------------------------------------------------
-- 5. members: メンバー/superadmin が閲覧、変更は admin/superadmin
-- -------------------------------------------------------------------------
CREATE POLICY members_select ON members FOR SELECT TO authenticated
  USING (is_team_member() OR is_super_admin());
CREATE POLICY members_insert ON members FOR INSERT TO authenticated
  WITH CHECK (is_team_admin() OR is_super_admin());
CREATE POLICY members_update ON members FOR UPDATE TO authenticated
  USING (is_team_admin() OR is_super_admin())
  WITH CHECK (is_team_admin() OR is_super_admin());
CREATE POLICY members_delete ON members FOR DELETE TO authenticated
  USING (is_team_admin() OR is_super_admin());

-- -------------------------------------------------------------------------
-- 6. 試合データ & 助っ人: ログイン済みメンバー（または superadmin）が全操作
--    1テーブルにつき FOR ALL の許可ポリシーを1つ。
-- -------------------------------------------------------------------------
CREATE POLICY guest_players_all ON guest_players FOR ALL TO authenticated
  USING (is_team_member() OR is_super_admin())
  WITH CHECK (is_team_member() OR is_super_admin());

CREATE POLICY games_all ON games FOR ALL TO authenticated
  USING (is_team_member() OR is_super_admin())
  WITH CHECK (is_team_member() OR is_super_admin());

CREATE POLICY batting_order_all ON batting_order_entries FOR ALL TO authenticated
  USING (is_team_member() OR is_super_admin())
  WITH CHECK (is_team_member() OR is_super_admin());

CREATE POLICY plate_appearances_all ON plate_appearances FOR ALL TO authenticated
  USING (is_team_member() OR is_super_admin())
  WITH CHECK (is_team_member() OR is_super_admin());

CREATE POLICY pitching_appearances_all ON pitching_appearances FOR ALL TO authenticated
  USING (is_team_member() OR is_super_admin())
  WITH CHECK (is_team_member() OR is_super_admin());

CREATE POLICY inning_pitched_all ON inning_pitched_records FOR ALL TO authenticated
  USING (is_team_member() OR is_super_admin())
  WITH CHECK (is_team_member() OR is_super_admin());

CREATE POLICY inning_scores_all ON inning_scores FOR ALL TO authenticated
  USING (is_team_member() OR is_super_admin())
  WITH CHECK (is_team_member() OR is_super_admin());

-- -------------------------------------------------------------------------
-- 7. 集計 VIEW を security_invoker 化
--    VIEW は既定では所有者権限で実行され、下層テーブルの RLS を素通りする。
--    security_invoker=true にすると「閲覧したユーザーの権限」で実行され、
--    下層テーブルの RLS が効くようになる（=メンバーだけ自チームの集計を見れる）。
-- -------------------------------------------------------------------------
ALTER VIEW v_player_batting_stats_yearly  SET (security_invoker = true);
ALTER VIEW v_player_batting_stats_career  SET (security_invoker = true);
ALTER VIEW v_player_pitching_stats_yearly SET (security_invoker = true);
ALTER VIEW v_player_pitching_stats_career SET (security_invoker = true);
