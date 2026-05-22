import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GetTeamStatsUseCase } from "@/contexts/statistics/application/get-team-stats.usecase";
import { StatsSupabaseRepository } from "@/contexts/statistics/infrastructure/stats.supabase.repository";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";
import {
  StatsTabs,
  type BattingRow,
  type PitchingRow,
} from "./StatsTabs";

/**
 * チーム成績画面（UC-STAT-1 / UC-STAT-2）。
 *
 * 成績集計コンテキストの読み取りモデルを表示する。集約は持たず、
 * DB の集計 VIEW を SELECT した結果（打撃・投手）を一覧表にする。
 * `?year=2026` で年度別、指定なしで通算。
 */
export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : null;

  const supabase = await createClient();

  // 年度切替の選択肢: 試合のある年度を抽出
  const { data: gameDates } = await supabase
    .from("games")
    .select("game_date")
    .eq("team_id", SMITH_BROTHERS_TEAM_ID);
  const years = Array.from(
    new Set(
      (gameDates ?? []).map((g) =>
        new Date(g.game_date as string).getFullYear(),
      ),
    ),
  ).sort((a, b) => b - a);

  const statsRepo = new StatsSupabaseRepository(supabase);
  const res = await new GetTeamStatsUseCase(statsRepo).execute({
    teamId: SMITH_BROTHERS_TEAM_ID,
    year,
  });
  if (!res.ok) throw res.error;

  // クライアントへ渡すため、整形済みラベルとソート用の生値を持つ
  // プレーンなビューモデルに詰め替える（クラスインスタンスは境界で
  // メソッドを失うため）。
  const battingRows: BattingRow[] = res.value.batting.map((s) => ({
    playerName: s.playerName,
    isGuest: s.isGuest,
    average: s.battingAverage,
    averageLabel: s.formatAverage(),
    plateAppearances: s.plateAppearances,
    atBats: s.atBats,
    hits: s.hits,
    homeRuns: s.homeRuns,
    runsBattedIn: s.runsBattedIn,
    runsScored: s.runsScored,
  }));
  const pitchingRows: PitchingRow[] = res.value.pitching.map((s) => ({
    playerName: s.playerName,
    isGuest: s.isGuest,
    era: s.earnedRunAverage,
    eraLabel: s.formatEra(),
    ipLabel: s.formatInningsPitched(),
    totalOuts: s.fullInnings * 3 + s.partialOuts,
    runsAllowed: s.runsAllowed,
    earnedRuns: s.earnedRuns,
    hitsAllowed: s.hitsAllowed,
    strikeouts: s.strikeouts,
    walksAllowed: s.walksAllowed,
  }));

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

      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">📊 チーム成績</h1>
        <div className="flex flex-wrap gap-2">
          <YearTab label="通算" href="/stats" active={year === null} />
          {years.map((y) => (
            <YearTab
              key={y}
              label={`${y}年`}
              href={`/stats?year=${y}`}
              active={year === y}
            />
          ))}
        </div>
      </header>

      <StatsTabs batting={battingRows} pitching={pitchingRows} />
    </main>
  );
}

function YearTab({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-accent"
      }`}
    >
      {label}
    </Link>
  );
}
