import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ListGamesUseCase } from "@/contexts/game-recording/application/list-games.usecase";
import { GameSupabaseRepository } from "@/contexts/game-recording/infrastructure/game.supabase.repository";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";

/**
 * 試合一覧画面（UC-GAME-7）。
 */
export default async function GamesPage() {
  const supabase = await createClient();
  const repo = new GameSupabaseRepository(supabase);
  const usecase = new ListGamesUseCase(repo);
  const games = await usecase.execute(SMITH_BROTHERS_TEAM_ID);

  return (
    <main className="container py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">⚾ 試合</h1>
        <Link
          href="/games/new"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          + 新規試合
        </Link>
      </div>

      {games.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          まだ試合がありません。「+ 新規試合」から登録してください。
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {games.map((g) => (
            <li key={g.id}>
              <Link
                href={`/games/${g.id}`}
                className="block rounded-md border bg-card p-4 hover:bg-accent"
              >
                <div className="text-sm text-muted-foreground">
                  {g.gameDate.toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </div>
                <div className="mt-1 font-medium">vs {g.opponentName}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
