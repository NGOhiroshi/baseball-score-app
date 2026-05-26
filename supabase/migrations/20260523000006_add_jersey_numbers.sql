-- =========================================================================
-- 20260523_006: members に背番号（メイン/サブ）を追加
--
-- ユニフォームが複数ある場合に備えてメイン背番号とサブ背番号の2つを持つ。
-- どちらも NULL 許容（未設定の選手もいる）。
-- 草野球では 0〜999 の範囲を許容（プロ準拠だと 0〜99 だが緩めに）。
-- =========================================================================

ALTER TABLE members
  ADD COLUMN jersey_number_main SMALLINT
    CHECK (jersey_number_main IS NULL OR (jersey_number_main >= 0 AND jersey_number_main <= 999)),
  ADD COLUMN jersey_number_sub SMALLINT
    CHECK (jersey_number_sub IS NULL OR (jersey_number_sub >= 0 AND jersey_number_sub <= 999));
