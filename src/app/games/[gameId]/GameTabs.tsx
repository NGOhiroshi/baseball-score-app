"use client";

import { useState } from "react";
import Link from "next/link";
import { ScoreSheet, type PlayerRow } from "./plate-appearances/ScoreSheet";
import {
  PitchingSection,
  type PitchingView,
  type PitcherOption,
} from "./pitching/PitchingSection";

/**
 * 試合詳細の「打順・打席結果」と「投手記録」をタブ切替で表示する。
 * 打者・投手の記録が縦に積み上がってスクロールが長くなるのを避ける。
 */
export function GameTabs({
  gameId,
  hasBattingOrder,
  players,
  pitcherOptions,
  pitchingViews,
}: {
  gameId: string;
  hasBattingOrder: boolean;
  players: PlayerRow[];
  pitcherOptions: PitcherOption[];
  pitchingViews: PitchingView[];
}) {
  const [tab, setTab] = useState<"batting" | "pitching">("batting");

  return (
    <div>
      <div className="flex items-center justify-between border-b">
        <div className="flex gap-2">
          <TabButton
            label="打順・打席結果"
            active={tab === "batting"}
            onClick={() => setTab("batting")}
          />
          <TabButton
            label="投手記録"
            active={tab === "pitching"}
            onClick={() => setTab("pitching")}
          />
        </div>
        {tab === "batting" && (
          <Link
            href={`/games/${gameId}/batting-order`}
            className="mb-1 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            {hasBattingOrder ? "✏️ 打順編集" : "+ 打順を登録"}
          </Link>
        )}
      </div>

      <div className="mt-4">
        {tab === "batting" ? (
          hasBattingOrder ? (
            <ScoreSheet gameId={gameId} players={players} />
          ) : (
            <p className="text-sm text-muted-foreground">
              まだ打順が登録されていません。先に打順を登録してください。
            </p>
          )
        ) : hasBattingOrder ? (
          <PitchingSection
            gameId={gameId}
            pitcherOptions={pitcherOptions}
            appearances={pitchingViews}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            先に打順を登録すると投手を記録できます。
          </p>
        )}
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
