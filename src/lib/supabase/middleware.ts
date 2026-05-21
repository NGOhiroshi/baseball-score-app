import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Next.js の middleware から Supabase セッションを更新する。
 * Cookie の有効期限延長などを行う。
 *
 * 参考: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 必ず getUser() を呼ぶこと（Cookie セッションのリフレッシュのため）
  await supabase.auth.getUser();

  // TODO(Phase 1-D Slice X): 認証スライスで /login への自動リダイレクトを復活させる。
  // 現時点（Slice 1）では auth フロー未実装のため、未ログインでもアクセスできるようにしておく。
  // ↓ 元のコード（参考）:
  //   if (!user && !request.nextUrl.pathname.startsWith("/login") && !request.nextUrl.pathname.startsWith("/auth")) {
  //     const url = request.nextUrl.clone();
  //     url.pathname = "/login";
  //     return NextResponse.redirect(url);
  //   }

  return supabaseResponse;
}
