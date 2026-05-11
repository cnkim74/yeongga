import "server-only";
import { getDb } from "./db";
import { looksLikeHTML, renderMarkdown } from "./markdown";

export type Visibility = "public" | "members-only";

export type ArticleMeta = {
  id: number;
  chapter: string;
  slug: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  excerpt: string | null;
  cover: string | null;
  date: string;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
};

export type Article = ArticleMeta & {
  body: string;
  html: string;
};

const META_COLS =
  "id, chapter, slug, title, subtitle, author, excerpt, cover, date, visibility, created_at, updated_at";

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
    visibility: row.visibility === "members-only" ? "members-only" : "public",
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

// 본문이 HTML이면 그대로, 마크다운이면 렌더해서 HTML로 (마이그레이션 전 호환)
async function bodyToHTML(body: string): Promise<string> {
  return looksLikeHTML(body) ? body : await renderMarkdown(body);
}

export async function listAllArticles(): Promise<ArticleMeta[]> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT ${META_COLS} FROM articles ORDER BY date DESC, id DESC`
  );
  return r.rows.map((row) => rowToMeta(row as unknown as Record<string, unknown>));
}

export async function listChapterArticles(
  chapter: string
): Promise<ArticleMeta[]> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT ${META_COLS} FROM articles WHERE chapter = ? ORDER BY date DESC, id DESC`,
    args: [chapter],
  });
  return r.rows.map((row) => rowToMeta(row as unknown as Record<string, unknown>));
}

export async function countAllArticles(): Promise<number> {
  const db = await getDb();
  const r = await db.execute(`SELECT COUNT(*) as n FROM articles`);
  return Number(r.rows[0].n);
}

/**
 * 특정 글의 본문(body)만 원본 .md 파일에서 다시 가져와 DB 업데이트.
 * 어드민에서 cover 등을 변경하다 본문이 깨진 경우 복원용.
 * cover/title/excerpt 등 메타데이터는 건드리지 않음.
 */
export async function restoreBodyFromFile(
  chapter: string,
  slug: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  // 동적 import — server-only 모듈이라 server action 에서만 호출 가능
  const fs = await import("node:fs");
  const path = await import("node:path");
  const matter = (await import("gray-matter")).default;

  const filePath = path.join(
    process.cwd(),
    "content",
    "articles",
    chapter,
    `${slug}.md`
  );
  if (!fs.existsSync(filePath)) {
    return { ok: false, error: `원본 파일이 없습니다: ${filePath}` };
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const { content } = matter(raw);
  const html = await renderMarkdown(content);

  const db = await getDb();
  const r = await db.execute({
    sql: `UPDATE articles SET body = ?, updated_at = CURRENT_TIMESTAMP
          WHERE chapter = ? AND slug = ?`,
    args: [html, chapter, slug],
  });

  if (r.rowsAffected === 0) {
    return { ok: false, error: "해당 글을 DB에서 찾을 수 없습니다." };
  }
  return { ok: true };
}

/**
 * 챕터별 최신 글 1편씩 — 홈 페이지용
 * 8개 챕터에 대해 별도 쿼리 8번 도는 대신 한 번에 가져옴 (윈도우 함수 활용)
 */
export async function getLatestPerChapter(): Promise<ArticleMeta[]> {
  const db = await getDb();
  const r = await db.execute(`
    SELECT ${META_COLS} FROM (
      SELECT ${META_COLS},
        ROW_NUMBER() OVER (PARTITION BY chapter ORDER BY date DESC, id DESC) AS rn
      FROM articles
    )
    WHERE rn = 1
  `);
  return r.rows.map((row) => rowToMeta(row as unknown as Record<string, unknown>));
}

export async function getArticleBySlug(
  chapter: string,
  slug: string
): Promise<Article | null> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT ${META_COLS}, body FROM articles WHERE chapter = ? AND slug = ?`,
    args: [chapter, slug],
  });
  const row = r.rows[0];
  if (!row) return null;
  const rec = row as unknown as Record<string, unknown>;
  const meta = rowToMeta(rec);
  const body = String(rec.body);
  return { ...meta, body, html: await bodyToHTML(body) };
}

export async function getArticleById(id: number): Promise<Article | null> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT ${META_COLS}, body FROM articles WHERE id = ?`,
    args: [id],
  });
  const row = r.rows[0];
  if (!row) return null;
  const rec = row as unknown as Record<string, unknown>;
  const meta = rowToMeta(rec);
  const body = String(rec.body);
  return { ...meta, body, html: await bodyToHTML(body) };
}

export type ArticleInput = {
  chapter: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  author?: string | null;
  excerpt?: string | null;
  cover?: string | null;
  date: string;
  visibility: Visibility;
  body: string;
};

export async function createArticle(
  input: ArticleInput
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const db = await getDb();
  const exists = await db.execute({
    sql: "SELECT id FROM articles WHERE chapter = ? AND slug = ?",
    args: [input.chapter, input.slug],
  });
  if (exists.rows.length > 0) {
    return { ok: false, error: "이미 같은 슬러그의 글이 있습니다." };
  }
  const r = await db.execute({
    sql: `INSERT INTO articles
          (chapter, slug, title, subtitle, author, excerpt, cover, date, visibility, body, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    args: [
      input.chapter,
      input.slug,
      input.title,
      input.subtitle ?? null,
      input.author ?? null,
      input.excerpt ?? null,
      input.cover ?? null,
      input.date,
      input.visibility,
      input.body,
    ],
  });
  return { ok: true, id: Number(r.lastInsertRowid) };
}

export async function updateArticle(
  id: number,
  input: ArticleInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();
  const dup = await db.execute({
    sql: "SELECT id FROM articles WHERE chapter = ? AND slug = ? AND id != ?",
    args: [input.chapter, input.slug, id],
  });
  if (dup.rows.length > 0) {
    return { ok: false, error: "이미 같은 슬러그의 글이 있습니다." };
  }
  await db.execute({
    sql: `UPDATE articles
          SET chapter = ?, slug = ?, title = ?, subtitle = ?, author = ?,
              excerpt = ?, cover = ?, date = ?, visibility = ?, body = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [
      input.chapter,
      input.slug,
      input.title,
      input.subtitle ?? null,
      input.author ?? null,
      input.excerpt ?? null,
      input.cover ?? null,
      input.date,
      input.visibility,
      input.body,
      id,
    ],
  });
  return { ok: true };
}

export async function deleteArticle(id: number) {
  const db = await getDb();
  // 삭제 전에 chapter/slug 를 차단 목록에 기록 → 시딩 때 부활 방지
  const row = await db.execute({
    sql: "SELECT chapter, slug FROM articles WHERE id = ?",
    args: [id],
  });
  if (row.rows.length > 0) {
    const { chapter, slug } = row.rows[0];
    await db.execute({
      sql: "INSERT OR IGNORE INTO seeded_deletions (chapter, slug) VALUES (?, ?)",
      args: [chapter, slug],
    });
  }
  await db.execute({ sql: "DELETE FROM articles WHERE id = ?", args: [id] });
}
