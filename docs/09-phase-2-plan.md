# Phase 2 計画 — マルチテナント / Tenancy コンテキスト

> 本ドキュメントは **計画書**。実装はまだ行わない。スライス分割と各スライスのDDD学習ポイントまでを定義する。
> 着手判断・順序の調整は別途。

## 1. ゴール
- **superadmin が複数チームを作成・管理できる**。
- 各チームには **チーム admin が1人以上**。チーム admin は自チームのメンバー管理ができる。
- データは **チームをまたいで漏れない**（RLS で team_id スコープを強制）。
- 既存の単一チームデータ（スミスブラザーズ）は **無停止で多チーム構成に移行**できる。

## 2. Phase 1（現状）からの差分

| 観点 | Phase 1（現状） | Phase 2 |
|---|---|---|
| チーム数 | 1（`SMITH_BROTHERS_TEAM_ID` ハードコード） | 任意 |
| superadmin | 概念は導入済み（`platform_admins`） | 実機能（チーム作成・admin招待）が画面に出る |
| RLS のチーム境界 | 「ログイン中ユーザーがメンバーであるか」のみ判定 | **team_id 単位**で読み書きを制限 |
| ユーザーが属するチーム | 1（全員同じ） | N（複数所属あり得る） |
| UI 上のチーム文脈 | 暗黙（チームは1つしかない） | **明示**（チーム選択 / 切替が必要） |
| 既存コードの依存 | `SMITH_BROTHERS_TEAM_ID` を多数の場所で参照 | 撤去し、リクエストごとに解決 |

## 3. 重要な設計判断（着手前に固める）

### 3.1 ユーザーは複数チームに所属しうるか？
2案:
- **A. 単一所属（推奨）**: `members.auth_user_id` が UNIQUE。1人 = 1チーム。実装シンプル。
- B. 複数所属: `members` は引き続きチーム単位のロスター。同一 `auth.users.id` が複数 `members` 行に紐付くことを許す。UI に「現在のチーム」の切替が必要。

→ 草野球の人数規模では A で実用十分。B にすると Slice F（切替UI）が必須化する。

### 3.2 チーム admin の任命タイミング
- superadmin がチーム作成と同時に「最初の admin」をメール招待する形が自然
- 招待 = Phase 1 Slice B と同じ仕組み（admin が `auth.admin.createUser` + memberに紐付け）を superadmin が代行

### 3.3 既存データの扱い
- スミスブラザーズの `team_id = '00000000-0000-0000-0000-000000000001'` は維持
- 既存 `members`/`games`/etc は全て当該 team_id に属する状態のままで Phase 2 移行可能（破壊的変更なし）

### 3.4 RLS のチーム境界
- 現在の `is_team_member()` は「メンバー行が存在するか」のみ判定。Phase 2 では `is_team_member(team_id)` のように**対象テーブルの team_id を引数**にして、自分が所属するチームと一致するかで判定
- 子テーブル（plate_appearances 等）は `team_id` を直接持たないので、親 `games.team_id` を経由する関数を作る

### 3.5 Tenancy コンテキストの DDD 上の位置
- 既存の `team-management` は「チーム内のメンバー管理」。
- 新規の `tenancy` は「**チームそのものの作成・所属・admin任命**」。
- 「チーム」というモデルは両コンテキストに登場するが、扱う関心ごとが違うので**別集約**にする（同じ単語、別意味＝ユビキタス言語の好例）。

```
tenancy（プラットフォーム / superadmin の世界）
  └─ Team（集約ルート）
       ├─ id, name, createdAt
       ├─ qualifiedPaPerGame, qualifiedInningsPerGame  ← 設定もここに移管
       └─ initialAdminEmail  ← 作成時にスナップショット

team-management（チーム内オペレーションの世界）
  └─ Member（集約ルート）  ← 変更なし。teamId 参照のみ
```

## 4. スライス分割（推奨順）

### Slice A. RLS の team_id スコープ化（土台）
**目的**: 後段で複数チーム並列に走らせるための前提整備。

**作業**:
1. ヘルパ関数の再定義: `is_team_member(target_team_id uuid)` / `is_team_admin(target_team_id uuid)`。SECURITY DEFINER で、`members` を参照して「auth.uid()がそのチームの admin/member であるか」を返す。
2. 既存ポリシーを置換: `teams_*`, `members_*`, 試合データ7テーブル + `guest_players` を **team_id 引数つき**版に書き換え。
3. 子テーブル（plate_appearances, batting_order_entries, pitching_appearances, inning_pitched_records, inning_scores）は `games.team_id` を経由するヘルパ `is_team_member_via_game(game_id)` を用意して使う。
4. ロールバック手順をドキュメント化（前回の手順を再利用）。

**DDD学習ポイント**:
- RLS = データベース層の「ポリシー as コード」。アプリケーションコードから境界条件が漏れない位置に置ける利点を再認識。
- 「ヘルパ関数 = ドメインルールの SQL 化」。`is_team_admin()` は team-management ドメインの不変条件の射影。

**完了条件**: 単一チーム運用が今まで通り動くこと（互換性確認）。

---

### Slice B. Tenancy コンテキスト & Team aggregate
**目的**: superadmin が触る「Team」を DDD で表現する。

**作業**:
1. `src/contexts/tenancy/` を新設。`domain/team.ts`, `domain/team.repository.ts`, `application/create-team.usecase.ts`。
2. `teams` テーブルにある係数（`qualified_pa_per_game` 等）は Team 集約のフィールドに昇格（既存の `team-settings` を移行）。
3. team-management の `TeamId` は共有値オブジェクトとして残し、両コンテキストから参照可能に。

**DDD学習ポイント**:
- **同じ単語、別コンテキスト**: `team-management` の「Team」は暗黙的存在（メンバーの所属先）、`tenancy` の「Team」は明示的な集約ルート（作成・設定・廃止のライフサイクルを持つ）。
- **コンテキストマップ**: tenancy → team-management → game-recording への参照の流れを明確にする。

**完了条件**: Team 集約のドメインテストが通る。実画面はまだ無い。

---

### Slice C. superadmin によるチーム作成（管理API + UI）
**目的**: superadmin が画面からチームを作れるようにする。

**作業**:
1. `requireSuperAdmin()` ヘルパ追加（`platform_admins` に auth.uid が居るかで判定）。
2. Server Action `createTeamAction({ name, initialAdminEmail })` を実装:
   - service_role で `teams` に INSERT
   - 初期 admin の auth ユーザーを `admin.createUser`（仮パス発行）
   - members に「最初の admin」行を作成・紐付け
   - 仮パスを返す
3. `/superadmin` 画面（superadmin のみ表示）にチーム一覧 + 作成フォーム
4. ホームのタイルに条件付きで「super 管理」を出す

**DDD学習ポイント**:
- 認可のレイヤード化: 「アプリ層の `requireSuperAdmin`」と「DB層の RLS（is_super_admin）」が二重に守る理由。
- Server Action のトランザクション境界（team 作成と admin 招待は「失敗時にロールバックすべき1単位」）。

**完了条件**: superadmin がブラウザから新チーム＋初期admin発行ができる。チームのデータは team_id RLS で他チームから見えない。

---

### Slice D. ハードコード `SMITH_BROTHERS_TEAM_ID` の撤去
**目的**: 単一チーム前提のコードを「リクエスト中のチーム文脈」へ書き換える。

**作業**:
1. **チーム文脈の取得**を1か所に集約。例: `getCurrentTeamId(): Promise<TeamId>` → ログイン中ユーザーの `members.team_id` を返す（Slice 3.1 の単一所属前提）。
2. 全ファイルで `SMITH_BROTHERS_TEAM_ID` を `getCurrentTeamId()` の戻り値に置換:
   - `src/app/games/page.tsx`, `games/[gameId]/page.tsx`, `members/page.tsx`, `stats/page.tsx`, `settings/page.tsx`, `export-import/actions.ts`, `members/actions.ts`, `inning-scores/*`, `pitching/*`, etc.
3. シードは初期 superadmin の判別だけ残す（チーム本体は superadmin が作成）。
4. `SMITH_BROTHERS_TEAM_ID` 定数は削除。

**DDD学習ポイント**:
- **暗黙の依存（ハードコード）→ 明示的な依存（リクエスト文脈）への昇格**。後で複数チーム対応する時の典型的なリファクタ。
- 「テナント文脈」をリクエストごとに解決するパターン。Web フレームワーク全般に通じる。

**完了条件**: テストが通る・ビルドが通る・既存スミスブラザーズデータがそのまま見える（team_id が継続している）。

---

### Slice E. 複数チーム所属時のチーム切替（必要に応じて）
3.1 で **複数所属を採用しない**なら本スライスは不要。採用する場合のみ:
- members に同じ auth_user_id で複数行を許容（UNIQUE 解除）
- header にチーム切替ドロップダウン
- 「現在のチーム」を cookie/JWT クレームで保持
- `getCurrentTeamId()` は選択中のチームを返す

**先送り推奨**。最初は単一所属で実用十分。

---

### Slice F. 既存単一チームデータの移行手順
データ移行というより、**継続使用の確認**が中心。

**作業**:
1. Slice A〜D の本番反映前に **全データをバックアップ**（`/export-import`）。
2. マイグレーション順序を SQL Editor で1本ずつ実行。ロールバック手順を再度確認。
3. 反映後、既存チームの初期 admin が引き続き admin として動くこと、データが見えることを確認。
4. superadmin として `/superadmin` で2つ目のテストチームを作り、データの分離を確認（試合がクロスリーク**していない**こと）。

**完了条件**: 既存運用に支障なし。Phase 2 リリース完了の合図。

---

## 5. リスクと注意点

- **RLS書き換えはロックアウトの危険**。ロールバック SQL を必ず手元に置く。
- **`SMITH_BROTHERS_TEAM_ID` 撤去は影響範囲が広い**。Slice D は小さなコミットを積み重ねて行う。
- **service_role の取り扱い**: チーム作成・招待は引き続き service_role 経由。漏らさない。
- **既存メンバーは1チーム所属のまま**: Slice E を採用しない方針なら、複数チームに参加したい人物のために新たな auth ユーザー（別メール）が必要になる旨を運用ガイドに追記。

## 6. 完了条件（Phase 2 全体）

- [ ] superadmin が `/superadmin` でチーム作成 + 初期 admin 招待ができる
- [ ] チーム admin が自チームのメンバー管理・試合記録・成績閲覧ができる
- [ ] あるチームの member は他チームのデータを **一切** 見られない
- [ ] スミスブラザーズの既存運用が破綻していない
- [ ] `SMITH_BROTHERS_TEAM_ID` 定数がコードベースに残っていない

## 7. Phase 2 の先（Phase 3 候補・参考）
- 過去データインポート（既存ZIP/CSVを別チームに割り当て）
- カスタムSMTP（Resend）導入で本気の招待運用
- メンバー写真の Supabase Storage 統合
- 試合の途中状態の同時編集（リアルタイム）
