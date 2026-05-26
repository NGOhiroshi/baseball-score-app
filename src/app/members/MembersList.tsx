"use client";

import { useMemo, useState, useTransition } from "react";
import {
  issueAccountsBulkAction,
  resetMemberPasswordAction,
  updateMemberJerseyNumbersAction,
  type BulkIssueResult,
} from "./actions";

export type MemberRowView = {
  id: string;
  name: string;
  roleLabel: string;
  hasAccount: boolean;
  email: string | null;
  joinedAt: string;
  jerseyNumberMain: number | null;
  jerseyNumberSub: number | null;
};

// 仮パスワード生成（共有しやすい英数字。紛らわしい文字 0/O/1/l/I は除外）。
// crypto.randomUUID はセキュアコンテキスト限定なので、非HTTPS（LAN IP アクセス等）
// でも使える getRandomValues を優先し、無ければ Math.random にフォールバックする。
function genTempPassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const len = 12;
  const out: string[] = [];
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (c?.getRandomValues) {
    const buf = new Uint32Array(len);
    c.getRandomValues(buf);
    for (let i = 0; i < len; i++) out.push(chars[buf[i] % chars.length]);
  } else {
    for (let i = 0; i < len; i++)
      out.push(chars[Math.floor(Math.random() * chars.length)]);
  }
  return out.join("");
}

export function MembersList({
  rows,
  isAdmin,
}: {
  rows: MemberRowView[];
  isAdmin: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showPanel, setShowPanel] = useState(false);
  const [result, setResult] = useState<{
    sharedPassword: string;
    results: BulkIssueResult[];
  } | null>(null);

  const nameById = useMemo(
    () => new Map(rows.map((r) => [r.id, r.name])),
    [rows],
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedRows = rows.filter((r) => selected.has(r.id));

  return (
    <div className="mt-6">
      {/* 一括発行ツールバー */}
      {isAdmin && selected.size > 0 && !showPanel && (
        <div className="mb-3 flex items-center justify-between rounded-md border bg-accent/40 p-3 text-sm">
          <span>{selected.size}人を選択中</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              選択解除
            </button>
            <button
              type="button"
              onClick={() => setShowPanel(true)}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              選択した{selected.size}人にアカウント発行
            </button>
          </div>
        </div>
      )}

      {/* 一括発行パネル */}
      {showPanel && (
        <BulkIssuePanel
          members={selectedRows.map((r) => ({ id: r.id, name: r.name }))}
          onCancel={() => setShowPanel(false)}
          onDone={(r) => {
            setResult(r);
            setShowPanel(false);
            setSelected(new Set());
          }}
        />
      )}

      {/* 一括発行の結果（再描画で消えないようリスト上部に表示） */}
      {result && (
        <BulkResultBox
          sharedPassword={result.sharedPassword}
          results={result.results}
          nameById={nameById}
          onClose={() => setResult(null)}
        />
      )}

      <ul className="space-y-2">
        {rows.map((m) => (
          <li key={m.id} className="rounded-md border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {isAdmin && !m.hasAccount && (
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggle(m.id)}
                    aria-label={`${m.name} を選択`}
                    className="h-4 w-4 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    {m.jerseyNumberMain !== null && (
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                        #{m.jerseyNumberMain}
                      </span>
                    )}
                    {m.jerseyNumberSub !== null && (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        #{m.jerseyNumberSub}
                        <span className="ml-0.5 opacity-60">sub</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.roleLabel}
                    {m.hasAccount ? (
                      <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-400">
                        ログイン可
                      </span>
                    ) : (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5">
                        アカウント未発行
                      </span>
                    )}
                  </div>
                  {m.email && (
                    <div className="truncate text-xs text-muted-foreground">
                      {m.email}
                    </div>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">
                登録: {m.joinedAt}
              </div>
            </div>

            {isAdmin && m.hasAccount && (
              <ResetPassword memberId={m.id} memberName={m.name} />
            )}
            {isAdmin && (
              <JerseyNumberEdit
                memberId={m.id}
                memberName={m.name}
                initialMain={m.jerseyNumberMain}
                initialSub={m.jerseyNumberSub}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BulkIssuePanel({
  members,
  onCancel,
  onDone,
}: {
  members: { id: string; name: string }[];
  onCancel: () => void;
  onDone: (r: { sharedPassword: string; results: BulkIssueResult[] }) => void;
}) {
  const [sharedPassword, setSharedPassword] = useState(genTempPassword);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    const items = members.map((m) => ({
      memberId: m.id,
      email: (emails[m.id] ?? "").trim(),
    }));
    if (items.some((it) => it.email === "")) {
      setError("全員のメールアドレスを入力してください");
      return;
    }
    if (sharedPassword.length < 8) {
      setError("共通パスワードは8文字以上にしてください");
      return;
    }
    startTransition(async () => {
      try {
        const { results } = await issueAccountsBulkAction(items, sharedPassword);
        onDone({ sharedPassword, results });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  return (
    <div className="mb-3 rounded-md border bg-card p-4">
      <div className="text-sm font-medium">アカウント一括発行（{members.length}人）</div>
      <p className="mt-1 text-xs text-muted-foreground">
        全員に共通の仮パスワードを発行します。各メンバーのログイン用メールを入力してください。
      </p>

      <div className="mt-3">
        <label className="block text-xs font-medium">共通の仮パスワード</label>
        <div className="mt-1 flex gap-2">
          <input
            value={sharedPassword}
            onChange={(e) => setSharedPassword(e.target.value)}
            className="w-48 rounded-md border border-input bg-background px-3 py-1.5 font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setSharedPassword(genTempPassword())}
            className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            再生成
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2">
            <span className="w-24 shrink-0 truncate text-sm">{m.name}</span>
            <input
              type="email"
              value={emails[m.id] ?? ""}
              onChange={(e) =>
                setEmails((prev) => ({ ...prev, [m.id]: e.target.value }))
              }
              placeholder="player@example.com"
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "発行中..." : "発行する"}
        </button>
      </div>
    </div>
  );
}

function BulkResultBox({
  sharedPassword,
  results,
  nameById,
  onClose,
}: {
  sharedPassword: string;
  results: BulkIssueResult[];
  nameById: Map<string, string>;
  onClose: () => void;
}) {
  const okCount = results.filter((r) => r.ok).length;
  return (
    <div className="mb-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium text-emerald-700 dark:text-emerald-400">
          発行完了（成功 {okCount}/{results.length}）
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
      <p className="mt-1 text-muted-foreground">
        共通の仮パスワードを各メンバーに共有してください（この画面でしか表示されません）。本人はログイン後、設定画面で変更できます。
      </p>
      <div className="mt-2 font-mono text-sm">
        共通仮パスワード: <span className="font-semibold">{sharedPassword}</span>
      </div>
      <ul className="mt-3 space-y-1">
        {results.map((r) => (
          <li key={r.memberId} className="font-mono text-xs">
            {r.ok ? "✓" : "×"} {nameById.get(r.memberId) ?? r.memberId}（{r.email}）
            {!r.ok && (
              <span className="text-destructive"> — {r.error}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function JerseyNumberEdit({
  memberId,
  memberName,
  initialMain,
  initialSub,
}: {
  memberId: string;
  memberName: string;
  initialMain: number | null;
  initialSub: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [main, setMain] = useState(
    initialMain === null ? "" : String(initialMain),
  );
  const [sub, setSub] = useState(
    initialSub === null ? "" : String(initialSub),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parseNum = (s: string): number | null => {
    const t = s.trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  const handleSave = () => {
    setError(null);
    const m = parseNum(main);
    const s = parseNum(sub);
    if (
      (m !== null && (!Number.isInteger(m) || m < 0 || m > 999)) ||
      (s !== null && (!Number.isInteger(s) || s < 0 || s > 999))
    ) {
      setError("背番号は0〜999の整数で入力してください。");
      return;
    }
    startTransition(async () => {
      try {
        await updateMemberJerseyNumbersAction(memberId, m, s);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  if (!open) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          背番号編集
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-md border bg-card p-3">
      <div className="text-xs font-medium">{memberName} の背番号</div>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="text-xs">
          <span className="block text-[11px] text-muted-foreground">メイン</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            value={main}
            onChange={(e) => setMain(e.target.value)}
            className="mt-1 w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="block text-[11px] text-muted-foreground">サブ</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            className="mt-1 w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setMain(initialMain === null ? "" : String(initialMain));
            setSub(initialSub === null ? "" : String(initialSub));
          }}
          className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          キャンセル
        </button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        空欄で「未設定」になります。0〜999の整数。
      </p>
      {error && (
        <p className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function ResetPassword({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleReset = () => {
    if (
      !confirm(
        `${memberName} さんの仮パスワードを再発行しますか？\n（現在のパスワードは使えなくなります）`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const { tempPassword } = await resetMemberPasswordAction(memberId);
        setTempPassword(tempPassword);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  if (tempPassword) {
    return (
      <div className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
        <p className="font-medium text-emerald-700 dark:text-emerald-400">
          仮パスワードを再発行しました
        </p>
        <p className="mt-1 text-muted-foreground">
          以下を {memberName} さんに共有してください（この画面でしか表示されません）。
        </p>
        <div className="mt-2 font-mono text-sm">
          仮パスワード: <span className="font-semibold">{tempPassword}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleReset}
        disabled={isPending}
        className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
      >
        {isPending ? "再発行中..." : "仮パス再発行"}
      </button>
      {error && (
        <p className="mt-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
