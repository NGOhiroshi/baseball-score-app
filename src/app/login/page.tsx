"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

/**
 * ログイン画面（Email + パスワード）。
 *
 * 通常ログインではメールを送らない（無料枠のメールレート制限を避けるため）。
 * アカウントは管理者が発行する招待制で、自己サインアップは提供しない。
 *
 * 認証本体は Server Action（actions.ts）で行う。Set-Cookie とリダイレクトを
 * 同じレスポンスで処理するためで、ブラウザクライアント直叩きで起きがちな
 * Cookie レースを避ける。
 */
const INITIAL_STATE: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    INITIAL_STATE,
  );

  return (
    <main className="container flex min-h-screen items-center justify-center py-8">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">⚾ 草野球スコア管理</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          メールアドレスとパスワードでログイン
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          {state.error && (
            <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          アカウントは管理者が発行します。ログインできない場合は管理者にお問い合わせください。
        </p>
      </div>
    </main>
  );
}
