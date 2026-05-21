import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container py-8">
      <h1 className="text-3xl font-bold tracking-tight">
        ⚾ 草野球スコア管理アプリ
      </h1>
      <p className="mt-4 text-muted-foreground">
        Phase 1-D Slice 1: メンバー登録・一覧 実装中
      </p>

      <nav className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          href="/members"
          className="rounded-lg border bg-card p-6 text-center transition-colors hover:bg-accent"
        >
          <div className="text-2xl">👥</div>
          <div className="mt-2 text-sm font-medium">メンバー</div>
        </Link>
        <div className="rounded-lg border bg-card p-6 text-center opacity-50">
          <div className="text-2xl">⚾</div>
          <div className="mt-2 text-sm font-medium">試合（未実装）</div>
        </div>
        <div className="rounded-lg border bg-card p-6 text-center opacity-50">
          <div className="text-2xl">📊</div>
          <div className="mt-2 text-sm font-medium">成績（未実装）</div>
        </div>
        <div className="rounded-lg border bg-card p-6 text-center opacity-50">
          <div className="text-2xl">⚙️</div>
          <div className="mt-2 text-sm font-medium">設定（未実装）</div>
        </div>
      </nav>
    </main>
  );
}
