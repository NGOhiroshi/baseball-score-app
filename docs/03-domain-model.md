# ドメインモデル設計（集約・エンティティ・値オブジェクト）

> **このドキュメントの目的**
> 各境界づけられたコンテキスト内のモデル構造を定義する。クラス図や型定義の元になる「ドメインの形」を確定させる。
>
> **DDD的位置づけ**
> ここで決める3つの概念がDDD戦術設計の中核：
> - **値オブジェクト（Value Object）**: ID を持たず、属性値だけが意味を持つ不変オブジェクト（例: スコア 5対3）
> - **エンティティ（Entity）**: ID を持ち、ライフサイクルを通じて同一性が保たれるオブジェクト（例: メンバー）
> - **集約（Aggregate）**: 一貫性を保つべきエンティティ・値オブジェクトのまとまり。**集約の外からは「集約ルート」経由でしか触れない**

---

## 1. 集約一覧（俯瞰）

| コンテキスト | 集約ルート | 含まれる主な要素 | 集約境界の理由 |
|---|---|---|---|
| チーム管理 | `Team` | `Member[]`, `GuestPlayer[]` | チームと所属メンバーは1つの単位で扱う |
| 試合記録 | `Game` | `BattingOrderEntry[]`, `PlateAppearance[]`, `PitchingAppearance[]` | 試合中の全データは試合単位で整合性が必要 |
| 成績集計 | （集約ではなく読み取りモデル） | `PlayerBattingStats`, `PlayerPitchingStats` | 集計は読み取り専用なので集約として扱わない |

> 💡 **DDD学習ポイント — 集約の判断基準**:
> - **トランザクション境界**になるか？（1回のDB保存で整合性を保つ範囲）
> - **不変条件**を一緒に守る必要があるか？（例: 打順は1〜9番が重複なく揃う）
> - **小さく保つ**のが原則。迷ったら分ける。

---

## 2. 【チーム管理コンテキスト】

### 2.1 集約: Team

```
Team（集約ルート / エンティティ）
├─ id: TeamId（値オブジェクト）
├─ name: string
├─ members: Member[]（エンティティ）
└─ guestPlayers: GuestPlayer[]（エンティティ）
```

**不変条件（集約が守るルール）**:
- チーム内でメンバーの名前が重複してもよい（同姓同名OK、IDで区別）
- 助っ人は試合ごとに登録される一時的存在（チームの永続メンバーではない）

### 2.2 エンティティ: Member

```
Member
├─ id: MemberId（値オブジェクト）
├─ name: string
├─ photoUrl: string | null
├─ role: MemberRole（'admin' | 'regular'）
└─ joinedAt: Date
```

### 2.3 エンティティ: GuestPlayer

```
GuestPlayer
├─ id: GuestPlayerId（値オブジェクト）
├─ name: string
└─ registeredForGameId: GameId | null（どの試合で登録されたか）
```

### 2.4 値オブジェクト

| 名前 | 内容 | 不変条件 |
|---|---|---|
| `TeamId` | UUID | 生成後変更不可 |
| `MemberId` | UUID | 生成後変更不可 |
| `GuestPlayerId` | UUID | 生成後変更不可 |
| `MemberRole` | `'admin' \| 'regular'` | この2値のみ |

---

## 3. 【試合記録コンテキスト】★ ドメインの中核

### 3.1 集約: Game

```
Game（集約ルート / エンティティ）
├─ id: GameId（値オブジェクト）
├─ gameDate: Date
├─ opponentName: string
├─ inningScores: InningScore[]（値オブジェクト集合 ★ イニングごとのスコア）
├─ battingOrder: BattingOrderEntry[]（エンティティ集合 / 1〜9 + 任意の追加）
├─ plateAppearances: PlateAppearance[]（エンティティ集合）
└─ pitchingAppearances: PitchingAppearance[]（エンティティ集合）
```

**不変条件（集約ルールの本丸）**:
- 打順は最低1人以上いる
- 打順の順番（1番、2番…）が連番で重複しない
- 打席結果は必ず「打順に登録された選手のいずれか」に紐づく
- 投手交代の時系列は前後関係が逆転しない（後の登板の開始イニング ≥ 前の登板の終了イニング）
- イニングスコアは `inningNumber` が重複しない
- 最終スコアは `inningScores` から導出（独立した状態として持たない）

```typescript
// Game のメソッドとして提供
finalScore(): Score {
  return new Score(
    sum(inningScores.map(s => s.ourScore)),
    sum(inningScores.map(s => s.opponentScore))
  );
}
```

> 🎯 **DDD学習ポイント — なぜ Game を集約にしたか**:
> 「打席結果だけを別集約にしてはダメか？」と疑問が湧くはず。答えは「打席結果は試合の文脈なしには意味を持たない（どの試合の何打席目か）」「打順との整合性チェックが試合単位で必要」だから。**試合がトランザクション境界**として自然。

### 3.2 エンティティ: BattingOrderEntry

```
BattingOrderEntry
├─ orderNumber: number（1〜9、または1〜n）
├─ playerId: PlayerId（メンバーID or 助っ人ID）
└─ position: FielderPosition | null（任意）
```

### 3.3 エンティティ: PlateAppearance（★ 草野球ドメインの中核）

```
PlateAppearance
├─ id: PlateAppearanceId
├─ gameId: GameId
├─ playerId: PlayerId
├─ inning: number（何回目の打席か特定用）
├─ result: BatResult（値オブジェクト — 後述）
├─ runsBattedIn: number（打点、手動入力）
└─ runScored: boolean（自分が得点したか、手動入力）
```

### 3.4 エンティティ: PitchingAppearance

```
PitchingAppearance（エンティティ）
├─ id: PitchingAppearanceId
├─ gameId: GameId
├─ pitcherId: PlayerId
├─ enteredAtInning: number（登板開始イニング）
└─ inningRecords: InningPitched[]（★ 子エンティティ）
```

合計値（投球回・奪三振・防御率など）は `inningRecords` から**導出**する。直接持たない。

### 3.4.1 子エンティティ: InningPitched（★ イニング単位の記録）

```
InningPitched（エンティティ — PitchingAppearance の子）
├─ inningNumber: number（何回目か）
├─ outsRecorded: 0 | 1 | 2 | 3（このイニングで取ったアウト数）
├─ runsAllowed: number（このイニングの失点）
├─ earnedRuns: number（このイニングの自責点）
├─ hitsAllowed: number（このイニングの被安打）
├─ strikeouts: number（このイニングの奪三振）
└─ walksAllowed: number（このイニングの与四死球）
```

**不変条件**:
- `outsRecorded` は 0〜3 のみ（3はそのイニングを完投、0〜2は途中降板）
- `earnedRuns ≤ runsAllowed`（自責点は失点を超えない）

> 🎯 **DDD学習ポイント — なぜ子エンティティに分けたか**:
> 長尾さんとの合意で「**投手成績はイニング終了時にまとめて入力**」する UX が決まった。これはユーザーがドメインを「イニング単位」で捉えているということ。
> ドメインモデルはユーザーの認識に揃えるのが原則（**ユビキタス言語の徹底**）。
> もし `PitchingAppearance` が合計値だけを持つと、UI側で「何回に何点取られたか」を別途持つ必要が生じ、ドメインルールがUI側にこぼれる。子エンティティとして表現することで、**1イニング分の整合性チェック**（例: 自責点 ≤ 失点）もモデル側で守れる。

### 3.4.2 派生値（InningPitched[] から計算）

```typescript
// PitchingAppearance のメソッドとして提供
inningsPitched(): InningsPitched {
  const totalOuts = sum(inningRecords.map(r => r.outsRecorded));
  return new InningsPitched(
    Math.floor(totalOuts / 3),     // 完投イニング数
    (totalOuts % 3) as 0 | 1 | 2   // 不完全イニングのアウト数
  );
}

totalEarnedRuns(): number { return sum(inningRecords.map(r => r.earnedRuns)); }
totalHitsAllowed(): number { return sum(inningRecords.map(r => r.hitsAllowed)); }
totalStrikeouts(): number { return sum(inningRecords.map(r => r.strikeouts)); }
// ...
```

### 3.5 値オブジェクト（★ ここが最も重要）

#### Score（最終スコア — 集計結果）

```typescript
class Score {
  constructor(
    readonly ourScore: number,  // 自チーム得点（合計）
    readonly opponentScore: number  // 相手得点（合計）
  ) {
    if (ourScore < 0 || opponentScore < 0) throw new Error('得点は負にならない');
  }

  isWin(): boolean { return this.ourScore > this.opponentScore; }
  isLose(): boolean { return this.ourScore < this.opponentScore; }
  isDraw(): boolean { return this.ourScore === this.opponentScore; }
}
```

> 💡 `Score` は `InningScore[]` の合計から `Game.finalScore()` メソッドで生成される。DBには保存しない（導出値）。

#### InningScore（イニングごとのスコア — 状態として保存）

```typescript
class InningScore {
  constructor(
    readonly inningNumber: number,   // 何回か（1, 2, 3, ...）
    readonly ourScore: number,        // このイニングの自チーム得点
    readonly opponentScore: number    // このイニングの相手得点
  ) {
    if (inningNumber < 1) throw new Error('イニング番号は1以上');
    if (ourScore < 0 || opponentScore < 0) throw new Error('得点は負にならない');
  }
}
```

> 🎯 **DDD学習ポイント — 「最終スコア」を独立フィールドとして持たない理由**:
> もし `Game` が `finalScore` と `inningScores` を**両方持つ**と、両者が一致しない状態が作れてしまう（例: 1回 1-0, 2回 0-1 なのに finalScore が 5-3）。**状態の二重保持はバグの温床**。
> イニングスコアを唯一の真実（Single Source of Truth）にし、最終スコアは常に**計算して返す**ことで、不整合を構造的に排除できる。これがDDDでよく言う「**集約の不変条件をモデルで守る**」の実例。

#### BatResult（打席結果）★ 草野球ルールの結晶

打席結果は「上位カテゴリ」+「下位カテゴリ」+「失策フラグ」+「補助情報」で構成される。
**TypeScript の判別共用体（Discriminated Union）で表現するのが綺麗**：

```typescript
type BatResult =
  | HitResult         // 安打（失策フラグを内包できる）
  | WalkResult        // 出塁（四球・死球）
  | OutResult         // 凡退（三振・ゴロ・フライ）
  | SacrificeResult   // 犠打・犠飛（打数に含めない）
  | ErrorOnlyResult;  // 失策のみ（安打ではないが守備のミスで出塁）

type HitResult = {
  category: 'hit';
  hitType: 'single' | 'double' | 'triple' | 'homerun';
  direction: BattingDirection | null;
  hadError: boolean;  // ★ 「安打+失策」を表現するフラグ
};

type WalkResult = {
  category: 'walk';
  walkType: 'baseOnBalls' | 'hitByPitch';
};

type OutResult = {
  category: 'out';
  outType: 'strikeout' | 'groundOut' | 'flyOut';
  fielderPosition: FielderPosition | null;
};

type SacrificeResult = {
  category: 'sacrifice';
  sacrificeType: 'bunt' | 'fly';   // 犠打 or 犠飛
  fielderPosition: FielderPosition | null;
};

type ErrorOnlyResult = {
  category: 'errorOnly';
  fielderPosition: FielderPosition | null;
};
```

**この値オブジェクトが守るドメインルール**:
1. `category` は必ず5種類のうち1つ → **排他性が型レベルで保証される**
2. `hit + hadError=true` で「ワンヒット・ワンエラー」を表現
3. 「打数」「安打数」の計算ロジックはこの型のメソッドで提供：

```typescript
// 値オブジェクトに振る舞いを持たせる（ドメインロジックの居場所）
function countsAsAtBat(result: BatResult): boolean {
  // 打数: 四死球・犠打・犠飛は除外、その他は含める
  return result.category !== 'walk' && result.category !== 'sacrifice';
}

function countsAsHit(result: BatResult): boolean {
  // 安打数: hadError=true でもヒットとして数える（草野球ルール）
  return result.category === 'hit';
}

function countsAsPlateAppearance(result: BatResult): boolean {
  // 打席数: 全カテゴリ含める（打数とは異なる）
  return true;
}
```

> 🎯 **DDD学習ポイント — なぜ値オブジェクトに「打数か？」を聞くのか**:
> このロジックを「成績集計コンテキスト側」に持たせると、ドメインルールが分散してしまう。**「打席結果」自体に「自分が打数か」を答えさせる**ことで、ルールの所在が一箇所に集まる（**情報エキスパート原則**）。

#### InningsPitched（投球回）

```typescript
class InningsPitched {
  constructor(
    readonly fullInnings: number,  // 完全に投げた回数
    readonly outsInPartialInning: 0 | 1 | 2  // 不完全イニングのアウト数
  ) {}

  toDecimal(): number {
    // 5.2回（5回と2アウト）→ 5 + 2/3 = 5.667
    return this.fullInnings + this.outsInPartialInning / 3;
  }

  toDisplay(): string {
    // 表示用: "5.2"
    return `${this.fullInnings}.${this.outsInPartialInning}`;
  }
}
```

> 🎯 **DDD学習ポイント — 値オブジェクトの威力**:
> 投球回を `number` で持つと「5.2 を 5.2 のまま計算してしまう」バグが起きる（実際は 5 + 2/3）。型として閉じ込めることで、誤用を防ぐ。

#### その他の値オブジェクト

| 名前 | 型 | 不変条件 |
|---|---|---|
| `GameId` | UUID | 生成後変更不可 |
| `PlateAppearanceId` | UUID | 同上 |
| `PitchingAppearanceId` | UUID | 同上 |
| `PlayerId` | `MemberId \| GuestPlayerId` の合成型 | どちらかの選手IDを指す |
| `BattingDirection` | 列挙型（左前/中前/右前/左中間/右中間/左越/中越/右越） | この値のみ許容 |
| `FielderPosition` | 1〜9 の数値 | 範囲外不可 |

---

## 4. 【成績集計コンテキスト】

### 4.1 読み取りモデル（集約ではない）

成績集計は**読み取り専用**なので、DDDの「集約」ではなく**Read Model**（読み取りモデル）として扱う。

```typescript
type PlayerBattingStats = {
  playerId: PlayerId;
  playerName: string;            // 表示用に同梱
  year: number | 'career';       // 年度別 or 通算
  plateAppearances: number;      // 打席数
  atBats: number;                // 打数
  hits: number;                  // 安打数
  homeRuns: number;
  battingAverage: number;        // 計算済み（小数3桁）
  runsBattedIn: number;          // 打点
  runsScored: number;            // 得点
};

type PlayerPitchingStats = {
  playerId: PlayerId;
  playerName: string;
  year: number | 'career';
  inningsPitched: InningsPitched;
  earnedRunAverage: number;      // 防御率
  strikeouts: number;
  walksAllowed: number;
  hitsAllowed: number;           // 被安打
  runsAllowed: number;
  earnedRuns: number;
};
```

### 4.2 集計ロジックの居場所

- **打席結果の解釈（打数か、安打か）** → `BatResult` 値オブジェクト側のメソッド
- **集計の合算ロジック（複数試合の合計、率の計算）** → `Statistics` コンテキストのドメインサービス（`BattingStatsCalculator`）
- **DBからのデータ取得** → `Statistics` コンテキストのリポジトリ層

> 💡 ここは Phase 1-C 以降の実装段階で改めて詳細化する。今は「集計は別レイヤーに分離する」という方針確定が重要。

---

## 5. ドメインルール総まとめ（実装時のチェックリスト）

| # | ルール | 守る場所 |
|---|---|---|
| 1 | 打席結果は安打/出塁/凡退/犠打犠飛/失策のみ から1つ | `BatResult` 型の判別共用体 |
| 2 | 「安打+失策」は同時記録可、成績は安打扱い | `BatResult.hadError` + `countsAsHit` ロジック |
| 3 | 四球・死球・犠打・犠飛は打数に含めない | `countsAsAtBat` ロジック |
| 4 | 打順の連番が重複しない | `Game` 集約の不変条件チェック |
| 5 | 投手の登板区間が時系列で矛盾しない | `Game` 集約の不変条件チェック |
| 6 | 投球回は X.Y形式（Yは0/1/2）、`InningPitched[]` から導出 | `InningsPitched` 値オブジェクト |
| 7 | 自責点 ≤ 失点（イニング単位） | `InningPitched` エンティティの不変条件 |
| 8 | 投手成績はイニング単位で入力・記録 | `PitchingAppearance` の子に `InningPitched[]` |
| 9 | 得点・打点は手動入力（自動計算しない） | `PlateAppearance` のフィールドとして保持 |
| 10 | 犠飛では打点が付くことがある（手動入力） | `PlateAppearance.runsBattedIn` |
| 11 | ポジションは任意 | `BattingOrderEntry.position` を nullable に |
| 12 | 最終スコアはイニングスコアの合計から導出 | `Game.finalScore()` メソッド、状態として保持しない |
| 13 | イニングスコアの `inningNumber` は試合内で重複しない | `Game` 集約の不変条件チェック |
| 14 | 被安打もイニング単位で記録する | `InningPitched.hitsAllowed` |

---

## 6. クラス図（テキスト版）

```
[ チーム管理コンテキスト ]
                            ┌──────────┐
                            │   Team   │ (Aggregate Root)
                            ├──────────┤
                            │  id      │
                            │  name    │
                            └────┬─────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                                     │
        ┌─────▼──────┐                      ┌───────▼──────┐
        │   Member   │                      │ GuestPlayer  │
        └────────────┘                      └──────────────┘


[ 試合記録コンテキスト ]
                            ┌────────────────┐
                            │     Game       │ (Aggregate Root)
                            ├────────────────┤
                            │  id            │
                            │  date          │
                            │  opponent      │
                            │  inningScores[]│ ←─ InningScore (VO)
                            └────┬───────────┘
                                 │ (finalScore() は導出)
                                 │
       ┌─────────────────────────┼─────────────────────────┐
       │                         │                         │
┌──────▼────────────┐  ┌─────────▼────────┐    ┌───────────▼─────────┐
│BattingOrderEntry  │  │ PlateAppearance  │    │ PitchingAppearance  │
├───────────────────┤  ├──────────────────┤    ├─────────────────────┤
│ orderNumber       │  │ playerId         │    │ pitcherId           │
│ playerId          │  │ result: BatResult│←VO │ enteredAtInning     │
│ position          │  │ runsBattedIn     │    │ inningRecords[]     │
└───────────────────┘  │ runScored        │    └─────────┬───────────┘
                       └──────────────────┘              │
                                                ┌────────▼─────────┐
                                                │  InningPitched   │
                                                ├──────────────────┤
                                                │ inningNumber     │
                                                │ outsRecorded     │
                                                │ runsAllowed      │
                                                │ earnedRuns       │
                                                │ hitsAllowed      │
                                                │ strikeouts       │
                                                │ walksAllowed     │
                                                └──────────────────┘


[ 成績集計コンテキスト ] — Read Model（集約ではない）
        ┌──────────────────────┐    ┌──────────────────────┐
        │ PlayerBattingStats   │    │ PlayerPitchingStats  │
        └──────────────────────┘    └──────────────────────┘
```

---

## 7. ER図への落とし込み（次フェーズへのブリッジ）

このドメインモデルを次フェーズ（Phase 1-B: 要件定義 v2 & ER図）でリレーショナル DB のテーブル構造に変換する。**ドメインモデルとテーブル構造は1:1ではない**ことに注意：

| ドメイン概念 | おそらくのテーブル設計 |
|---|---|
| Team 集約 | `teams` + `members` + `guest_players` の3テーブル |
| Game 集約 | `games` + `inning_scores` + `batting_order_entries` + `plate_appearances` + `pitching_appearances` + `inning_pitched_records` の6テーブル |
| BatResult 値オブジェクト | `plate_appearances` テーブルのカラム群（カテゴリ・サブカテゴリ・打球方向 など） |
| InningScore 値オブジェクト | `inning_scores` テーブル（game_id, inning_number, our_score, opponent_score） |
| 最終スコア | テーブルに持たない（`inning_scores` の SUM クエリで導出） |
| Read Model | テーブルを直接作らず、SQL の VIEW または都度集計クエリで実装 |

→ 詳細は Phase 1-B で設計する。
