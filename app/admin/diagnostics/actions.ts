"use server";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { restoreBodyFromFile } from "@/lib/articles-db";

/**
 * 특정 챕터의 콘텐츠 디렉토리를 강제 재시드.
 * seeded_deletions 무시하고 누락된 파일을 모두 추가.
 */
export async function forceReseedChapterAction(formData: FormData) {
  await requireAdmin();
  const chapter = String(formData.get("chapter") ?? "").trim();
  if (!chapter) return { error: "챕터 슬러그가 없습니다." };

  const db = await getDb();
  const chapterDir = path.join(process.cwd(), "content", "articles", chapter);
  if (!fs.existsSync(chapterDir)) {
    return { error: `콘텐츠 디렉토리가 없습니다: ${chapter}` };
  }

  let inserted = 0;
  let skipped = 0;

  for (const file of fs.readdirSync(chapterDir)) {
    if (!file.endsWith(".md")) continue;
    const slug = file.replace(/\.md$/, "");

    const raw = fs.readFileSync(path.join(chapterDir, file), "utf8");
    const { data, content } = matter(raw);
    const v = String(data.visibility ?? "public").toLowerCase();
    const visibility =
      v === "members-only" || v === "members" || v === "private"
        ? "members-only"
        : "public";

    // 이미 DB에 있는지 확인
    const existing = await db.execute({
      sql: "SELECT id FROM articles WHERE chapter = ? AND slug = ?",
      args: [chapter, slug],
    });
    if (existing.rows.length > 0) {
      skipped++;
      continue;
    }

    // INSERT (seeded_deletions 무시)
    await db.execute({
      sql: `INSERT INTO articles
            (chapter, slug, title, subtitle, author, excerpt, cover, date, visibility, body)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        chapter,
        slug,
        String(data.title ?? slug),
        data.subtitle ? String(data.subtitle) : null,
        data.author ? String(data.author) : null,
        data.excerpt ? String(data.excerpt) : null,
        data.cover ? String(data.cover) : null,
        String(data.date ?? "1970-01-01"),
        visibility,
        content,
      ],
    });
    inserted++;

    // 태그 처리
    const rawTags = data.tags;
    if (rawTags) {
      const tags = String(rawTags).split(",").map((t: string) => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        const row = await db.execute({
          sql: "SELECT id FROM articles WHERE chapter = ? AND slug = ?",
          args: [chapter, slug],
        });
        if (row.rows.length > 0) {
          const articleId = Number(row.rows[0].id);
          for (const tag of tags) {
            await db.execute({
              sql: "INSERT OR IGNORE INTO article_tags (article_id, tag) VALUES (?, ?)",
              args: [articleId, tag],
            });
          }
        }
      }
    }

    // seeded_deletions 에서 해당 항목 제거 (강제 재시드)
    await db.execute({
      sql: "DELETE FROM seeded_deletions WHERE chapter = ? AND slug = ?",
      args: [chapter, slug],
    });
  }

  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath(`/archive/${chapter}`);
  revalidatePath("/admin/diagnostics");

  return { ok: true, inserted, skipped };
}

/**
 * 단일 글의 본문만 원본 .md 파일에서 복원.
 * cover/title/excerpt 등 다른 메타데이터는 그대로 유지.
 */
export async function restoreArticleBodyAction(formData: FormData) {
  await requireAdmin();
  const chapter = String(formData.get("chapter") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!chapter || !slug) return { error: "챕터와 슬러그를 모두 입력해 주세요." };

  const result = await restoreBodyFromFile(chapter, slug);
  if (!result.ok) return { error: result.error };

  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath(`/archive/${chapter}`);
  revalidatePath(`/archive/${chapter}/${slug}`);
  revalidatePath("/admin/diagnostics");

  return { ok: true };
}
