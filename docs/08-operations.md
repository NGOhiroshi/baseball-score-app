# 運用ガイド（Phase 1 / 単一チーム）

> このドキュメントは「ローカルMVP完成・本番デプロイ後」の運用を想定したランブック。
> 詳細な背景は [01](01-ubiquitous-language.md) 〜 [07](07-code-structure.md) を参照。

## 0. 前提環境
- **本番**: Vercel Hobby + Supabase Free + Public GitHub リポジトリ
- **認証**: Supabase Email + パスワード（管理者発行・自己サインアップ無効）
- **データ保護**: 全テーブル RLS 有効。superadmin / team admin / team member の3層
- **コスト**: 月額 **¥0**（Vercel/Supabase 無料枠内）

## 1. 関係者と権限

| 役割 | 主体 | できること | 実装 |
|---|---|---|---|
| superadmin | プラットフォーム所有者 | 全テーブル全操作。チーム作成（Phase2） | `platform_admins` テーブル |
| team admin | チーム管理者 | メンバー追加・アカウント発行・成績規定設定・試合データ取込 | `members.role = 'admin'` |
| regular | チーム所属メンバー | 試合記録の閲覧・入力 | `members.role = 'regular'` |
| ゲスト（未ログイン） | 任意の第三者 | **何もできない**（middlewareで /login へ強制） | RLS + middleware |

## 2. シーズン〜試合〜運用ループ

```
シーズン前
  ├─ メンバー登録（一括 or 個別）
  ├─ 必要に応じて成績規定（規定打席係数）を調整
  └─ 助っ人選手の事前登録（必要なら）

試合当日
  ├─ /games/new で試合を作成
  ├─ 打順を登録
  ├─ 各打席で結果を記録（モバイル前提）
  ├─ イニングごとに投手成績をまとめ入力
  ├─ スコアボードのイニング得点入力
  └─ 試合終了確認

シーズン中（任意のタイミング）
  ├─ /stats で個人/チーム成績を確認
  ├─ /export-import で定期バックアップ
  └─ 異名（一言）でメンバーを盛り上げる

シーズン終了後
  ├─ /export-import で個人成績・チーム成績をCSV書き出し
  ├─ 共有・印刷・表彰の素材に
  └─ 次シーズンに向けてデータ整理（不要試合の削除など）
```

## 3. 主要オペレーション

### 3.1 メンバーをアカウント付きで追加する（管理者）
1. `/members` → 「+新規」で **アカウント無しのメンバー行を作成**（名前・権限・写真URL）
2. その行のチェックボックスを ON → 「アカウント発行」 →
   - メールアドレスを入れる
   - 共通仮パスワードが自動生成される
   - 「発行する」→ 緑のボックスに **メール ＋ 仮パスワード** が表示される（**1回だけ**）
3. LINE等で本人に共有
4. 本人は `/login` でログイン → `/settings` の「パスワード変更」で自分のパスワードに更新

### 3.2 仮パスワードを失念したとき
1. `/members` で対象メンバー行（「ログイン可」になっているはず）
2. 「仮パス再発行」→ 確認 → 新しい仮パスが緑ボックスに表示
3. 本人に共有

### 3.3 試合の記録
1. `/games/new` で対戦相手・日付を入力 → 試合作成
2. 試合詳細 → 「打順編集」で打順を確定
3. 試合中はモバイルで:
   - 打席タブ: 各打者の「打席」ボタン → 結果（安打/出塁/凡退/犠打犠飛/失策のみ）と打球位置を選択
   - 投手タブ: 1イニング終了ごとに「+ イニングを追加」で投球記録
   - スコアボード: イニング得点を入力。先攻後攻はワンタップ切替

### 3.4 ダミー試合を消す
- Supabase SQL Editor で:
```sql
-- 1試合だけ消す（子テーブルは ON DELETE CASCADE で連動削除）
DELETE FROM games WHERE id = 'GAME_UUID';

-- 期間まとめて消す
DELETE FROM games WHERE game_date BETWEEN '2026-04-01' AND '2026-05-31';
```

### 3.5 メンバーを退会させる
- 試合データは残したいので **行は消さない**。代わりに:
```sql
-- ログインだけ無効化（アカウントを切り離す）
UPDATE members SET email = NULL, auth_user_id = NULL WHERE id = 'MEMBER_UUID';
```
- 加えて Supabase Dashboard → Authentication → Users で当該 auth ユーザーを削除

## 4. バックアップとリストア
本番運用では `/export-import` のZIP/CSVが**唯一のバックアップ**です。

### 4.1 推奨頻度
- **月1回**: 試合データZIP・個人成績ZIP・メンバーCSVをローカル保存
- **シーズン終了時**: 4種すべてをアーカイブ
- **重要イベント前後**（マイグレーション等）: 直前にバックアップ

### 4.2 リストア手順
1. Supabase Dashboard で対象データを事前に消す（または別環境にする）
2. `/export-import` で **メンバーCSVを先に取り込む**
3. 続けて **試合データZIPを取り込む**
4. `/stats` で件数を確認

## 5. 設定（管理者）

### 5.1 規定打席・規定投球回の係数
- `/settings` → 「チーム設定」→ 係数を入力
- 既定: 規定打席 = 試合数 × 1.0、規定投球回 = 試合数 × 1.0（草野球向け）
- プロ標準なら 3.1 と 1.0

### 5.2 環境変数（Vercel）
変更時は Vercel Dashboard → Project → Settings → Environment Variables で再設定し再デプロイ。
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（**Sensitive 有効**）

## 6. セキュリティ運用

### 6.1 月次チェックリスト
- [ ] Supabase **自己サインアップが OFF** になっている（Authentication → Providers → Email）
- [ ] RLS が全テーブルで有効（下のSQL）
- [ ] service_role キーが漏れていない（リポジトリ・クライアントバンドル）
- [ ] 不審な auth.users が増えていない（Authentication → Users）

### 6.2 RLS有効状態の確認SQL
```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN (
  'teams','members','guest_players','games','batting_order_entries',
  'plate_appearances','pitching_appearances','inning_pitched_records',
  'inning_scores','platform_admins'
) ORDER BY relname;
-- すべて relrowsecurity = true であること
```

### 6.3 異常時の応急ロックダウン
- 緊急の情報漏洩疑い時は Supabase Dashboard で **anon キーをローテート**
- ローテート後、Vercel の `NEXT_PUBLIC_SUPABASE_ANON_KEY` を新しい値に更新 → 再デプロイ
- 漏洩は service_role の方が致命的。サービスロールが漏れた場合は **即座にローテート**

## 7. 無料枠の上限と監視

| サービス | 主な上限 | 監視の場所 | 草野球規模の目安 |
|---|---|---|---|
| Supabase Free | DB 500MB / Auth 50,000 MAU / 月Egress 5GB | Dashboard → Settings → Usage | 余裕 |
| Supabase 内蔵メール | **2通/時間（プロジェクト全体）** | — | 仮パス発行が連続するとヒット。LINE運用なので普段は問題なし |
| Vercel Hobby | 帯域 100GB/月 / 関数実行 100k/日 | Vercel → Usage | 余裕 |

将来カスタムSMTPが必要になったら **Resend Free**（月3,000通）の追加が無料運用での落とし所。

## 8. トラブルシューティング

### 8.1 ログインできない
- メール・パスワードのタイポ → 管理者に仮パス再発行を依頼
- 仮パス再発行後も入れない → Supabase の auth.users に当該メールが存在するか確認
- `members.auth_user_id` が空 → メンバーレコードと auth.users の紐付けが切れている。Supabase で再リンク（ログイン後に紐付け処理が走るが、再発行で復活）

### 8.2 ログインできるがデータが何も見えない
- RLS は通っているか確認: ログイン中のユーザーが `members` に行を持ち、`auth_user_id` が紐付いているか
- `members.role` が `admin` or `regular` か
- それでも見えなければ RLS ヘルパ関数（`is_team_member()` 等）が SECURITY DEFINER であることを確認

### 8.3 メール送信制限（rate limit exceeded）に当たった
- 1時間待つ（リセット）
- 仮パス共有はメール経由ではなく LINE 等を継続利用
- 恒常的に超えるならカスタムSMTP（Resend）導入

### 8.4 試合詳細でデータが消えた／壊れた
- まずは直近のバックアップZIPからリストア（4節）
- それも無ければ Supabase の Point-in-time Recovery（無料枠は7日まで遡れる場合あり、要確認）

## 9. 緊急時のロールバック

### 9.1 直前のデプロイで何かが壊れた
- Vercel Dashboard → Deployments → 1つ前を「Promote to Production」

### 9.2 RLS で全員が操作不能になった
```sql
-- 各テーブルの RLS を一時的にオフ（ログイン中のユーザーが操作可能に戻る）
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
-- 他テーブルも同様。落ち着いたら原因究明 → 再度 ENABLE
```

### 9.3 マイグレーションでスキーマが壊れた
- 失敗したマイグレーションを Supabase SQL Editor で逆方向に手動修正
- バックアップから DB を復元（pgdump/pgrestore は Supabase Pro 以上）
