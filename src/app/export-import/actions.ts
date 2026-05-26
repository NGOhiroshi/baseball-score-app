"use server";

import JSZip from "jszip";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/current-member";
import { csvToRecords } from "@/lib/csv";
import { Member } from "@/contexts/team-management/domain/member";
import { newMemberId, type MemberId } from "@/contexts/team-management/domain/member-id";
import { isMemberRole } from "@/contexts/team-management/domain/member-role";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";

export type ImportError = { row: number; message: string };
export type ImportMembersResult = {
  imported: number;
  errors: ImportError[];
};

export type ImportGameDataResult = {
  summary: { table: string; count: number; error?: string }[];
};

/** YYYY-MM-DD */
function toDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// =========================================================================
// メンバー一括取り込み（CSV）
// =========================================================================
export async function importMembersAction(
  formData: FormData,
): Promise<ImportMembersResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("CSVファイルを選択してください");
  }
  const records = csvToRecords(await file.text());

  type MemberPayload = {
    id: string;
    team_id: string;
    name: string;
    photo_url: string | null;
    role: string;
    joined_at: string;
    email: string | null;
    jersey_number_main: number | null;
    jersey_number_sub: number | null;
  };

  const parseJersey = (raw: string | undefined): number | null => {
    if (raw === undefined) return null;
    const s = raw.trim();
    if (s === "") return null;
    const n = Number(s);
    if (!Number.isFinite(n)) {
      throw new Error(`不正な背番号: ${raw}`);
    }
    return n;
  };
  const payloads: MemberPayload[] = [];
  const errors: ImportError[] = [];

  records.forEach((rec, idx) => {
    const rowNo = idx + 2; // ヘッダ行を 1 行目とみなす
    try {
      const name = (rec["name"] ?? "").trim();
      const roleRaw = (rec["role"] ?? "regular").trim() || "regular";
      if (!isMemberRole(roleRaw)) {
        throw new Error(`不正な権限: ${roleRaw}（admin/regular のみ）`);
      }
      const email = (rec["email"] ?? "").trim() || null;
      const photoUrl = (rec["photo_url"] ?? "").trim() || null;
      const id = ((rec["id"] ?? "").trim() || newMemberId()) as MemberId;
      const joinedAtStr = (rec["joined_at"] ?? "").trim();
      const joinedAt = joinedAtStr ? new Date(joinedAtStr) : new Date();
      if (Number.isNaN(joinedAt.getTime())) {
        throw new Error(`不正な joined_at: ${joinedAtStr}`);
      }
      const jerseyMain = parseJersey(rec["jersey_number_main"]);
      const jerseySub = parseJersey(rec["jersey_number_sub"]);
      // ドメインで名前長・背番号範囲など検証（不正なら例外）
      const m = Member.restore({
        id,
        teamId: SMITH_BROTHERS_TEAM_ID,
        name,
        photoUrl,
        role: roleRaw,
        joinedAt,
        email,
        authUserId: null,
        jerseyNumberMain: jerseyMain,
        jerseyNumberSub: jerseySub,
      });
      // 既存行の auth_user_id を壊さないため、ペイロードから除外して upsert
      payloads.push({
        id: m.id,
        team_id: m.teamId,
        name: m.name,
        photo_url: m.photoUrl,
        role: m.role,
        joined_at: toDateOnly(m.joinedAt),
        email: m.email,
        jersey_number_main: m.jerseyNumberMain,
        jersey_number_sub: m.jerseyNumberSub,
      });
    } catch (e) {
      errors.push({
        row: rowNo,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  });

  if (payloads.length > 0) {
    const admin = createAdminClient();
    const { error } = await admin.from("members").upsert(payloads);
    if (error) {
      errors.push({ row: 0, message: `DB保存に失敗: ${error.message}` });
      revalidatePath("/members");
      return { imported: 0, errors };
    }
  }

  revalidatePath("/members");
  return { imported: payloads.length, errors };
}

// =========================================================================
// 試合データ一括取り込み（ZIP）
// =========================================================================
type ColType = "string" | "number" | "boolean";
type ColSpec = { name: string; type: ColType };

function coerceRow(
  rec: Record<string, string>,
  specs: ColSpec[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const s of specs) {
    const raw = rec[s.name];
    if (raw === undefined) continue;
    const v = raw.trim();
    if (v === "") {
      out[s.name] = null;
      continue;
    }
    switch (s.type) {
      case "number":
        out[s.name] = Number(v);
        break;
      case "boolean":
        out[s.name] = v.toLowerCase() === "true";
        break;
      default:
        out[s.name] = v;
    }
  }
  return out;
}

const GAMES_SPEC: ColSpec[] = [
  { name: "id", type: "string" },
  { name: "team_id", type: "string" },
  { name: "game_date", type: "string" },
  { name: "opponent_name", type: "string" },
  { name: "bats_first", type: "boolean" },
];
const ORDER_SPEC: ColSpec[] = [
  { name: "id", type: "string" },
  { name: "game_id", type: "string" },
  { name: "order_number", type: "number" },
  { name: "member_id", type: "string" },
  { name: "guest_player_id", type: "string" },
  { name: "position", type: "number" },
];
const PA_SPEC: ColSpec[] = [
  { name: "id", type: "string" },
  { name: "game_id", type: "string" },
  { name: "member_id", type: "string" },
  { name: "guest_player_id", type: "string" },
  { name: "inning", type: "number" },
  { name: "sequence_in_inning", type: "number" },
  { name: "result_category", type: "string" },
  { name: "hit_type", type: "string" },
  { name: "walk_type", type: "string" },
  { name: "out_type", type: "string" },
  { name: "sacrifice_type", type: "string" },
  { name: "had_error", type: "boolean" },
  { name: "batting_direction", type: "string" },
  { name: "fielder_position", type: "number" },
  { name: "runs_batted_in", type: "number" },
  { name: "run_scored", type: "boolean" },
];
const PAP_SPEC: ColSpec[] = [
  { name: "id", type: "string" },
  { name: "game_id", type: "string" },
  { name: "pitcher_member_id", type: "string" },
  { name: "pitcher_guest_player_id", type: "string" },
  { name: "entered_at_inning", type: "number" },
];
const IPR_SPEC: ColSpec[] = [
  { name: "id", type: "string" },
  { name: "pitching_appearance_id", type: "string" },
  { name: "inning_number", type: "number" },
  { name: "outs_recorded", type: "number" },
  { name: "runs_allowed", type: "number" },
  { name: "earned_runs", type: "number" },
  { name: "hits_allowed", type: "number" },
  { name: "strikeouts", type: "number" },
  { name: "walks_allowed", type: "number" },
];
const SCORES_SPEC: ColSpec[] = [
  { name: "id", type: "string" },
  { name: "game_id", type: "string" },
  { name: "inning_number", type: "number" },
  { name: "our_score", type: "number" },
  { name: "opponent_score", type: "number" },
];
const GUEST_SPEC: ColSpec[] = [
  { name: "id", type: "string" },
  { name: "team_id", type: "string" },
  { name: "name", type: "string" },
];

const EXPECTED_FILES = [
  "games.csv",
  "batting_order_entries.csv",
  "plate_appearances.csv",
  "pitching_appearances.csv",
  "inning_pitched_records.csv",
  "inning_scores.csv",
  "guest_players.csv",
] as const;

/** チーム間データ混在を防ぐため team_id は現在のチームに上書きする */
function scopeTeamId(row: Record<string, unknown>): Record<string, unknown> {
  if ("team_id" in row) row.team_id = SMITH_BROTHERS_TEAM_ID;
  return row;
}

export async function importGameDataAction(
  formData: FormData,
): Promise<ImportGameDataResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("ZIPファイルを選択してください");
  }
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const missing = EXPECTED_FILES.filter((n) => !zip.file(n));
  if (missing.length > 0) {
    throw new Error(`ZIP内に必要なファイルがありません: ${missing.join(", ")}`);
  }

  const read = async (name: string): Promise<Record<string, string>[]> => {
    const entry = zip.file(name);
    if (!entry) return [];
    return csvToRecords(await entry.async("text"));
  };

  const guests = (await read("guest_players.csv"))
    .map((r) => coerceRow(r, GUEST_SPEC))
    .map(scopeTeamId);
  const games = (await read("games.csv"))
    .map((r) => coerceRow(r, GAMES_SPEC))
    .map(scopeTeamId);
  const order = (await read("batting_order_entries.csv")).map((r) =>
    coerceRow(r, ORDER_SPEC),
  );
  const pa = (await read("plate_appearances.csv")).map((r) =>
    coerceRow(r, PA_SPEC),
  );
  const pap = (await read("pitching_appearances.csv")).map((r) =>
    coerceRow(r, PAP_SPEC),
  );
  const ipr = (await read("inning_pitched_records.csv")).map((r) =>
    coerceRow(r, IPR_SPEC),
  );
  const scores = (await read("inning_scores.csv")).map((r) =>
    coerceRow(r, SCORES_SPEC),
  );

  // FK 順に upsert（子テーブルが親より先だと FK 失敗する）
  const ordered: { table: string; rows: Record<string, unknown>[] }[] = [
    { table: "guest_players", rows: guests },
    { table: "games", rows: games },
    { table: "batting_order_entries", rows: order },
    { table: "plate_appearances", rows: pa },
    { table: "pitching_appearances", rows: pap },
    { table: "inning_pitched_records", rows: ipr },
    { table: "inning_scores", rows: scores },
  ];

  const admin = createAdminClient();
  const summary: ImportGameDataResult["summary"] = [];
  for (const { table, rows } of ordered) {
    if (rows.length === 0) {
      summary.push({ table, count: 0 });
      continue;
    }
    const { error } = await admin.from(table).upsert(rows);
    summary.push({
      table,
      count: rows.length,
      error: error?.message,
    });
  }

  revalidatePath("/games");
  revalidatePath("/stats");
  return { summary };
}
