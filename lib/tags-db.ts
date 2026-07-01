import "server-only";
import { unstable_cache } from "next/cache";
import { getDb } from "./db";
import type { ArticleMeta, Visibility } from "./articles-db";

// 검색/태그 결과 캐시 TTL — 10분. 글 수정 시 revalidateTag("articles")로 즉시 무효화.
const SEARCH_TTL = 600;

// ─── 태그 목록 (전체, 사용 횟수 포함) ────────────────────────────────────────
export const listAllTags = unstable_cache(
  async (): Promise<{ tag: string; count: number }[]> => {
    const db = await getDb();
    const r = await db.execute(
      `SELECT tag, COUNT(*) as count
       FROM article_tags
       GROUP BY tag
       ORDER BY count DESC, tag`
    );
    return r.rows.map((row) => ({
      tag: String(row.tag),
      count: Number(row.count),
    }));
  },
  ["tags:all"],
  { tags: ["articles"], revalidate: SEARCH_TTL }
);

// ─── 글 하나의 태그 ────────────────────────────────────────────────────────
export async function getTagsForArticle(articleId: number): Promise<string[]> {
  const db = await getDb();
  const r = await db.execute({
    sql: "SELECT tag FROM article_tags WHERE article_id = ? ORDER BY tag",
    args: [articleId],
  });
  return r.rows.map((row) => String(row.tag));
}

// ─── 글의 태그 교체 (저장 시 호출) ───────────────────────────────────────────
export async function setTagsForArticle(
  articleId: number,
  tags: string[]
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM article_tags WHERE article_id = ?",
    args: [articleId],
  });
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag) continue;
    await db.execute({
      sql: "INSERT OR IGNORE INTO article_tags (article_id, tag) VALUES (?, ?)",
      args: [articleId, tag],
    });
  }
}

// ─── 태그 전체 삭제 (모든 글에서 제거) ───────────────────────────────────────
export async function deleteTag(tag: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM article_tags WHERE tag = ?",
    args: [tag],
  });
}

// ─── 태그 이름 변경 (모든 글에서) ───────────────────────────────────────────
export async function renameTag(
  oldTag: string,
  newTag: string
): Promise<void> {
  const db = await getDb();
  const trimmed = newTag.trim();
  if (!trimmed || trimmed === oldTag) return;

  // 대상 행에 새 태그가 이미 있으면 충돌 → 기존 행 삭제 후 업데이트
  await db.execute({
    sql: `DELETE FROM article_tags
          WHERE tag = ?
            AND article_id IN (
              SELECT article_id FROM article_tags WHERE tag = ?
            )`,
    args: [trimmed, oldTag],
  });
  await db.execute({
    sql: "UPDATE article_tags SET tag = ? WHERE tag = ?",
    args: [trimmed, oldTag],
  });
}

// ─── 태그로 글 검색 ────────────────────────────────────────────────────────
function rowToMeta(row: Record<string, unknown>): ArticleMeta {
  return {
    id: Number(row.id),
    chapter: String(row.chapter),
    slug: String(row.slug),
    title: String(row.title),
    subtitle: row.subtitle == null ? null : String(row.subtitle),
    author: row.author == null ? null : String(row.author),
    excerpt: row.excerpt == null ? null : String(row.excerpt),
    cover: row.cover == null ? null : String(row.cover),
    date: String(row.date),
    visibility:
      row.visibility === "members-only"
        ? ("members-only" as Visibility)
        : ("public" as Visibility),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export const listArticlesByTag = unstable_cache(
  async (tag: string): Promise<ArticleMeta[]> => {
    const t0 = tag.trim();
    if (!t0) return [];
    const db = await getDb();
    const r = await db.execute({
      sql: `SELECT a.id, a.chapter, a.slug, a.title, a.subtitle,
                   a.author, a.excerpt, a.cover, a.date, a.visibility,
                   a.created_at, a.updated_at
            FROM articles a
            JOIN article_tags t ON t.article_id = a.id
            WHERE t.tag = ?
            ORDER BY a.date DESC, a.id DESC`,
      args: [t0],
    });
    return r.rows.map((row) =>
      rowToMeta(row as unknown as Record<string, unknown>)
    );
  },
  ["tags:byTag"],
  { tags: ["articles"], revalidate: SEARCH_TTL }
);

// ─── 텍스트 + 태그 복합 검색 ──────────────────────────────────────────────
// 2자 미만 질의는 DB를 건드리지 않는다(봇의 빈/단문 쿼리로 인한 풀스캔 폭증 방지).
// 결과는 질의별로 캐시 — 같은 검색이 반복돼도 풀스캔을 다시 돌지 않음.
export const searchArticles = unstable_cache(
  async (query: string): Promise<ArticleMeta[]> => {
    const q0 = query.trim();
    if (q0.length < 2) return [];
    const db = await getDb();
    const q = `%${q0}%`;
    const r = await db.execute({
      sql: `SELECT DISTINCT a.id, a.chapter, a.slug, a.title, a.subtitle,
                   a.author, a.excerpt, a.cover, a.date, a.visibility,
                   a.created_at, a.updated_at
            FROM articles a
            LEFT JOIN article_tags t ON t.article_id = a.id
            WHERE a.title LIKE ?
               OR a.excerpt LIKE ?
               OR a.author LIKE ?
               OR t.tag LIKE ?
            ORDER BY a.date DESC, a.id DESC`,
      args: [q, q, q, q],
    });
    return r.rows.map((row) =>
      rowToMeta(row as unknown as Record<string, unknown>)
    );
  },
  ["search:articles"],
  { tags: ["articles"], revalidate: SEARCH_TTL }
);
