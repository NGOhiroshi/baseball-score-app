"use client";

import { useState, useTransition } from "react";
import { updateTeamSettingsAction } from "./actions";

/**
 * 成績の規定係数（規定打席・規定投球回）を編集するフォーム（管理者用）。
 * 規定打席 = 試合数 × 規定打席係数、規定投球回 = 試合数 × 規定投球回係数。
 */
export function TeamSettingsForm({
  initialPaPerGame,
  initialInningsPerGame,
}: {
  initialPaPerGame: number;
  initialInningsPerGame: number;
}) {
  const [pa, setPa] = useState(String(initialPaPerGame));
  const [innings, setInnings] = useState(String(initialInningsPerGame));
  const [message, setMessage] = useState<
    { type: "ok" | "error"; text: string } | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const paNum = Number(pa);
    const inNum = Number(innings);
    if (!(paNum > 0 && paNum <= 10) || !(inNum > 0 && inNum <= 10)) {
      setMessage({ type: "error", text: "係数は0より大きく10以下で入力してください。" });
      return;
    }
    startTransition(async () => {
      try {
        await updateTeamSettingsAction(paNum, inNum);
        setMessage({ type: "ok", text: "保存しました。" });
      } catch (err) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-4">
      <div className="text-sm font-medium">成績の規定（タイトルホルダー判定）</div>
      <p className="mt-1 text-xs text-muted-foreground">
        規定打席 = 試合数 × 規定打席係数、規定投球回 = 試合数 × 規定投球回係数。
        草野球向けの既定は 1.0（プロ標準は打席3.1）。
      </p>
      <div className="mt-3 flex flex-wrap gap-4">
        <label className="text-sm">
          <span className="block text-xs font-medium">規定打席係数</span>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="10"
            value={pa}
            onChange={(e) => setPa(e.target.value)}
            className="mt-1 w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs font-medium">規定投球回係数</span>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="10"
            value={innings}
            onChange={(e) => setInnings(e.target.value)}
            className="mt-1 w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </label>
      </div>
      {message && (
        <p
          className={`mt-3 text-sm ${
            message.type === "ok" ? "text-emerald-600" : "text-destructive"
          }`}
        >
          {message.text}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "保存中..." : "保存する"}
      </button>
    </form>
  );
}
