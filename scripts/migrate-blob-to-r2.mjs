#!/usr/bin/env node
/**
 * Vercel Blob → Cloudflare R2 일회성 마이그레이션
 *
 * 1) 모든 Blob 파일 목록을 받아와 R2에 같은 경로 키로 복사
 * 2) DB의 모든 URL 컬럼(Vercel Blob 도메인)을 R2 공개 URL로 치환
 * 3) articles.body 안의 마크다운 이미지 URL도 함께 치환
 *
 * 사용법:
 *   필요한 env 모두 설정 후
 *     node scripts/migrate-blob-to-r2.mjs            # 실제 실행
 *     node scripts/migrate-blob-to-r2.mjs --dry-run  # 어떤 일이 일어나는지만 출력
 *
 * 필수 env:
 *   BLOB_READ_WRITE_TOKEN
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
 *   TURSO_DATABASE_URL, TURSO_AUTH_TOKEN  (또는 LIBSQL_URL/LIBSQL_AUTH_TOKEN)
 */

import { list } from "@vercel/blob";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@libsql/client";

const DRY = process.argv.includes("--dry-run");

const env = (k, optional = false) => {
  const v = process.env[k];
  if (!v && !optional) {
    console.error(`✗ 환경 변수 ${k} 가 설정되지 않았습니다.`);
    process.exit(1);
  }
  return v;
};

const R2_ACCOUNT_ID = env("R2_ACCOUNT_ID");
const R2_ACCESS_KEY_ID = env("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = env("R2_SECRET_ACCESS_KEY");
const R2_BUCKET = env("R2_BUCKET");
const R2_PUBLIC_URL = env("R2_PUBLIC_URL").replace(/\/$/, "");
env("BLOB_READ_WRITE_TOKEN");

const TURSO_URL = process.env.TURSO_DATABASE_URL ?? process.env.LIBSQL_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN ?? process.env.LIBSQL_AUTH_TOKEN;
if (!TURSO_URL) {
  console.error("✗ TURSO_DATABASE_URL (또는 LIBSQL_URL) 가 설정되지 않았습니다.");
  process.exit(1);
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

function r2PublicUrl(key) {
  return `${R2_PUBLIC_URL}/${key.replace(/^\//, "")}`;
}

/**
 * Vercel Blob URL 에서 키(=버킷 안 경로) 추출.
 *   https://xxx.public.blob.vercel-storage.com/ebooks/abc.pdf  → ebooks/abc.pdf
 */
function keyFromBlobUrl(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith(".public.blob.vercel-storage.com")) return null;
    return u.pathname.replace(/^\//, "");
  } catch {
    return null;
  }
}

/** 모든 Blob 페이지를 순회 */
async function* iterAllBlobs() {
  let cursor;
  do {
    const page = await list({ cursor, limit: 1000 });
    for (const b of page.blobs) yield b;
    cursor = page.cursor;
  } while (cursor);
}

async function copyBlobToR2(blob) {
  const key = keyFromBlobUrl(blob.url) ?? blob.pathname;
  if (DRY) {
    console.log(`  [dry] copy ${blob.url}  →  R2:${key}  (${blob.size} bytes)`);
    return { key, publicUrl: r2PublicUrl(key) };
  }
  const res = await fetch(blob.downloadUrl ?? blob.url);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status} for ${blob.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buf,
      ContentType: blob.contentType ?? "application/octet-stream",
    })
  );
  return { key, publicUrl: r2PublicUrl(key) };
}

/**
 * URL 컬럼 치환 — Vercel Blob URL을 R2 URL로 일괄 변경.
 *   urlMap: Map<원본 Blob URL, R2 공개 URL>
 */
const URL_COLUMNS = [
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

async function updateUrlColumn(table, col, urlMap) {
  const rs = await db.execute({
    sql: `SELECT id, ${col} AS value FROM ${table} WHERE ${col} IS NOT NULL`,
    args: [],
  });
  let updated = 0;
  for (const row of rs.rows) {
    const old = String(row.value);
    const next = urlMap.get(old);
    if (!next || next === old) continue;
    if (DRY) {
      console.log(`  [dry] ${table}.${col} #${row.id}: ${old}  →  ${next}`);
    } else {
      await db.execute({
        sql: `UPDATE ${table} SET ${col} = ? WHERE id = ?`,
        args: [next, row.id],
      });
    }
    updated += 1;
  }
  if (updated > 0) console.log(`  · ${table}.${col} — ${updated}건 갱신`);
}

/** articles.body 안 마크다운 ![](url)·HTML <img src="url"> 일괄 치환 */
async function updateArticleBodies(urlMap) {
  const rs = await db.execute({
    sql: `SELECT id, slug, body FROM articles WHERE body IS NOT NULL AND body LIKE '%blob.vercel-storage.com%'`,
    args: [],
  });
  let updated = 0;
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
    if (DRY) {
      console.log(`  [dry] articles #${row.id} (${row.slug}) — body 안 URL 치환`);
    } else {
      await db.execute({
        sql: `UPDATE articles SET body = ? WHERE id = ?`,
        args: [body, row.id],
      });
    }
    updated += 1;
  }
  if (updated > 0) console.log(`  · articles.body — ${updated}편 갱신`);
}

async function main() {
  console.log(`\n=== Vercel Blob → Cloudflare R2 마이그레이션 ${DRY ? "[DRY RUN]" : ""} ===\n`);

  console.log("1) Vercel Blob 파일을 R2 로 복사");
  const urlMap = new Map();
  let copied = 0;
  let totalBytes = 0;
  let failed = 0;
  for await (const blob of iterAllBlobs()) {
    try {
      const { publicUrl } = await copyBlobToR2(blob);
      urlMap.set(blob.url, publicUrl);
      copied += 1;
      totalBytes += blob.size ?? 0;
      if (copied % 10 === 0) {
        console.log(`  ${copied}개 처리 (${(totalBytes / 1024 / 1024).toFixed(1)} MB)`);
      }
    } catch (err) {
      failed += 1;
      console.error(`  ✗ ${blob.url}: ${err.message ?? err}`);
    }
  }
  console.log(`  → 완료: ${copied}개 (${(totalBytes / 1024 / 1024).toFixed(1)} MB), 실패 ${failed}개\n`);

  console.log("2) DB URL 컬럼 일괄 갱신");
  for (const { table, col } of URL_COLUMNS) {
    try {
      await updateUrlColumn(table, col, urlMap);
    } catch (err) {
      console.error(`  ✗ ${table}.${col}: ${err.message ?? err}`);
    }
  }

  console.log("\n3) articles.body 안 마크다운 이미지 URL 갱신");
  try {
    await updateArticleBodies(urlMap);
  } catch (err) {
    console.error(`  ✗ articles.body: ${err.message ?? err}`);
  }

  console.log(`\n${DRY ? "[DRY RUN 완료]" : "✓ 마이그레이션 완료"}`);
  if (DRY) {
    console.log("실제 적용은 --dry-run 없이 다시 실행하세요.");
  }
}

main().catch((err) => {
  console.error("\n✗ 치명적 오류:", err);
  process.exit(1);
});
