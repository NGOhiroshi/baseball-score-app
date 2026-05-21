import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GetGameUseCase } from "@/contexts/game-recording/application/get-game.usecase";
import { GameSupabaseRepository } from "@/contexts/game-recording/infrastructure/game.supabase.repository";
import { ListMembersUseCase } from "@/contexts/team-management/application/list-members.usecase";
import { ListGuestPlayersUseCase } from "@/contexts/team-management/application/list-guest-players.usecase";
import { MemberSupabaseRepository } from "@/contexts/team-management/infrastructure/member.supabase.repository";
import { GuestPlayerSupabaseRepository } from "@/contexts/team-management/infrastructure/guest-player.supabase.repository";
import { FIELDER_POSITION_LABELS } from "@/contexts/game-recording/domain/fielder-position";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";
import type { GameId } from "@/contexts/game-recording/domain/game-id";
import type { MemberId } from "@/contexts/team-management/domain/member-id";
import type { GuestPlayerId } from "@/contexts/team-management/domain/guest-player-id";
import {
  asGuestPlayerId,
  asMemberId,
} from "@/contexts/game-recording/domain/player-id";

/**
 * 試合詳細画面（UC-GAME-6 の Slice 2 部分）。
 *
 * Slice 2 では基本情報と打順までを表示。
 * イニングスコア・打席結果・投手成績は後続スライスで追加する。
 */
export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const supabase = await createClient();
  const gameRepo = new GameSupabaseRepository(supabase);
  const memberRepo = new MemberSupabaseRepository(supabase);

  const guestRepo = new GuestPlayerSupabaseRepository(supabase);

  const game = await new GetGameUseCase(gameRepo).execute(gameId as GameId);
  if (!game) notFound();

  // 打順表示用にメンバーと助っ人を取得して名前解決
  const [members, guests] = await Promise.all([
    new ListMembersUseCase(memberRepo).execute(SMITH_BROTHERS_TEAM_ID),
    new ListGuestPlayersUseCase(guestRepo).execute(SMITH_BROTHERS_TEAM_ID),
  ]);
  const memberNameById = new Map<MemberId, string>(
    members.map((m) => [m.id, m.name]),
  );
  const guestNameById = new Map<GuestPlayerId, string>(
    guests.map((g) => [g.id, g.name]),
  );

  return (
    <main className="container py-8">
      <div className="mb-4">
        <Link
          href="/games"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 試合一覧
        </Link>
      </div>

      <header className="border-b pb-4">
        <div className="text-sm text-muted-foreground">
          {game.gameDate.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short",
          })}
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          vs {game.opponentName}
        </h1>
      </header>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">打順</h2>
          <Link
            href={`/games/${game.id}/batting-order`}
            className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            {game.battingOrder.length === 0 ? "+ 打順を登録" : "✏️ 編集"}
          </Link>
        </div>

        {game.battingOrder.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            まだ打順が登録されていません。
          </p>
        ) : (
          <ol className="mt-4 space-y-1">
            {game.battingOrder.map((entry) => {
              const memberId = asMemberId(entry.playerId);
              const guestId = asGuestPlayerId(entry.playerId);
              const name = memberId
                ? (memberNameById.get(memberId) ?? "(不明なメンバー)")
                : guestId
                  ? (guestNameById.get(guestId) ?? "(不明な助っ人)")
                  : "(不明)";
              const isGuest = guestId !== null;
              const posLabel = entry.position
                ? FIELDER_POSITION_LABELS[entry.position]
                : "-";
              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm"
                >
                  <span className="w-8 font-mono text-muted-foreground">
                    {entry.orderNumber}番
                  </span>
                  <span className="flex-1 font-medium">
                    {name}
                    {isGuest && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                        助っ人
                      </span>
                    )}
                  </span>
                  <span className="w-12 text-center text-xs text-muted-foreground">
                    {posLabel}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="mt-8 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <h3 className="font-semibold text-foreground">未実装の機能</h3>
        <ul className="mt-2 space-y-1">
          <li>⏳ イニングスコア / 最終スコア表示（Slice 3）</li>
          <li>⏳ 打席結果入力（Slice 3）</li>
          <li>⏳ 投手記録（Slice 4）</li>
        </ul>
      </section>
    </main>
  );
}
