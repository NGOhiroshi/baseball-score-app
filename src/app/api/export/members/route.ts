import { createClient } from "@/lib/supabase/server";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";
import { toCsv } from "@/lib/csv";
import { csvResponse, todayStamp } from "../_helpers";

// auth_user_id は Supabase 内部の認証参照なので外には出さない。
const COLUMNS = [
  "id",
  "name",
  "role",
  "joined_at",
  "email",
  "photo_url",
  "jersey_number_main",
  "jersey_number_sub",
] as const;

/** メンバー一覧の CSV エクスポート */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select(COLUMNS.join(","))
    .eq("team_id", SMITH_BROTHERS_TEAM_ID)
    .order("joined_at", { ascending: true });
  if (error) throw new Error(error.message);

  return csvResponse(
    `members-${todayStamp()}.csv`,
    toCsv((data ?? []) as unknown as Record<string, unknown>[], [...COLUMNS]),
  );
}
