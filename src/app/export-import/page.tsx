import Link from "next/link";
import { getCurrentMember } from "@/lib/auth/current-member";
import { ImportSection } from "./ImportSection";

/**
 * エクスポート / インポート画面。
 *
 * エクスポート: ログイン中メンバー全員が利用可（チーム内データの取得）。
 * インポート: 管理者のみ。データを書き込むため認可ガードはサーバー側にも入れる。
 */
export default async function ExportImportPage() {
  const member = await getCurrentMember();
  const isAdmin = member?.role === "admin";

  return (
    <main className="container py-8">
      <div className="mb-4">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← ホーム
        </Link>
      </div>

      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">
          📤 エクスポート / インポート
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          チームの成績・試合データ・メンバーをCSVで書き出し、または取り込みます。
        </p>
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground">エクスポート</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ExportCard
            title="個人成績"
            description="選手×年度の打撃・投手成績（ZIP / batting.csv + pitching.csv）"
            href="/api/export/personal-stats"
            filename="personal-stats.zip"
          />
          <ExportCard
            title="チーム成績"
            description="年度別の勝敗・チーム打撃・投手集計（CSV）"
            href="/api/export/team-stats"
            filename="team-stats.csv"
          />
          <ExportCard
            title="試合データ"
            description="試合・打順・打席結果・投手記録・スコア・助っ人の生データ（ZIP）"
            href="/api/export/game-data"
            filename="game-data.zip"
          />
          <ExportCard
            title="メンバー一覧"
            description="チームメンバーの基本情報（CSV）"
            href="/api/export/members"
            filename="members.csv"
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground">
          インポート（管理者）
        </h2>
        {isAdmin ? (
          <ImportSection />
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            この操作は管理者のみ実行できます。
          </p>
        )}
      </section>
    </main>
  );
}

function ExportCard({
  title,
  description,
  href,
  filename,
}: {
  title: string;
  description: string;
  href: string;
  filename: string;
}) {
  return (
    <a
      href={href}
      download={filename}
      className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{description}</div>
        </div>
        <span className="shrink-0 rounded-md border bg-background px-2 py-1 text-xs font-medium">
          ⬇︎ ダウンロード
        </span>
      </div>
    </a>
  );
}
