"use client";

import { useState, useTransition } from "react";
import { recordPlateAppearanceAction } from "./actions";
import { BATTING_DIRECTION_LABELS } from "@/contexts/game-recording/domain/batting-direction";
import { FIELDER_POSITION_LABELS } from "@/contexts/game-recording/domain/fielder-position";

type Category = "hit" | "walk" | "out" | "sacrifice" | "errorOnly";

const CATEGORY_LABELS: Record<Category, string> = {
  hit: "安打",
  walk: "出塁",
  out: "凡退",
  sacrifice: "犠打/犠飛",
  errorOnly: "失策のみ",
};

export function PlateAppearanceModal({
  gameId,
  playerKey,
  playerName,
  defaultInning,
  onClose,
}: {
  gameId: string;
  playerKey: string;
  playerName: string;
  defaultInning: number;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<Category | "">("");
  const [hitType, setHitType] = useState("single");
  const [walkType, setWalkType] = useState("baseOnBalls");
  const [outType, setOutType] = useState("strikeout");
  const [sacrificeType, setSacrificeType] = useState("bunt");
  const [direction, setDirection] = useState("");
  const [fielderPosition, setFielderPosition] = useState("");
  const [hadError, setHadError] = useState(false);
  const [inning, setInning] = useState(defaultInning);
  const [runsBattedIn, setRunsBattedIn] = useState(0);
  const [runScored, setRunScored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!category) {
      setError("打席結果のカテゴリを選択してください");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await recordPlateAppearanceAction({
          gameId,
          playerKey,
          inning,
          category,
          hitType: category === "hit" ? hitType : undefined,
          walkType: category === "walk" ? walkType : undefined,
          outType: category === "out" ? outType : undefined,
          sacrificeType: category === "sacrifice" ? sacrificeType : undefined,
          direction:
            category === "hit" || category === "errorOnly"
              ? direction
              : undefined,
          fielderPosition:
            category === "out" ||
            category === "sacrifice" ||
            category === "errorOnly"
              ? fielderPosition
              : undefined,
          hadError: category === "hit" ? hadError : false,
          runsBattedIn,
          runScored,
        });
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl bg-background p-5 shadow-lg sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{playerName} の打席</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {/* イニング */}
        <div className="mt-4">
          <label className="block text-sm font-medium">イニング</label>
          <input
            type="number"
            min={1}
            value={inning}
            onChange={(e) => setInning(Number(e.target.value))}
            className="mt-1 w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </div>

        {/* 大分類 */}
        <div className="mt-4">
          <label className="block text-sm font-medium">結果</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-md border px-2 py-2 text-sm font-medium ${
                  category === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent"
                }`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* 安打 */}
        {category === "hit" && (
          <div className="mt-4 space-y-3">
            <SubButtons
              label="安打の種類"
              value={hitType}
              onChange={(v) => {
                setHitType(v);
                // 本塁打は必ず生還するので得点をデフォルトON（手動でOFFも可）
                if (v === "homerun") setRunScored(true);
              }}
              options={[
                ["single", "単打"],
                ["double", "二塁打"],
                ["triple", "三塁打"],
                ["homerun", "本塁打"],
              ]}
            />
            <DirectionButtons value={direction} onChange={setDirection} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hadError}
                onChange={(e) => setHadError(e.target.checked)}
              />
              失策あり（ワンヒット・ワンエラー）
            </label>
          </div>
        )}

        {/* 出塁 */}
        {category === "walk" && (
          <div className="mt-4">
            <SubButtons
              label="出塁の種類"
              value={walkType}
              onChange={setWalkType}
              options={[
                ["baseOnBalls", "四球"],
                ["hitByPitch", "死球"],
              ]}
            />
          </div>
        )}

        {/* 凡退 */}
        {category === "out" && (
          <div className="mt-4 space-y-3">
            <SubButtons
              label="凡退の種類"
              value={outType}
              onChange={setOutType}
              options={[
                ["strikeout", "三振"],
                ["groundOut", "ゴロ"],
                ["flyOut", "フライ"],
              ]}
            />
            <PositionSelect
              value={fielderPosition}
              onChange={setFielderPosition}
            />
          </div>
        )}

        {/* 犠打/犠飛 */}
        {category === "sacrifice" && (
          <div className="mt-4 space-y-3">
            <SubButtons
              label="種類"
              value={sacrificeType}
              onChange={setSacrificeType}
              options={[
                ["bunt", "犠打"],
                ["fly", "犠飛"],
              ]}
            />
            <PositionSelect
              value={fielderPosition}
              onChange={setFielderPosition}
            />
          </div>
        )}

        {/* 失策のみ */}
        {category === "errorOnly" && (
          <div className="mt-4 space-y-3">
            <DirectionButtons value={direction} onChange={setDirection} />
            <PositionSelect
              value={fielderPosition}
              onChange={setFielderPosition}
            />
          </div>
        )}

        {/* 打点・得点（カテゴリ選択後に表示） */}
        {category && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <div>
              <label className="block text-sm font-medium">打点</label>
              <input
                type="number"
                min={0}
                value={runsBattedIn}
                onChange={(e) => setRunsBattedIn(Number(e.target.value))}
                className="mt-1 w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={runScored}
                onChange={(e) => setRunScored(e.target.checked)}
              />
              この後ホームに帰った（得点）
            </label>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !category}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubButtons({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              value === v
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function DirectionButtons({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium">打球方向（任意）</label>
      <div className="mt-2 flex gap-2">
        {(
          Object.entries(BATTING_DIRECTION_LABELS) as [string, string][]
        ).map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(value === v ? "" : v)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              value === v
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function PositionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium">守備位置（任意）</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
      >
        <option value="">指定なし</option>
        {Object.entries(FIELDER_POSITION_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}
