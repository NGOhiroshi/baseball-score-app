import Link from "next/link";
import { registerMemberAction } from "../actions";

/**
 * メンバー新規登録画面（UC-TEAM-1）。
 *
 * Server Action をフォームの action に直接渡すだけ。
 * JavaScript 無効でも動く Progressive Enhancement 構成。
 */
export default function NewMemberPage() {
  return (
    <main className="container py-8">
      <div className="mb-6 flex items-center gap-2">
        <Link
          href="/members"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← メンバー一覧
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">新規メンバー登録</h1>

      <form action={registerMemberAction} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium"
          >
            選手名 <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={50}
            placeholder="例: 鷲見巣 太郎"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium">
            権限 <span className="text-destructive">*</span>
          </label>
          <select
            id="role"
            name="role"
            required
            defaultValue="regular"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="regular">一般メンバー</option>
            <option value="admin">管理者</option>
          </select>
        </div>

        <div>
          <label htmlFor="photoUrl" className="block text-sm font-medium">
            顔写真URL（任意）
          </label>
          <input
            id="photoUrl"
            name="photoUrl"
            type="url"
            placeholder="https://..."
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Phase 2 で Supabase Storage のアップロードに対応予定
          </p>
        </div>

        <div className="flex gap-2 pt-4">
          <Link
            href="/members"
            className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            登録
          </button>
        </div>
      </form>
    </main>
  );
}
