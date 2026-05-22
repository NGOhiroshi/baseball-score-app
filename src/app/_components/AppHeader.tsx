import Link from "next/link";

const NAV = [
  { href: "/members", label: "メンバー" },
  { href: "/games", label: "試合" },
  { href: "/stats", label: "成績" },
  { href: "/settings", label: "設定" },
];

/**
 * 全画面共通のヘッダ。
 * ロゴからホームへ戻れ、主要セクションへの導線を常時提供する。
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center justify-between gap-3">
        <Link href="/" className="font-bold tracking-tight">
          ⚾ 草野球スコア
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-2.5 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
