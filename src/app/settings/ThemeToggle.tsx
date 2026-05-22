"use client";

import { useEffect, useState } from "react";

/**
 * ダークモードの手動トグル（設定ページ内）。
 *
 * 真実は <html> の "dark" クラスと localStorage('theme')。
 * 初回マウントで現在の状態を読み取り、トグル時に DOM と localStorage を更新する。
 * 描画前の適用は layout.tsx のインラインスクリプトが担う（チラつき防止）。
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage 不可の環境では永続化のみ諦める
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4">
      <div>
        <div className="text-sm font-medium">ダークモード</div>
        <div className="text-xs text-muted-foreground">
          画面を暗い配色に切り替えます（この端末に保存）
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="ダークモード切り替え"
        onClick={toggle}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
          isDark ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform ${
            isDark ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
