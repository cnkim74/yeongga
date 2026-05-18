// Vercel Blob → Cloudflare R2 일괄 마이그레이션 — chunked endpoint.
//
// 한 번 호출 = 한 chunk 처리.
//   1. Blob 목록을 받아 아직 옮기지 않은 파일을 R2 로 복사 (시간 budget 안에서 가능한 만큼)
//   2. 모든 Blob 복사가 끝나면 DB 의 모든 URL 컬럼을 일괄 갱신 + articles.body 안 마크다운 이미지 치환
//
// 응답에 phase ('copy' | 'patch' | 'done') 와 진행 통계가 들어 있어,
// 클라이언트가 자동으로 다음 호출을 이어 가도록 함.

import { NextResponse, type NextRequest } from "next/server";
import { list, type ListBlobResult } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { r2Configured, r2Put } from "@/lib/r2";
import type { Client } from "@libsql/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Hobby 최대치

const TIME_BUDGET_MS = 50_000; // 50초 안에 마무리하고 응답
const MAX_BLOB_LIST_PER_CALL = 1000;

// Vercel Blob URL → 버킷 안 경로 키 추출.
//   https://xxx.public.blob.vercel-storage.com/ebooks/abc.pdf  → ebooks/abc.pdf
function keyFromBlobUrl(url: string, pathname?: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith(".public.blob.vercel-storage.com")) {
      return u.pathname.replace(/^\//, "");
    }
  } catch {
    // pass
  }
  return pathname?.replace(/^\//, "") ?? url;
}

// DB URL 컬럼 목록
const URL_COLUMNS: { table: string; col: string }[] = [
  { table: "slides", col: "image_path" },
  { table: "page_backgrounds", col: "image_path" },
  { table: "ebooks", col: "pdf_url" },
  { table: "ebooks", col: "cover_url" },
  { table: "photo_categories", col: "cover_url" },
  { table: "photos", col: "image_url" },
  { table: "chapter_meta", col: "cover_image" },
  { table: "chapter_meta", col: "hero_image" },
  { table: "member_banners", col: "image_url" },
  { table: "submissions", col: "file_url" },
  { table: "users", col: "avatar_url" },
];

export async function POST(req: NextRequest) {
  await requireAdmin();

  if (!r2Configured()) {
    return NextResponse.json(
      { ok: false, error: "R2 환경 변수가 설정되지 않았습니다. 마이그레이션 전에 R2 토큰을 등록하세요." },
      { status: 500 }
    );
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "BLOB_READ_WRITE_TOKEN 이 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const startedAt = Date.now();
  const db = await getDb();

  // ─── 진행 상태 통계 ─────────────────────────────
  const totalRow = await safeListAll();
  const total = totalRow.length;
  const copiedRow = await db.execute("SELECT COUNT(*) AS n FROM migration_blob_to_r2");
  const copiedSoFar = Number((copiedRow.rows[0]?.n as number | bigint) ?? 0);

  // ─── Phase 1: 복사 ─────────────────────────────
  const copiedSet = new Set(
    (await db.execute("SELECT blob_url FROM migration_blob_to_r2")).rows.map((r) => String(r.blob_url))
  );
  const toCopy = totalRow.filter((b) => !copiedSet.has(b.url));

  const copyResults: { blob_url: string; r2_url?: string; ok: boolean; error?: string }[] = [];

  for (const blob of toCopy) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) break;
    try {
      const key = keyFromBlobUrl(blob.url, blob.pathname);
      const dlRes = await fetch(blob.downloadUrl ?? blob.url);
      if (!dlRes.ok) throw new Error(`download HTTP ${dlRes.status}`);
      const buf = Buffer.from(await dlRes.arrayBuffer());
      const contentType =
        dlRes.headers.get("content-type") ?? "application/octet-stream";
      const publicUrl = await r2Put(key, buf, contentType);
      await db.execute({
        sql: "INSERT OR REPLACE INTO migration_blob_to_r2 (blob_url, r2_url, bytes, copied_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
        args: [blob.url, publicUrl, blob.size ?? 0],
      });
      copyResults.push({ blob_url: blob.url, r2_url: publicUrl, ok: true });
    } catch (err) {
      copyResults.push({
        blob_url: blob.url,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const copiedNow = copyResults.filter((r) => r.ok).length;
  const newCopiedTotal = copiedSoFar + copiedNow;

  // 아직 복사할 게 남았으면 copy phase 계속
  const remaining = toCopy.length - copyResults.length;
  if (remaining > 0) {
    return NextResponse.json({
      ok: true,
      phase: "copy",
      total,
      copied_so_far: newCopiedTotal,
      processed_this_call: copiedNow,
      errors_this_call: copyResults.filter((r) => !r.ok),
      done: false,
    });
  }

  // 이번 호출이 마지막 copy chunk였을 수 있으나, toCopy 자체가 비어있는 경우 = 모든 복사 완료
  // 이제 patch phase 진행
  const patchSummary = await runPatchPhase(db);

  return NextResponse.json({
    ok: true,
    phase: "done",
    total,
    copied_so_far: newCopiedTotal,
    processed_this_call: copiedNow,
    errors_this_call: copyResults.filter((r) => !r.ok),
    patch_summary: patchSummary,
    done: true,
  });
}

// GET — 진행 상태만 조회 (실제 작업 없음)
export async function GET() {
  await requireAdmin();
  if (!r2Configured()) {
    return NextResponse.json({ ok: false, error: "R2 미설정" }, { status: 500 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, error: "BLOB 미설정" }, { status: 500 });
  }
  const db = await getDb();
  const blobs = await safeListAll();
  const copiedRow = await db.execute("SELECT COUNT(*) AS n FROM migration_blob_to_r2");
  const copiedSoFar = Number((copiedRow.rows[0]?.n as number | bigint) ?? 0);
  return NextResponse.json({
    ok: true,
    total: blobs.length,
    copied_so_far: copiedSoFar,
    remaining: Math.max(0, blobs.length - copiedSoFar),
  });
}

// ─── 헬퍼 ───────────────────────────────────────

async function safeListAll() {
  const all: ListBlobResult["blobs"] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ cursor, limit: MAX_BLOB_LIST_PER_CALL });
    all.push(...page.blobs);
    cursor = page.cursor;
  } while (cursor && all.length < 5000); // 안전 한도
  return all;
}

async function runPatchPhase(db: Client) {
  // url map 로드
  const mapRow = await db.execute("SELECT blob_url, r2_url FROM migration_blob_to_r2");
  const urlMap = new Map<string, string>();
  for (const r of mapRow.rows) {
    urlMap.set(String(r.blob_url), String(r.r2_url));
  }

  const summary: { table: string; col: string; updated: number; error?: string }[] = [];

  for (const { table, col } of URL_COLUMNS) {
    try {
      const rs = await db.execute({
        sql: `SELECT id, ${col} AS value FROM ${table} WHERE ${col} IS NOT NULL AND ${col} LIKE '%blob.vercel-storage.com%'`,
        args: [],
      });
      let n = 0;
      for (const row of rs.rows) {
        const old = String(row.value);
        const next = urlMap.get(old);
        if (!next) continue;
        await db.execute({
          sql: `UPDATE ${table} SET ${col} = ? WHERE id = ?`,
          args: [next, row.id],
        });
        n += 1;
      }
      if (n > 0) summary.push({ table, col, updated: n });
    } catch (err) {
      summary.push({
        table,
        col,
        updated: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // articles.body 안 마크다운/HTML 이미지 URL 일괄 치환
  try {
    const rs = await db.execute({
      sql: `SELECT id, slug, body FROM articles WHERE body LIKE '%blob.vercel-storage.com%'`,
      args: [],
    });
    let n = 0;
    for (const row of rs.rows) {
      let body = String(row.body);
      let changed = false;
      for (const [oldUrl, newUrl] of urlMap) {
        if (body.includes(oldUrl)) {
          body = body.split(oldUrl).join(newUrl);
          changed = true;
        }
      }
      if (!changed) continue;
      await db.execute({
        sql: `UPDATE articles SET body = ? WHERE id = ?`,
        args: [body, row.id],
      });
      n += 1;
    }
    if (n > 0) summary.push({ table: "articles", col: "body (markdown)", updated: n });
  } catch (err) {
    summary.push({
      table: "articles",
      col: "body",
      updated: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return summary;
}
