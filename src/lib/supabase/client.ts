import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ（Client Component）から Supabase にアクセスするためのクライアント。
 * Cookie は document.cookie 経由で管理される。
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
