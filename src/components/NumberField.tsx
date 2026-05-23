"use client";

import { useEffect, useState } from "react";

/**
 * 数値入力フィールド（共通UI）。
 *
 * 標準の <input type="number"> は「一旦空にして打ち直す」操作で
 * Number("")=0 にスナップバックし、0 を消せず戸惑う原因になる。
 * このコンポーネントは編集中の空文字を保持し、フォーカスを外したときに
 * 最小値へ確定する。スマホ向けに数字キーパッド（inputMode）とフォーカス時の
 * 全選択も行い、任意で +/- ステッパーを付けられる。
 */
export function NumberField({
  value,
  onChange,
  min = 0,
  max,
  stepper = false,
  className = "",
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  stepper?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(String(value));

  // 親（楽観更新や別操作）で value が変わったら表示を追従させる
  useEffect(() => {
    setText(String(value));
  }, [value]);

  const clamp = (n: number) => {
    let r = Math.trunc(n);
    r = Math.max(min, r);
    if (max !== undefined) r = Math.min(max, r);
    return r;
  };

  const commit = (raw: string) => {
    if (raw === "") {
      setText(String(min));
      onChange(min);
      return;
    }
    const c = clamp(Number(raw));
    setText(String(c));
    onChange(c);
  };

  const step = (delta: number) => {
    const base = text === "" ? min : Number(text) || 0;
    const c = clamp(base + delta);
    setText(String(c));
    onChange(c);
  };

  const input = (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={ariaLabel}
      value={text}
      onChange={(e) => {
        const v = e.target.value;
        if (/^\d*$/.test(v)) {
          setText(v); // 空は編集中として保持
          if (v !== "") onChange(clamp(Number(v)));
        }
      }}
      onFocus={(e) => e.target.select()}
      onBlur={(e) => commit(e.target.value)}
      className={`rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm text-foreground ${className}`}
    />
  );

  if (!stepper) return input;

  return (
    <div className="inline-flex items-center gap-1">
      <StepBtn label="−" onClick={() => step(-1)} disabled={value <= min} />
      {input}
      <StepBtn
        label="＋"
        onClick={() => step(1)}
        disabled={max !== undefined && value >= max}
      />
    </div>
  );
}

function StepBtn({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background text-lg font-medium leading-none text-foreground hover:bg-accent disabled:opacity-40"
    >
      {label}
    </button>
  );
}
