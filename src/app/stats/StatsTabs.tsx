"use client";

import { useState, type ReactNode } from "react";

export type BattingRow = {
  playerName: string;
  isGuest: boolean;
  average: number | null;
  averageLabel: string;
  plateAppearances: number;
  atBats: number;
  hits: number;
  homeRuns: number;
  runsBattedIn: number;
  runsScored: number;
};

export type PitchingRow = {
  playerName: string;
  isGuest: boolean;
  era: number | null;
  eraLabel: string;
  ipLabel: string;
  totalOuts: number;
  runsAllowed: number;
  earnedRuns: number;
  hitsAllowed: number;
  strikeouts: number;
  walksAllowed: number;
};

type SortValue = number | string | null;
type SortDir = "asc" | "desc";

type Column<T> = {
  key: string;
  label: string;
  align: "left" | "right";
  sortValue: (r: T) => SortValue;
  render: (r: T) => ReactNode;
};

const battingColumns: Column<BattingRow>[] = [
  {
    key: "name",
    label: "選手",
    align: "left",
    sortValue: (r) => r.playerName,
    render: (r) => <PlayerName name={r.playerName} isGuest={r.isGuest} />,
  },
  { key: "avg", label: "打率", align: "right", sortValue: (r) => r.average, render: (r) => <b>{r.averageLabel}</b> },
  { key: "pa", label: "打席", align: "right", sortValue: (r) => r.plateAppearances, render: (r) => r.plateAppearances },
  { key: "ab", label: "打数", align: "right", sortValue: (r) => r.atBats, render: (r) => r.atBats },
  { key: "h", label: "安打", align: "right", sortValue: (r) => r.hits, render: (r) => r.hits },
  { key: "hr", label: "本塁打", align: "right", sortValue: (r) => r.homeRuns, render: (r) => r.homeRuns },
  { key: "rbi", label: "打点", align: "right", sortValue: (r) => r.runsBattedIn, render: (r) => r.runsBattedIn },
  { key: "r", label: "得点", align: "right", sortValue: (r) => r.runsScored, render: (r) => r.runsScored },
];

const pitchingColumns: Column<PitchingRow>[] = [
  {
    key: "name",
    label: "選手",
    align: "left",
    sortValue: (r) => r.playerName,
    render: (r) => <PlayerName name={r.playerName} isGuest={r.isGuest} />,
  },
  { key: "era", label: "防御率", align: "right", sortValue: (r) => r.era, render: (r) => <b>{r.eraLabel}</b> },
  { key: "ip", label: "投球回", align: "right", sortValue: (r) => r.totalOuts, render: (r) => r.ipLabel },
  { key: "ra", label: "失点", align: "right", sortValue: (r) => r.runsAllowed, render: (r) => r.runsAllowed },
  { key: "er", label: "自責", align: "right", sortValue: (r) => r.earnedRuns, render: (r) => r.earnedRuns },
  { key: "ha", label: "被安打", align: "right", sortValue: (r) => r.hitsAllowed, render: (r) => r.hitsAllowed },
  { key: "k", label: "奪三振", align: "right", sortValue: (r) => r.strikeouts, render: (r) => r.strikeouts },
  { key: "bb", label: "四死球", align: "right", sortValue: (r) => r.walksAllowed, render: (r) => r.walksAllowed },
];

/**
 * チーム成績の表示（Client Component）。
 *
 * 打撃/投手をタブで切り替え、列ヘッダのタップで昇順/降順ソートする。
 * 並び替えはユーザー操作で動的に変わるので、ここ（UI）が責務を持つ。
 */
export function StatsTabs({
  batting,
  pitching,
}: {
  batting: BattingRow[];
  pitching: PitchingRow[];
}) {
  const [tab, setTab] = useState<"batting" | "pitching">("batting");

  return (
    <div className="mt-6">
      <div className="flex gap-2 border-b">
        <TabButton
          label="打撃成績"
          active={tab === "batting"}
          onClick={() => setTab("batting")}
        />
        <TabButton
          label="投手成績"
          active={tab === "pitching"}
          onClick={() => setTab("pitching")}
        />
      </div>

      <div className="mt-4">
        {tab === "batting" ? (
          <SortableTable
            rows={batting}
            columns={battingColumns}
            initialSort={{ key: "avg", dir: "desc" }}
            emptyMessage="集計対象の打席記録がありません。"
          />
        ) : (
          <SortableTable
            rows={pitching}
            columns={pitchingColumns}
            initialSort={{ key: "era", dir: "asc" }}
            emptyMessage="集計対象の投手記録がありません。"
          />
        )}
      </div>
    </div>
  );
}

function SortableTable<T>({
  rows,
  columns,
  initialSort,
  emptyMessage,
}: {
  rows: T[];
  columns: Column<T>[];
  initialSort: { key: string; dir: SortDir };
  emptyMessage: string;
}) {
  const [sort, setSort] = useState(initialSort);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const col = columns.find((c) => c.key === sort.key) ?? columns[0];
  const sorted = [...rows].sort((a, b) =>
    compare(col.sortValue(a), col.sortValue(b), sort.dir),
  );

  const handleSort = (key: string) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" },
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-right text-sm">
        <thead className="border-b text-xs text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-2 py-2 font-normal ${
                  c.align === "left" ? "text-left" : "text-right"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSort(c.key)}
                  className="inline-flex items-center gap-0.5 hover:text-foreground"
                >
                  {c.label}
                  <span className="w-2 text-[10px]">
                    {sort.key === c.key ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={i} className="border-b">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-2 py-2 ${
                    c.align === "left" ? "text-left font-medium" : "text-right"
                  }`}
                >
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** null は常に末尾。文字列はロケール比較、数値は差分。 */
function compare(a: SortValue, b: SortValue, dir: SortDir): number {
  const an = a === null;
  const bn = b === null;
  if (an && bn) return 0;
  if (an) return 1;
  if (bn) return -1;
  if (typeof a === "string" && typeof b === "string") {
    return dir === "asc" ? a.localeCompare(b) : b.localeCompare(a);
  }
  return dir === "asc" ? (a as number) - (b as number) : (b as number) - (a as number);
}

function PlayerName({ name, isGuest }: { name: string; isGuest: boolean }) {
  return (
    <>
      {name}
      {isGuest && (
        <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px] font-normal text-muted-foreground">
          助
        </span>
      )}
    </>
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
