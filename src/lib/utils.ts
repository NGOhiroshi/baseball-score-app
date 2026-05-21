import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind CSS のクラス名を結合するユーティリティ。
 * shadcn/ui の慣習に従い、条件付きクラスと重複除去を一発で行う。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
