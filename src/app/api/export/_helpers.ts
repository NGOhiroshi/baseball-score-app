import JSZip from "jszip";

/** ファイル名に使う YYYYMMDD 形式の今日日付（ローカルタイム） */
export function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

/** UTF-8 BOM。Excel で開いた際の文字化け防止に CSV 先頭へ付ける。 */
const BOM = "﻿";

export function csvResponse(filename: string, csv: string): Response {
  return new Response(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function zipResponse(
  filename: string,
  files: Record<string, string>,
): Promise<Response> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, BOM + content);
  }
  const buf = await zip.generateAsync({ type: "uint8array" });
  return new Response(new Blob([buf as BlobPart]), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
