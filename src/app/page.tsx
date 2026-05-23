import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container py-8">
      <h1 className="text-3xl font-bold tracking-tight">
        ⚾ 草野球スコア管理アプリ
      </h1>
      <p className="mt-4 text-muted-foreground">
        スミスブラザーズのスコア・成績を記録します
      </p>

      <nav className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Link
          href="/members"
          className="rounded-lg border bg-card p-6 text-center transition-colors hover:bg-accent"
        >
          <div className="text-2xl">👥</div>
          <div className="mt-2 text-sm font-medium">メンバー</div>
        </Link>
        <Link
          href="/games"
          className="rounded-lg border bg-card p-6 text-center transition-colors hover:bg-accent"
        >
          <div className="text-2xl">⚾</div>
          <div className="mt-2 text-sm font-medium">試合</div>
        </Link>
        <Link
          href="/stats"
          className="rounded-lg border bg-card p-6 text-center transition-colors hover:bg-accent"
        >
          <div className="text-2xl">📊</div>
          <div className="mt-2 text-sm font-medium">成績</div>
        </Link>
        <Link
          href="/export-import"
          className="rounded-lg border bg-card p-6 text-center transition-colors hover:bg-accent"
        >
          <div className="text-2xl">📤</div>
          <div className="mt-2 text-sm font-medium">取込/出力</div>
        </Link>
        <Link
          href="/settings"
          className="rounded-lg border bg-card p-6 text-center transition-colors hover:bg-accent"
        >
          <div className="text-2xl">⚙️</div>
          <div className="mt-2 text-sm font-medium">設定</div>
        </Link>
      </nav>
    </main>
  );
}
