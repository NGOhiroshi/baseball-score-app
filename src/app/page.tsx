export default function HomePage() {
  return (
    <main className="container py-8">
      <h1 className="text-3xl font-bold tracking-tight">
        ⚾ 草野球スコア管理アプリ
      </h1>
      <p className="mt-4 text-muted-foreground">
        Phase 1-C: 技術基盤セットアップ完了。Phase 1-D で機能実装を開始します。
      </p>

      <section className="mt-8 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">セットアップ状況</h2>
        <ul className="mt-4 space-y-2 text-sm">
          <li>✅ Next.js 15 + TypeScript + Tailwind CSS</li>
          <li>✅ DDD レイヤード構造（src/contexts/）</li>
          <li>⏳ Supabase 接続（.env.local 未設定）</li>
          <li>⏳ 認証フロー</li>
        </ul>
      </section>
    </main>
  );
}
