import Link from "next/link";
import { createGameAction } from "../actions";

/**
 * 試合作成画面（UC-GAME-1）。
 *
 * 入力後、Server Action で集約を生成・保存し、
 * 生成された /games/[gameId] へ redirect する。
 */
export default function NewGamePage() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="container py-8">
      <div className="mb-6">
        <Link
          href="/games"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 試合一覧
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">新規試合の作成</h1>

      <form action={createGameAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="gameDate" className="block text-sm font-medium">
            試合日 <span className="text-destructive">*</span>
          </label>
          <input
            id="gameDate"
            name="gameDate"
            type="date"
            required
            defaultValue={today}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="opponentName" className="block text-sm font-medium">
            対戦相手 <span className="text-destructive">*</span>
          </label>
          <input
            id="opponentName"
            name="opponentName"
            type="text"
            required
            maxLength={50}
            placeholder="例: ライオンズ"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Link
            href="/games"
            className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            作成
          </button>
        </div>
      </form>
    </main>
  );
}
