import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GetTeamStatsUseCase } from "@/contexts/statistics/application/get-team-stats.usecase";
import { GetTeamSummaryUseCase } from "@/contexts/statistics/application/get-team-summary.usecase";
import { GetPlayerSprayUseCase } from "@/contexts/statistics/application/get-player-spray.usecase";
import { StatsSupabaseRepository } from "@/contexts/statistics/infrastructure/stats.supabase.repository";
import { TeamStats } from "@/contexts/statistics/domain/team-stats";
import type { BattingStats } from "@/contexts/statistics/domain/batting-stats";
import type { PitchingStats } from "@/contexts/statistics/domain/pitching-stats";
import { playerEpithet } from "@/contexts/statistics/domain/player-epithet";
import type { GameResultView } from "@/contexts/statistics/domain/stats.repository";
import { SMITH_BROTHERS_TEAM_ID } from "@/contexts/team-management/domain/team-id";
import { GetTeamSettingsUseCase } from "@/contexts/team-management/application/get-team-settings.usecase";
import { TeamSettingsSupabaseRepository } from "@/contexts/team-management/infrastructure/team-settings.supabase.repository";
import { getCurrentMember } from "@/lib/auth/current-member";
import {
  StatsTabs,
  type BattingRow,
  type PitchingRow,
  type PlayerDetail,
} from "./StatsTabs";
import { SprayBars, type SprayCounts } from "./SprayBars";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : null;

  const supabase = await createClient();
  const statsRepo = new StatsSupabaseRepository(supabase);

  const teamSettingsRepo = new TeamSettingsSupabaseRepository(supabase);
  const [teamRes, statsRes, currentMember, teamSettings, sprayRes] =
    await Promise.all([
      new GetTeamSummaryUseCase(statsRepo).execute(SMITH_BROTHERS_TEAM_ID),
      new GetTeamStatsUseCase(statsRepo).execute({
        teamId: SMITH_BROTHERS_TEAM_ID,
        year,
      }),
      getCurrentMember(),
      new GetTeamSettingsUseCase(teamSettingsRepo).execute(
        SMITH_BROTHERS_TEAM_ID,
      ),
      new GetPlayerSprayUseCase(statsRepo).execute(SMITH_BROTHERS_TEAM_ID),
    ]);
  if (!teamRes.ok) throw teamRes.error;
  if (!statsRes.ok) throw statsRes.error;
  if (!sprayRes.ok) throw sprayRes.error;

  const { byYear: teamByYear, recent } = teamRes.value;
  const years = [...teamByYear.map((s) => s.year as number)].sort(
    (a, b) => b - a,
  );
  const teamSelected =
    year === null
      ? TeamStats.aggregate(teamByYear)
      : (teamByYear.find((s) => s.year === year) ?? TeamStats.empty());

  const { batting, pitching } = statsRes.value;
  const myId = currentMember?.id ?? null;
  const myBatting = myId ? batting.find((s) => s.playerId === myId) : undefined;
  const myPitching = myId
    ? pitching.find((s) => s.playerId === myId)
    : undefined;

  // 打球分布を対象期間（通算 or 年度）で選手ごとに集約
  type Aggregate = SprayCounts & { strikeouts: number };
  const sprayByPlayer = new Map<string, Aggregate>();
  for (const r of sprayRes.value) {
    if (year !== null && r.year !== year) continue;
    const cur = sprayByPlayer.get(r.playerId) ?? {
      left: 0,
      center: 0,
      right: 0,
      infield: 0,
      strikeouts: 0,
    };
    cur.left += r.left;
    cur.center += r.center;
    cur.right += r.right;
    cur.infield += r.infield;
    cur.strikeouts += r.strikeouts;
    sprayByPlayer.set(r.playerId, cur);
  }
  const emptySpray: SprayCounts = { left: 0, center: 0, right: 0, infield: 0 };

  // 個人成績テーブルの展開時に出す異名＋打球バーをマップに集約
  const playerIds = new Set<string>([
    ...batting.map((b) => b.playerId),
    ...pitching.map((p) => p.playerId),
  ]);
  const playerDetails: Record<string, PlayerDetail> = {};
  for (const pid of playerIds) {
    const b = batting.find((s) => s.playerId === pid);
    const p = pitching.find((s) => s.playerId === pid);
    const agg = sprayByPlayer.get(pid) ?? { ...emptySpray, strikeouts: 0 };
    const spray: SprayCounts = {
      left: agg.left,
      center: agg.center,
      right: agg.right,
      infield: agg.infield,
    };
    playerDetails[pid] = {
      epithet: playerEpithet({
        playerId: pid,
        batting: b,
        pitching: p,
        spray,
        battingStrikeouts: agg.strikeouts,
      }),
      spray,
    };
  }

  const mySprayAgg = myId
    ? (sprayByPlayer.get(myId) ?? { ...emptySpray, strikeouts: 0 })
    : null;
  const mySpray: SprayCounts | null = mySprayAgg
    ? {
        left: mySprayAgg.left,
        center: mySprayAgg.center,
        right: mySprayAgg.right,
        infield: mySprayAgg.infield,
      }
    : null;
  const myEpithet =
    myId && (myBatting || myPitching)
      ? playerEpithet({
          playerId: myId,
          batting: myBatting,
          pitching: myPitching,
          spray: mySpray ?? emptySpray,
          battingStrikeouts: mySprayAgg?.strikeouts ?? 0,
        })
      : null;

  // 規定打席・規定投球回は対象期間の試合数に比例（通算なら全試合、年度ならその年）
  const minPA = Math.ceil(teamSelected.games * teamSettings.qualifiedPaPerGame);
  const minInnings = Math.ceil(
    teamSelected.games * teamSettings.qualifiedInningsPerGame,
  );
  const leaders = computeLeaders(batting, pitching, minPA, minInnings * 3);

  const battingRows: BattingRow[] = batting.map((s) => ({
    playerId: s.playerId,
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
  const pitchingRows: PitchingRow[] = pitching.map((s) => ({
    playerId: s.playerId,
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

  const periodLabel = year === null ? "通算" : `${year}年`;

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
        <h1 className="text-2xl font-bold tracking-tight">📊 成績</h1>
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

      {/* あなたの成績（自分ごと） */}
      {currentMember && (
        <section className="mt-6">
          <div className="rounded-xl border bg-gradient-to-br from-primary/10 to-card p-5">
            <div className="flex flex-wrap items-baseline gap-2">
              <div className="text-sm font-semibold text-muted-foreground">
                ⚾ {currentMember.name} さんの成績（{periodLabel}）
              </div>
              {myEpithet && (
                <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  {myEpithet}
                </span>
              )}
            </div>
            {myBatting || myPitching ? (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {myBatting && (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold tracking-tight">
                        {myBatting.formatAverage()}
                      </span>
                      <span className="text-xs text-muted-foreground">打率</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <Mini label="安打" value={myBatting.hits} />
                      <Mini label="本塁打" value={myBatting.homeRuns} />
                      <Mini label="打点" value={myBatting.runsBattedIn} />
                      <Mini label="得点" value={myBatting.runsScored} />
                    </div>
                  </div>
                )}
                {myPitching && (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold tracking-tight">
                        {myPitching.formatEra()}
                      </span>
                      <span className="text-xs text-muted-foreground">防御率</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <Mini label="投球回" value={myPitching.formatInningsPitched()} />
                      <Mini label="奪三振" value={myPitching.strikeouts} />
                      <Mini label="四死球" value={myPitching.walksAllowed} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {periodLabel}の記録はまだありません。次の試合で記録を残しましょう！
              </p>
            )}
            {mySpray && (myBatting || myPitching) && (
              <div className="mt-4 max-w-md">
                <div className="text-xs text-muted-foreground">打球傾向</div>
                <div className="mt-1">
                  <SprayBars spray={mySpray} />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* タイトルホルダー */}
      {leaders.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">タイトルホルダー（{periodLabel}）</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            規定打席 {minPA}打席以上 / 規定投球回 {minInnings}回以上
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {leaders.map((l) => (
              <div key={l.title} className="rounded-lg border bg-card p-3 text-center">
                <div className="text-xs text-muted-foreground">{l.title}</div>
                <div className="mt-1 text-2xl font-bold tracking-tight">
                  {l.value}
                </div>
                <div className="mt-1 truncate text-sm">
                  {l.icon} {l.name}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* チーム成績サマリ */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">チーム成績（{periodLabel}）</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <SummaryCard title="勝敗">
            <BigStat
              value={`${teamSelected.wins}勝 ${teamSelected.losses}敗 ${teamSelected.draws}分`}
            />
            <WinLossBar
              wins={teamSelected.wins}
              losses={teamSelected.losses}
              draws={teamSelected.draws}
            />
            <StatLine label="勝率" value={teamSelected.formatWinningPercentage()} />
            {recent.length > 0 && (
              <div className="pt-1">
                <div className="text-xs text-muted-foreground">直近の試合</div>
                <RecentForm results={recent} />
              </div>
            )}
          </SummaryCard>

          <SummaryCard title="打撃">
            <BigStat value={teamSelected.formatAverage()} suffix="打率" />
            <StatLine label="打席 / 打数" value={`${teamSelected.plateAppearances} / ${teamSelected.atBats}`} />
            <StatLine label="安打 / 本塁打" value={`${teamSelected.hits} / ${teamSelected.homeRuns}`} />
            <StatLine label="打点 / 得点" value={`${teamSelected.runsBattedIn} / ${teamSelected.runsScored}`} />
          </SummaryCard>

          <SummaryCard title="投手">
            <BigStat value={teamSelected.formatEra()} suffix="防御率" />
            <StatLine label="投球回" value={teamSelected.formatInningsPitched()} />
            <StatLine label="奪三振 / 与四死球" value={`${teamSelected.strikeouts} / ${teamSelected.walksAllowed}`} />
            <StatLine label="被安打 / 失点 / 自責" value={`${teamSelected.hitsAllowed} / ${teamSelected.runsAllowed} / ${teamSelected.earnedRuns}`} />
          </SummaryCard>
        </div>
      </section>

      {/* 年度推移 */}
      {teamByYear.length > 1 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">年度推移</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-right text-sm">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left font-normal">年度</th>
                  <th className="px-2 py-2 font-normal">試合</th>
                  <th className="px-2 py-2 font-normal">勝-敗-分</th>
                  <th className="px-2 py-2 font-normal">勝率</th>
                  <th className="px-2 py-2 font-normal">打率</th>
                  <th className="px-2 py-2 font-normal">本塁打</th>
                  <th className="px-2 py-2 font-normal">防御率</th>
                  <th className="px-2 py-2 font-normal">奪三振</th>
                </tr>
              </thead>
              <tbody>
                {[...teamByYear]
                  .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
                  .map((s) => (
                    <tr key={s.year} className="border-b">
                      <td className="px-2 py-2 text-left font-medium">{s.year}年</td>
                      <td className="px-2 py-2">{s.games}</td>
                      <td className="px-2 py-2">
                        {s.wins}-{s.losses}-{s.draws}
                      </td>
                      <td className="px-2 py-2">{s.formatWinningPercentage()}</td>
                      <td className="px-2 py-2">{s.formatAverage()}</td>
                      <td className="px-2 py-2">{s.homeRuns}</td>
                      <td className="px-2 py-2">{s.formatEra()}</td>
                      <td className="px-2 py-2">{s.strikeouts}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 個人成績 */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">個人成績</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          選手の行をタップすると、その選手の異名と打球傾向が見られます。
        </p>
        <StatsTabs
          batting={battingRows}
          pitching={pitchingRows}
          highlightPlayerId={myId ?? undefined}
          details={playerDetails}
        />
      </section>
    </main>
  );
}

type Leader = { title: string; name: string; value: string; icon: string };

function computeLeaders(
  batting: BattingStats[],
  pitching: PitchingStats[],
  minPlateAppearances: number,
  minOuts: number,
): Leader[] {
  const leaders: Leader[] = [];

  const avgQualified = batting.filter(
    (s) => s.plateAppearances >= minPlateAppearances && s.battingAverage !== null,
  );
  const topAvg = maxBy(avgQualified, (s) => s.battingAverage ?? -1);
  if (topAvg) {
    leaders.push({
      title: "首位打者",
      name: topAvg.playerName,
      value: topAvg.formatAverage(),
      icon: "👑",
    });
  }

  const topHr = maxBy(
    batting.filter((s) => s.homeRuns > 0),
    (s) => s.homeRuns,
  );
  if (topHr) {
    leaders.push({
      title: "本塁打王",
      name: topHr.playerName,
      value: `${topHr.homeRuns}`,
      icon: "💥",
    });
  }

  const topRbi = maxBy(
    batting.filter((s) => s.runsBattedIn > 0),
    (s) => s.runsBattedIn,
  );
  if (topRbi) {
    leaders.push({
      title: "打点王",
      name: topRbi.playerName,
      value: `${topRbi.runsBattedIn}`,
      icon: "🔥",
    });
  }

  const eraQualified = pitching.filter(
    (s) =>
      s.fullInnings * 3 + s.partialOuts >= minOuts &&
      s.earnedRunAverage !== null,
  );
  const topEra = minBy(eraQualified, (s) => s.earnedRunAverage ?? Infinity);
  if (topEra) {
    leaders.push({
      title: "最優秀防御率",
      name: topEra.playerName,
      value: topEra.formatEra(),
      icon: "🛡️",
    });
  }

  const topK = maxBy(
    pitching.filter((s) => s.strikeouts > 0),
    (s) => s.strikeouts,
  );
  if (topK) {
    leaders.push({
      title: "奪三振王",
      name: topK.playerName,
      value: `${topK.strikeouts}`,
      icon: "⚡",
    });
  }

  return leaders;
}

function maxBy<T>(list: T[], pick: (t: T) => number): T | undefined {
  return list.reduce<T | undefined>(
    (best, cur) => (best === undefined || pick(cur) > pick(best) ? cur : best),
    undefined,
  );
}
function minBy<T>(list: T[], pick: (t: T) => number): T | undefined {
  return list.reduce<T | undefined>(
    (best, cur) => (best === undefined || pick(cur) < pick(best) ? cur : best),
    undefined,
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

function SummaryCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm font-semibold text-muted-foreground">{title}</div>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function BigStat({ value, suffix }: { value: string; suffix?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold tracking-tight">{value}</span>
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}

function StatLine({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="text-muted-foreground">
      {label} <b className="text-foreground">{value}</b>
    </span>
  );
}

function WinLossBar({
  wins,
  losses,
  draws,
}: {
  wins: number;
  losses: number;
  draws: number;
}) {
  const total = wins + losses + draws;
  if (total === 0) return null;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="bg-emerald-500" style={{ width: pct(wins) }} />
      <div className="bg-muted-foreground/40" style={{ width: pct(draws) }} />
      <div className="bg-red-500" style={{ width: pct(losses) }} />
    </div>
  );
}

function RecentForm({ results }: { results: GameResultView[] }) {
  // 取得は新しい順なので、古い→新しい（左→右）に並べ替える
  const ordered = [...results].reverse();
  const style: Record<string, string> = {
    win: "bg-emerald-500 text-white",
    loss: "bg-red-500 text-white",
    draw: "bg-muted-foreground/40 text-foreground",
  };
  const mark: Record<string, string> = { win: "○", loss: "●", draw: "△" };
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {ordered.map((r, i) => (
        <span
          key={i}
          title={`vs ${r.opponentName} ${r.ourScore}-${r.oppScore}`}
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${style[r.outcome]}`}
        >
          {mark[r.outcome]}
        </span>
      ))}
    </div>
  );
}
