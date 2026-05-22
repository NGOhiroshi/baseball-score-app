import type { BattingStats } from "./batting-stats";
import type { PitchingStats } from "./pitching-stats";

export type SprayCounts = {
  left: number;
  center: number;
  right: number;
  infield: number;
};

export type EpithetInput = {
  playerId: string;
  batting?: BattingStats;
  pitching?: PitchingStats;
  spray: SprayCounts;
  /** 打者としての三振数（打球分布ビュー由来） */
  battingStrikeouts: number;
};

// 目立った特徴が無い選手にも前向きな“一言”を返すための汎用パターン。
// playerId のハッシュで安定的に選ぶ（毎回変わらない）。
const GENERIC = [
  "ムードメーカー",
  "縁の下の力持ち",
  "チームの太陽",
  "これからの主役",
  "代打の切り札",
  "ベンチを沸かす男",
  "練習の鬼",
  "次の一打に期待",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * 選手の成績から“異名（一言）”を導く。草野球向けに、成績が地味な選手でも
 * 前向きに盛り上がるラベルを返す（情報エキスパート: 成績→キャラ付けの判断を集約）。
 */
export function playerEpithet(input: EpithetInput): string {
  const { batting, pitching, spray, battingStrikeouts, playerId } = input;

  // --- 投手としての特徴（ある程度投げている場合） ---
  if (pitching) {
    const outs = pitching.fullInnings * 3 + pitching.partialOuts;
    if (outs >= 6) {
      if (
        pitching.earnedRunAverage !== null &&
        pitching.earnedRunAverage <= 2
      ) {
        return "鉄壁のエース";
      }
      if (pitching.strikeouts >= 5) return "ドクターK";
      if (outs >= 15) return "イニングイーター";
      return "マウンドの番人";
    }
  }

  // --- 打者としての特徴 ---
  if (batting) {
    const ab = batting.atBats;
    const avg = batting.battingAverage ?? 0;

    if (batting.homeRuns >= 2) return "チームの大砲";
    if (batting.homeRuns >= 1) return "一発のロマン";
    if (ab >= 3 && avg >= 0.4) return "安打製造機";
    if (batting.runsBattedIn >= 5) return "ミスター勝負強い";
    if (batting.runsBattedIn >= 3) return "チャンスメーカー";
    if (ab >= 4 && battingStrikeouts === 0) return "三振しない男";
    if (ab >= 6 && battingStrikeouts / ab <= 0.15) return "コンタクトヒッター";
    if (batting.runsScored >= 5) return "韋駄天";

    const inPlay = spray.left + spray.center + spray.right + spray.infield;
    if (inPlay >= 4) {
      const max = Math.max(spray.left, spray.center, spray.right, spray.infield);
      if (max === spray.center) return "センター返しの達人";
      if (max === spray.left) return "引っ張りの職人";
      if (max === spray.right) return "流し打ち名人";
      if (max === spray.infield) return "ゴロ製造マイスター";
    }

    if (ab >= 1 && batting.hits >= 1) return "いぶし銀";
    if (ab >= 1) return "フルスイング職人";
  }

  return GENERIC[hashString(playerId) % GENERIC.length];
}
