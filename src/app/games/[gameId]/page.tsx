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
import { batResultLabel } from "@/contexts/game-recording/domain/bat-result";
import {
  asGuestPlayerId,
  asMemberId,
  playerKey,
  samePlayer,
} from "@/contexts/game-recording/domain/player-id";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";
import type { GameId } from "@/contexts/game-recording/domain/game-id";
import type { MemberId } from "@/contexts/team-management/domain/member-id";
import type { GuestPlayerId } from "@/contexts/team-management/domain/guest-player-id";
import {
  ScoreSheet,
  type PlayerRow,
} from "./plate-appearances/ScoreSheet";

/**
 * 試合詳細画面（UC-GAME-6）。
 *
 * Slice 3 では打順 + 打席結果を表示・記録できる。
 * スコアボード（イニングスコア）と投手記録は後続スライス。
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

  // 打順 + 各選手の打席結果を結合したビューモデルを構築
  const players: PlayerRow[] = game.battingOrder.map((entry) => {
    const memberId = asMemberId(entry.playerId);
    const guestId = asGuestPlayerId(entry.playerId);
    const name = memberId
      ? (memberNameById.get(memberId) ?? "(不明なメンバー)")
      : guestId
        ? (guestNameById.get(guestId) ?? "(不明な助っ人)")
        : "(不明)";
    const atBats = game.plateAppearances
      .filter((pa) => samePlayer(pa.playerId, entry.playerId))
      .map((pa) => ({
        id: pa.id,
        inning: pa.inning,
        label: batResultLabel(pa.result),
        runScored: pa.runScored,
      }));
    return {
      orderNumber: entry.orderNumber,
      playerKey: playerKey(entry.playerId),
      name,
      isGuest: guestId !== null,
      positionLabel: entry.position
        ? FIELDER_POSITION_LABELS[entry.position]
        : "-",
      atBats,
    };
  });

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
          <h2 className="text-lg font-semibold">打順・打席結果</h2>
          <Link
            href={`/games/${game.id}/batting-order`}
            className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            {game.battingOrder.length === 0 ? "+ 打順を登録" : "✏️ 打順編集"}
          </Link>
        </div>

        {game.battingOrder.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            まだ打順が登録されていません。先に打順を登録してください。
          </p>
        ) : (
          <ScoreSheet gameId={game.id} players={players} />
        )}
      </section>

      <section className="mt-8 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <h3 className="font-semibold text-foreground">未実装の機能</h3>
        <ul className="mt-2 space-y-1">
          <li>⏳ イニングスコア / 最終スコア表示（Slice 3.5）</li>
          <li>⏳ 投手記録（Slice 4）</li>
          <li>⏳ 成績集計（Slice 5）</li>
        </ul>
      </section>
    </main>
  );
}
