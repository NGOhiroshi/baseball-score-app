import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { ChangePassword } from "./ChangePassword";
import { LogoutButton } from "./LogoutButton";

export default function SettingsPage() {
  return (
    <main className="container py-8">
      <div className="mb-4">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← ホーム
        </Link>
      </div>

      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">⚙️ 設定</h1>
      </header>

      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">表示</h2>
        <ThemeToggle />
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">アカウント</h2>
        <ChangePassword />
        <LogoutButton />
      </section>
    </main>
  );
}
