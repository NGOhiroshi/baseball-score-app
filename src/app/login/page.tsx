/**
 * ログイン画面（スケルトン）。
 * Phase 1-D で Supabase Magic Link / Google OAuth を実装する。
 */
export default function LoginPage() {
  return (
    <main className="container flex min-h-screen items-center justify-center py-8">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">
          ⚾ 草野球スコア管理
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ログインしてください
        </p>

        <form className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="you@example.com"
              disabled
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            disabled
          >
            ログインリンクを送信（Phase 1-D で実装）
          </button>
        </form>
      </div>
    </main>
  );
}
