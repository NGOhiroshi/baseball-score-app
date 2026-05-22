/**
 * 打球分布バー（左/中/右/内野）。
 * 純粋な表示コンポーネントなのでServer/Client どちらからも使える。
 */
export type SprayCounts = {
  left: number;
  center: number;
  right: number;
  infield: number;
};

export function SprayBars({ spray }: { spray: SprayCounts }) {
  const total = spray.left + spray.center + spray.right + spray.infield;
  if (total === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        打球位置の記録がまだありません。
      </p>
    );
  }
  const pct = (n: number) => `${(n / total) * 100}%`;
  const segments: { label: string; value: number; color: string }[] = [
    { label: "左", value: spray.left, color: "bg-amber-500" },
    { label: "中", value: spray.center, color: "bg-emerald-500" },
    { label: "右", value: spray.right, color: "bg-sky-500" },
    { label: "内野", value: spray.infield, color: "bg-muted-foreground/50" },
  ];
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {segments.map(
          (s) =>
            s.value > 0 && (
              <div
                key={s.label}
                className={s.color}
                style={{ width: pct(s.value) }}
              />
            ),
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-sm ${s.color}`} />
            {s.label} {s.value}
            <span className="opacity-70">
              ({Math.round((s.value / total) * 100)}%)
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
