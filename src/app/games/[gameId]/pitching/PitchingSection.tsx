"use client";

import { useState, useTransition } from "react";
import { NumberField } from "@/components/NumberField";
import {
  recordPitchingAppearanceAction,
  updatePitchingInningsAction,
  deletePitchingAppearanceAction,
} from "./actions";

export type InningView = {
  inningNumber: number;
  outsRecorded: number;
  runsAllowed: number;
  earnedRuns: number;
  hitsAllowed: number;
  strikeouts: number;
  walksAllowed: number;
};

export type PitchingView = {
  id: string;
  pitcherName: string;
  isGuest: boolean;
  enteredAtInning: number;
  innings: InningView[];
  ip: string;
  totalRuns: number;
  totalEarned: number;
  totalHits: number;
  totalK: number;
  totalBB: number;
};

export type PitcherOption = { key: string; name: string };

/**
 * 投手記録セクション（Client Component）。
 *
 * 投手の登板を追加し、各登板にイニング単位の成績を入力・編集する。
 * 草野球の「イニング終了時にまとめて入力」UX に合わせ、1イニング1行で記録する。
 */
export function PitchingSection({
  gameId,
  pitcherOptions,
  appearances,
}: {
  gameId: string;
  pitcherOptions: PitcherOption[];
  appearances: PitchingView[];
}) {
  const [adding, setAdding] = useState(false);
  const [pitcherKey, setPitcherKey] = useState("");
  const [enteredAtInning, setEnteredAtInning] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    if (!pitcherKey) {
      setError("投手を選択してください");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await recordPitchingAppearanceAction({
          gameId,
          pitcherKey,
          enteredAtInning,
        });
        setAdding(false);
        setPitcherKey("");
        setEnteredAtInning(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  return (
    <div className="space-y-3">
      {appearances.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">
          まだ投手記録がありません。
        </p>
      )}

      {appearances.map((app) => (
        <PitcherCard key={app.id} gameId={gameId} app={app} />
      ))}

      {adding ? (
        <div className="rounded-md border bg-card p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium">投手</label>
              <select
                value={pitcherKey}
                onChange={(e) => setPitcherKey(e.target.value)}
                className="mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="">選択してください</option>
                {pitcherOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium">登板開始イニング</label>
              <div className="mt-1">
                <NumberField
                  value={enteredAtInning}
                  onChange={setEnteredAtInning}
                  min={1}
                  stepper
                  ariaLabel="登板開始イニング"
                  className="w-14"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "追加中..." : "追加"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              キャンセル
            </button>
          </div>
          {error && (
            <p className="mt-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      ) : (
        pitcherOptions.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-md border border-dashed bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
          >
            + 投手を追加
          </button>
        )
      )}
    </div>
  );
}

const EMPTY_INNING = (inningNumber: number): InningView => ({
  inningNumber,
  outsRecorded: 3,
  runsAllowed: 0,
  earnedRuns: 0,
  hitsAllowed: 0,
  strikeouts: 0,
  walksAllowed: 0,
});

function PitcherCard({
  gameId,
  app,
}: {
  gameId: string;
  app: PitchingView;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [rows, setRows] = useState<InningView[]>(app.innings);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const startEdit = () => {
    setRows(
      app.innings.length > 0
        ? app.innings
        : [EMPTY_INNING(app.enteredAtInning)],
    );
    setIsEditing(true);
    setError(null);
  };

  const updateCell = (
    idx: number,
    field: keyof InningView,
    value: number,
  ) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, [field]: Math.max(0, value) } : r,
      ),
    );
  };

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      EMPTY_INNING(
        prev.length > 0 ? prev[prev.length - 1].inningNumber + 1 : app.enteredAtInning,
      ),
    ]);

  const removeRow = (idx: number) =>
    setRows((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await updatePitchingInningsAction(gameId, app.id, rows);
        setIsEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`${app.pitcherName} の投手記録を削除しますか？`)) return;
    startTransition(async () => {
      await deletePitchingAppearanceAction(gameId, app.id);
    });
  };

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          {app.pitcherName}
          {app.isGuest && (
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
              助っ人
            </span>
          )}
          <span className="ml-2 text-xs text-muted-foreground">
            {app.enteredAtInning}回〜
          </span>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button
                type="button"
                onClick={startEdit}
                className="rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-accent"
              >
                ✏️ 記録
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-md border bg-background px-2 py-1 text-xs font-medium text-muted-foreground hover:text-destructive"
              >
                削除
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-accent"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? "保存中..." : "保存"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* 成績サマリ（導出値） */}
      {!isEditing && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>投球回 <b className="text-foreground">{app.ip}</b></span>
          <span>失点 <b className="text-foreground">{app.totalRuns}</b></span>
          <span>自責 <b className="text-foreground">{app.totalEarned}</b></span>
          <span>被安打 <b className="text-foreground">{app.totalHits}</b></span>
          <span>奪三振 <b className="text-foreground">{app.totalK}</b></span>
          <span>四死球 <b className="text-foreground">{app.totalBB}</b></span>
        </div>
      )}

      {/* イニング明細 */}
      {isEditing ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-1 py-1 font-normal">回</th>
                <th className="px-1 py-1 font-normal">アウト</th>
                <th className="px-1 py-1 font-normal">失点</th>
                <th className="px-1 py-1 font-normal">自責</th>
                <th className="px-1 py-1 font-normal">安打</th>
                <th className="px-1 py-1 font-normal">三振</th>
                <th className="px-1 py-1 font-normal">四死球</th>
                <th className="px-1 py-1" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-1 py-1">
                    <NumCell
                      value={r.inningNumber}
                      min={1}
                      onChange={(v) => updateCell(idx, "inningNumber", v)}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <select
                      value={r.outsRecorded}
                      onChange={(e) =>
                        updateCell(idx, "outsRecorded", Number(e.target.value))
                      }
                      className="w-12 rounded border border-input bg-background px-1 py-0.5 text-center text-xs"
                    >
                      {[0, 1, 2, 3].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <NumCell
                      value={r.runsAllowed}
                      onChange={(v) => updateCell(idx, "runsAllowed", v)}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <NumCell
                      value={r.earnedRuns}
                      onChange={(v) => updateCell(idx, "earnedRuns", v)}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <NumCell
                      value={r.hitsAllowed}
                      onChange={(v) => updateCell(idx, "hitsAllowed", v)}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <NumCell
                      value={r.strikeouts}
                      onChange={(v) => updateCell(idx, "strikeouts", v)}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <NumCell
                      value={r.walksAllowed}
                      onChange={(v) => updateCell(idx, "walksAllowed", v)}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="text-muted-foreground hover:text-destructive"
                      title="このイニングを削除"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={addRow}
            className="mt-2 rounded-md border border-dashed bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
          >
            + イニングを追加
          </button>
          <p className="mt-2 text-[11px] text-muted-foreground">
            ※ 自責点は失点を超えられません。アウトは0〜3で入力します。
          </p>
        </div>
      ) : (
        app.innings.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
            {app.innings.map((r) => (
              <span
                key={r.inningNumber}
                className="rounded border bg-muted px-1.5 py-0.5 text-[11px]"
                title={`失点${r.runsAllowed} 自責${r.earnedRuns} 安打${r.hitsAllowed} 三振${r.strikeouts} 四死球${r.walksAllowed}`}
              >
                {r.inningNumber}回: {r.outsRecorded}アウト
              </span>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function NumCell({
  value,
  min = 0,
  onChange,
}: {
  value: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <NumberField
      value={value}
      onChange={onChange}
      min={min}
      className="w-11"
    />
  );
}
