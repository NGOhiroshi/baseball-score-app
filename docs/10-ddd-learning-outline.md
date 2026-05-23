# DDD 学習コンテンツ アウトライン

> 数日間のデータ反映と並行して、このリポジトリを題材にした DDD 学習コンテンツを作る際の **設計用アウトライン**。
> ここではコンテンツ本文は書かず、**章立て・各章で見るファイル・伝えたい論点**だけを固める。本文は別途。

## 0. 想定読者
- TypeScript/Web 開発の基礎はある
- 「DDD という言葉は聞いたことがある」程度のレベル
- 設計の良し悪しを言語化したい開発者

## 1. このコンテンツの主張（一言）
**「ドメインを言語化し、レイヤーで分離し、不変条件を集約に閉じ込めると、変更コストが下がる」**。
草野球スコア管理アプリという、機能要件が明確で複雑度ほどよいドメインで実例化する。

## 2. 全体構成（章立て案）

### 第1章: なぜ DDD か（オープニング）
- 草野球スコアの「手集計の煩雑さ」というリアルな課題
- ありがちな最初の設計（テーブル直結のCRUD）が抱える破綻
- 「ユビキタス言語」「集約」「コンテキスト境界」が解決する具体問題
- 参考: [docs/01-ubiquitous-language.md](01-ubiquitous-language.md)

### 第2章: ユビキタス言語 — 「打席」と「打数」は別物
- ドメイン用語の整理（打席・打数・安打・本塁打・自責点 …）
- なぜ「打数」と「打席」を区別するか（**情報エキスパート原則**: `countsAsAtBat()` がドメインに居る理由）
- 用語のブレが招くバグの実例
- 参考: [docs/01](01-ubiquitous-language.md), `src/contexts/game-recording/domain/bat-result.ts`

### 第3章: 境界づけられたコンテキスト — 「チーム」が2つある
- team-management / game-recording / statistics の役割分担
- 同じ「Player」「Team」でもコンテキストで意味が違う
- Phase2 で `tenancy` が増えて「Team」がさらに別物として登場する伏線
- 参考: [docs/02](02-bounded-contexts.md), [docs/09-phase-2-plan.md](09-phase-2-plan.md) §3.5

### 第4章: 集約とトランザクション境界 — Game がなぜ大きいか
- 1試合の整合性（打順 ↔ 打席結果 ↔ 投手記録）を Game が守る
- 「打席結果だけ別集約にしないのか？」への答え
- Game の DELETE+INSERT 戦略の意味（一括差し替えセマンティクス）
- 参考: [docs/03](03-domain-model.md) §3.1, `src/contexts/game-recording/domain/game.ts`, `infrastructure/game.supabase.repository.ts`

### 第5章: 値オブジェクト — `BatResult` の判別共用体
- 値オブジェクトとエンティティの違い
- 「安打/出塁/凡退/犠打犠飛/失策のみ」を **判別共用体**で表現する型安全
- 不正な組み合わせを **型レベルで作れない**設計
- 参考: `src/contexts/game-recording/domain/bat-result.ts`

### 第6章: 派生値は持たない — `Score` と `BattingStats` の規約
- `Game.finalScore()` は状態ではなく計算
- 通算成績は「合計を保存」ではなく「都度集計」（Single Source of Truth）
- 二重保持が招く不整合の実例
- 参考: `domain/score.ts`, `domain/team-stats.ts`, `statistics/domain/batting-stats.ts`

### 第7章: 不変更新 — `withRunScored` の作法
- エンティティをイミュータブルに保つ意義
- 「ID を保ったまま新しいインスタンスを返す」パターン
- `withRunScored`, `withAccount`, `withInningRecords` の共通性
- 参考: `domain/plate-appearance.ts`, `team-management/domain/member.ts`, `domain/pitching-appearance.ts`

### 第8章: リポジトリと依存性逆転
- ドメインがインフラを知らない構造（domain にインターフェース、infrastructure に実装）
- Supabase を別DBに差し替えられる、テストでインメモリに差し替えられる
- 参考: `domain/*.repository.ts`, `infrastructure/*.supabase.repository.ts`

### 第9章: ユースケース（アプリケーション層） — Server Action との関係
- 「Server Action はユースケースを呼ぶ薄いアダプタ」と捉える
- ドメインルールがアプリ層にこぼれないことの確認
- `Result<T, E>` で例外ではなく結果として失敗を返す
- 参考: `application/*.usecase.ts`, `src/shared/domain/result.ts`

### 第10章: 読み取りモデル（CQRS の片鱗） — 成績集計コンテキスト
- 集約を作らない選択
- 集計を DB の VIEW に寄せ、ドメインは「整形」だけ持つ
- `playerEpithet` のような **キャラ付けロジック**はドメイン側に閉じる
- 参考: `statistics/domain/*.ts`, `infrastructure/stats.supabase.repository.ts`, `supabase/migrations/2026052*_*_view.sql`

### 第11章: セキュリティ境界としての RLS
- 「アプリの中だけで認可していると、anon key で API を直接叩かれた瞬間に終わる」
- RLS = データベース層のポリシー as コード
- アプリ層認可（`requireAdmin`）と DB 層認可（RLS）の二重防御
- 参考: `supabase/migrations/20260523000001_enable_rls.sql`, `src/lib/auth/current-member.ts`, [docs/operations §6](08-operations.md)

### 第12章: 進化に強い構造 — 「打球方向」を導出値に変えた事例
- 当初は入力項目だった `BattingDirection` を、`FielderPosition` から導出する設計に変更
- ドメインに `battingDirectionOf()` を生やすだけで UI / 集計 / 異名 全てに波及
- 「データの正規化と派生」が表現力に直結する例
- 参考: コミット `17df5f7`（打球位置に統一）と `8f1013e`（異名導入）

### 第13章: Phase 2 への布石 — マルチテナントを後付けする設計
- Phase 1 で「単一テナント前提のコードに `team_id` をしっかり持たせておく」ことの効き
- RLS をテナント境界に昇格させる移行ステップ
- 参考: [docs/09-phase-2-plan.md](09-phase-2-plan.md)

## 3. 各章の素材

| 章 | 主な対象ファイル / コミット | 補助資料 |
|---|---|---|
| 1 | README, `docs/01` | 初期要求の PLAUD ボイスメモ要約 |
| 2 | `bat-result.ts`, `score.ts` | `docs/01` |
| 3 | `src/contexts/*/` のディレクトリ構造 | `docs/02` |
| 4 | `game.ts`, `game.supabase.repository.ts` | `docs/03` §3 |
| 5 | `bat-result.ts` の判別共用体 | `docs/03` §3.5 |
| 6 | `score.ts`, `team-stats.ts` | `docs/03` §3.5 |
| 7 | `plate-appearance.ts`, `member.ts` | コミット履歴で `with*` を grep |
| 8 | `*.repository.ts` 全般 | `docs/07` |
| 9 | `*.usecase.ts`, Server Actions | `docs/04` |
| 10 | `statistics/` 全般 + 集計 VIEW | `docs/05`（ER図）|
| 11 | RLS migration, `current-member.ts` | `docs/08` §6 |
| 12 | コミット `17df5f7`, `8f1013e` | `bat-result.test.ts` |
| 13 | `docs/09-phase-2-plan.md` | コミット履歴全般 |

## 4. 形式の候補
- **A. Zenn / Qiita 連載**（章ごとに記事）
- **B. このリポジトリの `docs/learn/` 配下に章別 md**（コードと同居）
- **C. スライド（社内勉強会用）**
- **D. 動画（コミット履歴を辿る）**

→ いずれも本アウトラインを基にできる。最初は B（リポ内）でドラフト → 整ったら A に転載が手堅い。

## 5. このアウトラインの位置づけ
- 学習コンテンツ本文は **リポジトリ著者が主体的に書く**
- AI（私）は次のような支援に回れる:
  - 章ごとの草稿レビュー
  - 図（コンテキストマップ、集約境界、シーケンス）の生成
  - 該当コードを引用するスニペットの抽出
  - 「ここはもう少し言語化したい」という箇所の言語化ドラフト

執筆中、節ごとに「この章のドラフトを見て」と渡してもらえれば、上記の観点で添削します。
