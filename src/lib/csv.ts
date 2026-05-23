/**
 * CSV のエンコード / パース ユーティリティ。
 *
 * - エンコード: RFC4180 準拠（カンマ・改行・ダブルクォートを含むセルは "..." で囲み、
 *   内部の " は "" にエスケープ）。改行は CRLF（Excel 互換）。
 * - パース: ヘッダ行ありを前提に、引用符・改行を含む値を正しく扱う。
 */

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "boolean") return v ? "true" : "false";
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** レコード配列を CSV 文字列に変換（指定列順、ヘッダ付き）。 */
export function toCsv<T extends Record<string, unknown>>(
  rows: readonly T[],
  columns: readonly (keyof T & string)[],
): string {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => csvCell(row[c])).join(","));
  }
  return lines.join("\r\n");
}

/** CSV 文字列を 2 次元配列にパース（最初の行はヘッダ）。 */
export function parseCsv(text: string): string[][] {
  // 先頭の BOM を取り除く
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** ヘッダ行を使って Record の配列に変換（空行は除外）。 */
export function csvToRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((c) => c !== ""))
    .map((r) => {
      const rec: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rec[h] = r[idx] ?? "";
      });
      return rec;
    });
}
