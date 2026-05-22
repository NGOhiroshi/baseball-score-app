"use client";

import { useState, type ReactNode } from "react";
import { SprayBars, type SprayCounts } from "./SprayBars";

export type PlayerDetail = { epithet: string; spray: SprayCounts };

export type BattingRow = {
  playerId: string;
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
  playerId: string;
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
type RenderCtx = { isMe: boolean };

type Column<T> = {
  key: string;
  label: string;
  align: "left" | "right";
  sortValue: (r: T) => SortValue;
  render: (r: T, ctx: RenderCtx) => ReactNode;
};

const battingColumns: Column<BattingRow>[] = [
  {
    key: "name",
    label: "選手",
    align: "left",
    sortValue: (r) => r.playerName,
    render: (r, ctx) => (
      <PlayerName name={r.playerName} isGuest={r.isGuest} isMe={ctx.isMe} />
    ),
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
    render: (r, ctx) => (
      <PlayerName name={r.playerName} isGuest={r.isGuest} isMe={ctx.isMe} />
    ),
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
 * ログイン中の本人の行はハイライトして「自分ごと」に見えるようにする。
 */
export function StatsTabs({
  batting,
  pitching,
  highlightPlayerId,
  details,
}: {
  batting: BattingRow[];
  pitching: PitchingRow[];
  highlightPlayerId?: string;
  details?: Record<string, PlayerDetail>;
}) {
  const [tab, setTab] = useState<"batting" | "pitching">("batting");

  return (
    <div className="mt-4">
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
            rowId={(r) => r.playerId}
            highlightId={highlightPlayerId}
            details={details}
            initialSort={{ key: "avg", dir: "desc" }}
            emptyMessage="集計対象の打席記録がありません。"
          />
        ) : (
          <SortableTable
            rows={pitching}
            columns={pitchingColumns}
            rowId={(r) => r.playerId}
            highlightId={highlightPlayerId}
            details={details}
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
  rowId,
  highlightId,
  details,
  initialSort,
  emptyMessage,
}: {
  rows: T[];
  columns: Column<T>[];
  rowId: (r: T) => string;
  highlightId?: string;
  details?: Record<string, PlayerDetail>;
  initialSort: { key: string; dir: SortDir };
  emptyMessage: string;
}) {
  const [sort, setSort] = useState(initialSort);
  const [expanded, setExpanded] = useState<string | null>(null);

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
          {sorted.map((r, i) => {
            const id = rowId(r);
            const isMe = highlightId !== undefined && id === highlightId;
            const detail = details?.[id];
            const isExpanded = expanded === id;
            return (
              <ExpandableRow
                key={i}
                isMe={isMe}
                detail={detail}
                isExpanded={isExpanded}
                colSpan={columns.length}
                onToggle={() => setExpanded(isExpanded ? null : id)}
                row={
                  <>
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-2 py-2 ${
                          c.align === "left"
                            ? "text-left font-medium"
                            : "text-right"
                        }`}
                      >
                        {c.render(r, { isMe })}
                      </td>
                    ))}
                  </>
                }
              />
            );
          })}
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

function ExpandableRow({
  isMe,
  detail,
  isExpanded,
  colSpan,
  onToggle,
  row,
}: {
  isMe: boolean;
  detail?: PlayerDetail;
  isExpanded: boolean;
  colSpan: number;
  onToggle: () => void;
  row: ReactNode;
}) {
  return (
    <>
      <tr
        onClick={detail ? onToggle : undefined}
        aria-expanded={detail ? isExpanded : undefined}
        className={`border-b ${detail ? "cursor-pointer hover:bg-accent/40" : ""} ${
          isMe ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : ""
        }`}
      >
        {row}
      </tr>
      {detail && isExpanded && (
        <tr className="border-b bg-muted/30">
          <td colSpan={colSpan} className="px-3 py-3 text-left">
            <div className="flex items-baseline gap-2">
              <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                {detail.epithet}
              </span>
            </div>
            <div className="mt-2 max-w-sm">
              <div className="text-xs text-muted-foreground">打球傾向</div>
              <div className="mt-1">
                <SprayBars spray={detail.spray} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function PlayerName({
  name,
  isGuest,
  isMe,
}: {
  name: string;
  isGuest: boolean;
  isMe: boolean;
}) {
  return (
    <>
      {name}
      {isMe && (
        <span className="ml-1.5 rounded bg-primary px-1 py-0.5 text-[10px] font-normal text-primary-foreground">
          あなた
        </span>
      )}
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
