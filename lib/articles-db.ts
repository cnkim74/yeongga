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
  await db.execute({ sql: "DELETE FROM articles WHERE id = ?", args: [id] });
}
