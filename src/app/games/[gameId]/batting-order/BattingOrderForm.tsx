"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  registerGuestPlayerAction,
  saveBattingOrderAction,
} from "./actions";
import { FIELDER_POSITION_LABELS } from "@/contexts/game-recording/domain/fielder-position";

type PlayerOption = {
  id: string;
  name: string;
};

type Row = {
  orderNumber: number;
  playerKey: string; // "member:UUID" / "guest:UUID" / ""
  position: string; // "1"〜"9" / ""
};

const INITIAL_ROW_COUNT = 9;

export function BattingOrderForm({
  gameId,
  members,
  guests,
  initialRows,
}: {
  gameId: string;
  members: PlayerOption[];
  guests: PlayerOption[];
  initialRows: Row[];
}) {
  const [rows, setRows] = useState<Row[]>(
    initialRows.length > 0 ? initialRows : makeEmptyRows(INITIAL_ROW_COUNT),
  );

  // 助っ人インライン追加用
  const [guestName, setGuestName] = useState("");
  const [isPending, startTransition] = useTransition();

  const updateRow = (index: number, patch: Partial<Row>) =>
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { orderNumber: prev.length + 1, playerKey: "", position: "" },
    ]);

  const removeRow = (index: number) =>
    setRows((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((r, i) => ({ ...r, orderNumber: i + 1 })),
    );

  const handleAddGuest = () => {
    const trimmed = guestName.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await registerGuestPlayerAction(gameId, trimmed);
      setGuestName("");
    });
  };

  // 重複警告（UX用、最終的にはドメインで弾かれる）
  const usedKeys = rows.filter((r) => r.playerKey).map((r) => r.playerKey);
  const duplicates = usedKeys.filter(
    (k, i) => usedKeys.indexOf(k) !== i,
  );

  const submittedEntries = rows.filter((r) => r.playerKey);
  const boundSaveAction = saveBattingOrderAction.bind(null, gameId);

  return (
    <div className="mt-6 space-y-6">
      {/* 助っ人追加ブロック（main form の外でも問題ないが、論理的に近くに配置） */}
      <section className="rounded-md border bg-card p-3">
        <div className="text-sm font-medium">助っ人選手を追加</div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            maxLength={50}
            placeholder="例: 山田 太郎"
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            disabled={isPending}
          />
          <button
            type="button"
            onClick={handleAddGuest}
            disabled={isPending || guestName.trim() === ""}
            className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {isPending ? "登録中..." : "+ 追加"}
          </button>
        </div>
        {guests.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            登録済みの助っ人: {guests.map((g) => g.name).join(", ")}
          </p>
        )}
      </section>

      {/* 打順本体 */}
      <form action={boundSaveAction} className="space-y-3">
        <input
          type="hidden"
          name="entries"
          value={JSON.stringify(submittedEntries)}
        />

        {duplicates.length > 0 && (
          <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            ⚠️ 同じ選手が複数の打順に登録されています
          </p>
        )}

        <ol className="space-y-2">
          {rows.map((row, i) => (
            <li
              key={i}
              className="grid grid-cols-[3rem_1fr_5rem_2rem] items-center gap-2"
            >
              <span className="font-mono text-sm text-muted-foreground">
                {row.orderNumber}番
              </span>
              <select
                value={row.playerKey}
                onChange={(e) => updateRow(i, { playerKey: e.target.value })}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              >
                <option value="">— 選手を選択 —</option>
                {members.length > 0 && (
                  <optgroup label="メンバー">
                    {members.map((m) => (
                      <option key={m.id} value={`member:${m.id}`}>
                        {m.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {guests.length > 0 && (
                  <optgroup label="助っ人">
                    {guests.map((g) => (
                      <option key={g.id} value={`guest:${g.id}`}>
                        {g.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <select
                value={row.position}
                onChange={(e) => updateRow(i, { position: e.target.value })}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              >
                <option value="">守備 -</option>
                {Object.entries(FIELDER_POSITION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`${row.orderNumber}番を削除`}
              >
                ×
              </button>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={addRow}
          className="rounded-md border border-dashed bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
        >
          + 打順を追加
        </button>

        <div className="flex gap-2 pt-4">
          <Link
            href={`/games/${gameId}`}
            className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={submittedEntries.length === 0 || duplicates.length > 0}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  );
}

function makeEmptyRows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    orderNumber: i + 1,
    playerKey: "",
    position: "",
  }));
}
