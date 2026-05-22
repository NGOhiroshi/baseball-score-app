"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * パスワード変更フォーム。
 * 管理者発行の仮パスワードでログインした本人が、自分のパスワードを変更する。
 */
export function ChangePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<
    { type: "ok" | "error"; text: string } | null
  >(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (password.length < 8) {
      setMessage({ type: "error", text: "パスワードは8文字以上にしてください。" });
      return;
    }
    if (password !== confirm) {
      setMessage({ type: "error", text: "確認用パスワードが一致しません。" });
      return;
    }
    setIsPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setIsPending(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setPassword("");
    setConfirm("");
    setMessage({ type: "ok", text: "パスワードを変更しました。" });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-4">
      <div className="text-sm font-medium">パスワード変更</div>
      <div className="mt-3 space-y-3">
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="新しいパスワード（8文字以上）"
          className="block w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="新しいパスワード（確認）"
          className="block w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        {message && (
          <p
            className={`text-sm ${
              message.type === "ok" ? "text-emerald-600" : "text-destructive"
            }`}
          >
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "変更中..." : "変更する"}
        </button>
      </div>
    </form>
  );
}
