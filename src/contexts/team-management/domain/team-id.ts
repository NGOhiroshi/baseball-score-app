import type { Brand } from "@/shared/domain/identity";

/**
 * チームの識別子（値オブジェクト）。
 * 単なる string ではなく Brand 型として区別することで、
 * MemberId など他の ID と取り違えるバグをコンパイル時に防ぐ。
 */
export type TeamId = Brand<string, "TeamId">;

/**
 * MVP（Phase 1）は単一チーム「スミスブラザーズ」のみ。
 * supabase/migrations/20260520000001_initial_schema.sql のシードと一致させる。
 * Phase 2 のマルチテナント化で動的なテナント解決に置き換える。
 */
export const SMITH_BROTHERS_TEAM_ID =
  "00000000-0000-0000-0000-000000000001" as TeamId;
