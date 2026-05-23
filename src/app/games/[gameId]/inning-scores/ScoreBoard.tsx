"use client";

import { useOptimistic, useState, useTransition } from "react";
import { NumberField } from "@/components/NumberField";
import { setBatsFirstAction, updateInningScoresAction } from "./actions";

export type InningScoreView = {
  inningNumber: number;
  ourScore: number;
  opponentScore: number;
};

const DEFAULT_INNINGS = 7;

/**
 * スコアボード（Client Component）。
 *
 * 表示モード: イニングスコアと最終スコア・勝敗を表示。
 * 編集モード: 各イニングの自/相手得点を入力、イニングの増減、保存。
 *
 * 最終スコアは「合計」をクライアントでも計算して即時表示するが、
 * 真実は常に Game.finalScore()（サーバー側のドメイン）が持つ。
 */
export function ScoreBoard({
  gameId,
  initialScores,
  batsFirst,
}: {
  gameId: string;
  initialScores: InningScoreView[];
  batsFirst: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [rows, setRows] = useState<InningScoreView[]>(initialScores);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 先攻/後攻トグル（タップ即反映）
  const [optimisticBatsFirst, setOptimisticBatsFirst] = useOptimistic(
    batsFirst,
    (_current: boolean, next: boolean) => next,
  );
  const handleToggleBatsFirst = () => {
    startTransition(async () => {
      const next = !optimisticBatsFirst;
      setOptimisticBatsFirst(next);
      await setBatsFirstAction(gameId, next);
    });
  };

  const display = isEditing ? rows : initialScores;
  const ourTotal = display.reduce((s, r) => s + (r.ourScore || 0), 0);
  const oppTotal = display.reduce((s, r) => s + (r.opponentScore || 0), 0);
  const mark = ourTotal > oppTotal ? "○" : ourTotal < oppTotal ? "●" : "△";

  const startEdit = () => {
    const base =
      initialScores.length > 0
        ? initialScores
        : Array.from({ length: DEFAULT_INNINGS }, (_, i) => ({
            inningNumber: i + 1,
            ourScore: 0,
            opponentScore: 0,
          }));
    setRows(base);
    setIsEditing(true);
    setError(null);
  };

  const updateCell = (
    idx: number,
    field: "ourScore" | "opponentScore",
    value: number,
  ) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, [field]: Math.max(0, value) } : r,
      ),
    );
  };

  const addInning = () =>
    setRows((prev) => [
      ...prev,
      { inningNumber: prev.length + 1, ourScore: 0, opponentScore: 0 },
    ]);

  const removeInning = () =>
    setRows((prev) => prev.slice(0, -1));

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await updateInningScoresAction(gameId, rows);
        setIsEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  return (
    <div className="rounded-lg border border-green-950 bg-green-900 p-4 text-green-50 shadow-inner">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">スコアボード</h2>
        {!isEditing ? (
          <button
            type="button"
            onClick={startEdit}
            className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            {initialScores.length === 0 ? "+ スコア入力" : "✏️ 編集"}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "保存中..." : "保存"}
            </button>
          </div>
        )}
      </div>

      {/* 先攻/後攻トグル */}
      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className="text-green-200">自軍:</span>
        <button
          type="button"
          onClick={handleToggleBatsFirst}
          className="rounded-md border bg-background px-3 py-1 font-medium text-foreground hover:bg-accent"
          title="タップで先攻/後攻を切り替え"
        >
          {optimisticBatsFirst ? "先攻（表）" : "後攻（裏）"}
        </button>
      </div>

      {error && (
        <p className="mt-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {display.length === 0 ? (
        <p className="mt-4 text-sm text-green-200">
          まだスコアが入力されていません。
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="text-center text-sm">
            <thead>
              <tr className="text-green-300">
                <th className="px-2 py-1 text-left font-normal"> </th>
                {display.map((r) => (
                  <th
                    key={r.inningNumber}
                    className="w-10 px-1 py-1 font-normal"
                  >
                    {r.inningNumber}
                  </th>
                ))}
                <th className="w-12 px-2 py-1 font-semibold text-green-50">
                  計
                </th>
                <th className="w-8 px-1 py-1"> </th>
              </tr>
            </thead>
            <tbody>
              {/* 先攻チームが上の行に来る（自軍先攻なら自が上） */}
              {(optimisticBatsFirst
                ? (["our", "opp"] as const)
                : (["opp", "our"] as const)
              ).map((side) =>
                side === "our" ? (
                  <ScoreRow
                    key="our"
                    label="自"
                    rows={display}
                    field="ourScore"
                    isEditing={isEditing}
                    onChange={updateCell}
                  />
                ) : (
                  <ScoreRow
                    key="opp"
                    label="相"
                    rows={display}
                    field="opponentScore"
                    isEditing={isEditing}
                    onChange={updateCell}
                  />
                ),
              )}
            </tbody>
            <tfoot>
              <tr>
                <td className="px-2 py-1 text-left font-semibold">計</td>
                <td colSpan={display.length} />
                <td className="px-2 py-1 font-bold">
                  {ourTotal} - {oppTotal}
                </td>
                <td className="px-1 py-1 text-lg font-bold">{mark}</td>
              </tr>
            </tfoot>
          </table>

          {isEditing && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={addInning}
                className="rounded-md border border-dashed bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
              >
                + 回を追加
              </button>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={removeInning}
                  className="rounded-md border border-dashed bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
                >
                  − 最終回を削除
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreRow({
  label,
  rows,
  field,
  isEditing,
  onChange,
}: {
  label: string;
  rows: InningScoreView[];
  field: "ourScore" | "opponentScore";
  isEditing: boolean;
  onChange: (idx: number, field: "ourScore" | "opponentScore", v: number) => void;
}) {
  const total = rows.reduce((s, r) => s + (r[field] || 0), 0);
  return (
    <tr className="border-t border-green-700">
      <td className="px-2 py-1 text-left font-medium">{label}</td>
      {rows.map((r, idx) => (
        <td key={r.inningNumber} className="px-1 py-1">
          {isEditing ? (
            <NumberField
              value={r[field]}
              onChange={(v) => onChange(idx, field, v)}
              min={0}
              ariaLabel={`${label} ${r.inningNumber}回`}
              className="w-10"
            />
          ) : (
            <span>{r[field]}</span>
          )}
        </td>
      ))}
      <td className="px-2 py-1 font-bold">{total}</td>
      <td className="px-1 py-1" />
    </tr>
  );
}
