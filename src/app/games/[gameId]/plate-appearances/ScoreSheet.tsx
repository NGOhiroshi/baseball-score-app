"use client";

import { useOptimistic, useState, useTransition } from "react";
import { PlateAppearanceModal } from "./PlateAppearanceModal";
import {
  deletePlateAppearanceAction,
  setRunScoredAction,
} from "./actions";

export type AtBatView = {
  id: string;
  inning: number;
  label: string;
  runScored: boolean;
};

export type PlayerRow = {
  orderNumber: number;
  playerKey: string;
  name: string;
  isGuest: boolean;
  positionLabel: string;
  atBats: AtBatView[];
};

/**
 * 打順 + 打席結果のスコアシート（Client Component）。
 *
 * 各選手の打席結果をチップ表示し、「+ 打席」で記録モーダルを開く。
 * モーダルの開閉状態（どの選手か）をこのコンポーネントが管理する。
 */
export function ScoreSheet({
  gameId,
  players,
}: {
  gameId: string;
  players: PlayerRow[];
}) {
  const [modalPlayer, setModalPlayer] = useState<PlayerRow | null>(null);
  const [, startTransition] = useTransition();

  // 楽観的更新: 得点トグルをタップした瞬間に画面へ反映し、
  // サーバー往復の遅延を隠す（失敗時は React が自動で元に戻す）。
  const [optimisticPlayers, applyOptimistic] = useOptimistic(
    players,
    (state: PlayerRow[], patch: { paId: string; runScored: boolean }) =>
      state.map((row) => ({
        ...row,
        atBats: row.atBats.map((ab) =>
          ab.id === patch.paId ? { ...ab, runScored: patch.runScored } : ab,
        ),
      })),
  );

  const handleDelete = (paId: string) => {
    if (!confirm("この打席結果を削除しますか？")) return;
    startTransition(async () => {
      await deletePlateAppearanceAction(gameId, paId);
    });
  };

  const handleToggleRunScored = (paId: string, current: boolean) => {
    startTransition(async () => {
      applyOptimistic({ paId, runScored: !current });
      await setRunScoredAction(gameId, paId, !current);
    });
  };

  // 次のイニングのデフォルト値（その選手の最大イニング + 1、なければ 1）
  const nextInning = (row: PlayerRow): number => {
    if (row.atBats.length === 0) return 1;
    return Math.max(...row.atBats.map((a) => a.inning)) + 1;
  };

  return (
    <div className="mt-4 space-y-2">
      {optimisticPlayers.map((row) => (
        <div key={row.playerKey} className="rounded-md border bg-card p-3">
          <div className="flex items-center gap-3">
            <span className="w-8 font-mono text-sm text-muted-foreground">
              {row.orderNumber}番
            </span>
            <span className="flex-1 text-sm font-medium">
              {row.name}
              {row.isGuest && (
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                  助っ人
                </span>
              )}
            </span>
            <span className="w-10 text-center text-xs text-muted-foreground">
              {row.positionLabel}
            </span>
            <button
              type="button"
              onClick={() => setModalPlayer(row)}
              className="rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-accent"
            >
              + 打席
            </button>
          </div>

          {row.atBats.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 pl-11">
              {row.atBats.map((ab) => (
                <span
                  key={ab.id}
                  className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${
                    ab.runScored
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "bg-muted"
                  }`}
                >
                  {/* 打席結果 */}
                  <span>
                    <span className="text-muted-foreground">{ab.inning}回</span>{" "}
                    {ab.label}
                  </span>

                  {/* 得点トグル（生還） */}
                  <button
                    type="button"
                    onClick={() => handleToggleRunScored(ab.id, ab.runScored)}
                    title={
                      ab.runScored
                        ? "生還を取り消す"
                        : "ホームに帰った（得点）として記録"
                    }
                    className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                      ab.runScored
                        ? "bg-emerald-600 text-white"
                        : "border border-dashed text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {ab.runScored ? "🏠 生還" : "🏠 生還?"}
                  </button>

                  {/* 削除 */}
                  <button
                    type="button"
                    onClick={() => handleDelete(ab.id)}
                    title="この打席を削除"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      {modalPlayer && (
        <PlateAppearanceModal
          gameId={gameId}
          playerKey={modalPlayer.playerKey}
          playerName={modalPlayer.name}
          defaultInning={nextInning(modalPlayer)}
          onClose={() => setModalPlayer(null)}
        />
      )}
    </div>
  );
}
