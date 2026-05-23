"use client";

import { useState, useTransition } from "react";
import {
  importGameDataAction,
  importMembersAction,
  type ImportGameDataResult,
  type ImportMembersResult,
} from "./actions";

const TABLE_LABELS: Record<string, string> = {
  guest_players: "助っ人選手",
  games: "試合",
  batting_order_entries: "打順",
  plate_appearances: "打席結果",
  pitching_appearances: "投手登板",
  inning_pitched_records: "投手イニング記録",
  inning_scores: "イニングスコア",
};

export function ImportSection() {
  return (
    <div className="mt-3 space-y-3">
      <MembersImport />
      <GameDataImport />
    </div>
  );
}

function MembersImport() {
  const [formKey, setFormKey] = useState(0);
  const [result, setResult] = useState<ImportMembersResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const r = await importMembersAction(fd);
        setResult(r);
        if (r.imported > 0) setFormKey((k) => k + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  return (
    <form
      key={formKey}
      onSubmit={handleSubmit}
      className="rounded-lg border bg-card p-4"
    >
      <div className="text-sm font-medium">メンバー一括取り込み（CSV）</div>
      <p className="mt-1 text-xs text-muted-foreground">
        列: <span className="font-mono">name</span>（必須）、
        <span className="font-mono">role</span>（admin/regular、既定 regular）、
        <span className="font-mono">email</span>、
        <span className="font-mono">photo_url</span>、
        <span className="font-mono">id</span>、
        <span className="font-mono">joined_at</span>（任意）。
        既存 id があれば更新（auth_user_id は保護）、無ければ新規発番。
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "取り込み中..." : "取り込む"}
        </button>
      </div>
      {error && (
        <p className="mt-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {result && (
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-emerald-700 dark:text-emerald-400">
            {result.imported}件 取り込み完了
          </p>
          {result.errors.length > 0 && (
            <ul className="space-y-0.5 text-xs text-destructive">
              {result.errors.map((e, i) => (
                <li key={i}>
                  {e.row > 0 ? `行 ${e.row}: ` : ""}
                  {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

function GameDataImport() {
  const [formKey, setFormKey] = useState(0);
  const [result, setResult] = useState<ImportGameDataResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !confirm(
        "試合データを取り込みます。同じIDの行があれば上書きされます。続行しますか？",
      )
    ) {
      return;
    }
    setError(null);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const r = await importGameDataAction(fd);
        setResult(r);
        setFormKey((k) => k + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  return (
    <form
      key={formKey}
      onSubmit={handleSubmit}
      className="rounded-lg border bg-card p-4"
    >
      <div className="text-sm font-medium">試合データ取り込み（ZIP）</div>
      <p className="mt-1 text-xs text-muted-foreground">
        エクスポートと同じ構成（games / batting_order_entries / plate_appearances /
        pitching_appearances / inning_pitched_records / inning_scores / guest_players の7CSV）の
        ZIPを取り込みます。**先にメンバーを取り込んでおいてください**（FK整合のため）。
        同じIDの行があれば上書きされます。
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          name="file"
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          required
          className="text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "取り込み中..." : "取り込む"}
        </button>
      </div>
      {error && (
        <p className="mt-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {result && (
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-emerald-700 dark:text-emerald-400">
            取り込み完了
          </p>
          <ul className="space-y-0.5 text-xs">
            {result.summary.map((s) => (
              <li key={s.table}>
                {s.error ? "×" : "✓"} {TABLE_LABELS[s.table] ?? s.table}（
                {s.count}件{s.error && ` — ${s.error}`}）
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
