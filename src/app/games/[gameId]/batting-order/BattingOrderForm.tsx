"use client";

import Link from "next/link";
import { useState } from "react";
import { saveBattingOrderAction } from "./actions";
import { FIELDER_POSITION_LABELS } from "@/contexts/game-recording/domain/fielder-position";

type MemberOption = {
  id: string;
  name: string;
};

type Row = {
  orderNumber: number;
  memberId: string;
  position: string; // "1"〜"9" または ""
};

const INITIAL_ROW_COUNT = 9;

/**
 * 打順登録のインタラクティブフォーム（Client Component）。
 *
 * Server Component（page.tsx）からメンバー一覧と既存打順を受け取り、
 * ユーザーが打順を編集 → Server Action 経由で保存。
 *
 * Server Action へは hidden input に JSON シリアライズして渡す。
 * （progressive enhancement より UX 優先のシンプル構成）
 */
export function BattingOrderForm({
  gameId,
  members,
  initialRows,
}: {
  gameId: string;
  members: MemberOption[];
  initialRows: Row[];
}) {
  const [rows, setRows] = useState<Row[]>(
    initialRows.length > 0 ? initialRows : makeEmptyRows(INITIAL_ROW_COUNT),
  );

  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { orderNumber: prev.length + 1, memberId: "", position: "" },
    ]);
  };

  const removeRow = (index: number) => {
    setRows((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((r, i) => ({ ...r, orderNumber: i + 1 })),
    );
  };

  // 二重選択の警告（ドメインで弾かれるが、UX上は事前に気づかせる）
  const usedMemberIds = rows.filter((r) => r.memberId).map((r) => r.memberId);
  const duplicates = usedMemberIds.filter(
    (id, i) => usedMemberIds.indexOf(id) !== i,
  );

  // フォーム送信時、空欄行を除いた配列を JSON 化して送る
  const submittedEntries = rows.filter((r) => r.memberId);

  const boundAction = saveBattingOrderAction.bind(null, gameId);

  return (
    <form action={boundAction} className="mt-6 space-y-3">
      <input
        type="hidden"
        name="entries"
        value={JSON.stringify(submittedEntries)}
      />

      {duplicates.length > 0 && (
        <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          ⚠️ 同じメンバーが複数の打順に登録されています
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
              value={row.memberId}
              onChange={(e) => updateRow(i, { memberId: e.target.value })}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">— 選手を選択 —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
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
  );
}

function makeEmptyRows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    orderNumber: i + 1,
    memberId: "",
    position: "",
  }));
}
