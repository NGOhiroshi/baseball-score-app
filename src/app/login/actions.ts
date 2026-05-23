"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

/**
 * ログイン用の Server Action。
 *
 * ブラウザクライアントの signInWithPassword + router.push パターンは、
 * Cookie 書き込みと次リクエストの間にレースが起きやすい（middleware が
 * まだセッションを認識できず /login に戻されてしまう）。
 *
 * Server Action なら **同じレスポンスに Set-Cookie とリダイレクトを乗せる**
 * ので、ブラウザは次リクエストに必ずセッションを含めてホームへ到達できる。
 */
export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error: error.message.toLowerCase().includes("invalid login credentials")
        ? "メールアドレスまたはパスワードが違います。"
        : error.message,
    };
  }
  redirect("/");
}
