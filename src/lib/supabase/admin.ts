import { createClient } from "@supabase/supabase-js";

/**
 * service_role キーを使う管理用クライアント。
 *
 * ⚠️ 重要: このクライアントは **RLS を貫通する** 強い権限を持つ。
 *   - 必ずサーバー側（Server Action / Route Handler）からのみ使う
 *   - service_role キーは絶対に NEXT_PUBLIC_ にしない（ブラウザに出さない）
 *   - リポジトリにもコミットしない（.env / Vercel の環境変数のみ）
 *
 * 用途: 管理者によるメンバーアカウント発行（auth.admin.createUser）など、
 *       通常の anon クライアントでは行えない管理操作。
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY が未設定です（サーバー専用の環境変数に設定してください）",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
