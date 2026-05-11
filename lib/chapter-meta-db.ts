import "server-only";
import { getDb } from "./db";
import { chapters } from "./chapters";
import type { ArticleMeta } from "./articles-db";

export type DisplayMode = "latest" | "featured" | "random";

export type ChapterMeta = {
  chapter_slug: string;
  cover_image: string | null;
  display_mode: DisplayMode;
  featured_article_id: number | null;
  visible: boolean;
  position: number;
};

function rowToMeta(row: Record<string, unknown>): ChapterMeta {
  return {
    chapter_slug: String(row.chapter_slug),
    cover_image: row.cover_image == null ? null : String(row.cover_image),
    display_mode:
      row.display_mode === "featured"
        ? "featured"
        : row.display_mode === "random"
        ? "random"
        : "latest",
    featured_article_id:
      row.featured_article_id == null ? null : Number(row.featured_article_id),
    visible: Number(row.visible) === 1,
    position: Number(row.position),
  };
}

export async function listChapterMetas(): Promise<ChapterMeta[]> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT chapter_slug, cover_image, display_mode, featured_article_id, visible, position
     FROM chapter_meta ORDER BY position ASC`
  );
  return r.rows.map((row) => rowToMeta(row as unknown as Record<string, unknown>));
}

export async function getChapterMeta(slug: string): Promise<ChapterMeta | null> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT chapter_slug, cover_image, display_mode, featured_article_id, visible, position
          FROM chapter_meta WHERE chapter_slug = ?`,
    args: [slug],
  });
  return r.rows[0]
    ? rowToMeta(r.rows[0] as unknown as Record<string, unknown>)
    : null;
}

export async function upsertChapterMeta(
  slug: string,
  data: Partial<{
    cover_image: string | null;
    display_mode: DisplayMode;
    featured_article_id: number | null;
    visible: boolean;
    position: number;
  }>
): Promise<void> {
  const db = await getDb();
  const existing = await db.execute({
    sql: "SELECT chapter_slug FROM chapter_meta WHERE chapter_slug = ?",
    args: [slug],
  });

  if (existing.rows.length === 0) {
    await db.execute({
      sql: `INSERT INTO chapter_meta
            (chapter_slug, cover_image, display_mode, featured_article_id, visible, position, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        slug,
        data.cover_image ?? null,
        data.display_mode ?? "latest",
        data.featured_article_id ?? null,
        data.visible === false ? 0 : 1,
        data.position ?? 0,
      ],
    });
  } else {
    const sets: string[] = ["updated_at = CURRENT_TIMESTAMP"];
    const args: (string | number | null)[] = [];
    if ("cover_image" in data) { sets.push("cover_image = ?"); args.push(data.cover_image ?? null); }
    if (data.display_mode !== undefined) { sets.push("display_mode = ?"); args.push(data.display_mode); }
    if (data.featured_article_id !== undefined) { sets.push("featured_article_id = ?"); args.push(data.featured_article_id); }
    if (data.visible !== undefined) { sets.push("visible = ?"); args.push(data.visible ? 1 : 0); }
    if (data.position !== undefined) { sets.push("position = ?"); args.push(data.position); }
    args.push(slug);
    await db.execute({
      sql: `UPDATE chapter_meta SET ${sets.join(", ")} WHERE chapter_slug = ?`,
      args,
    });
  }
}

/**
 * 메인 페이지용 — 각 챕터의 메타 + 표시할 글을 한 번에 조회.
 * 표시 모드:
 *  - latest: 가장 최근 글
 *  - featured: 지정된 글 (없으면 latest 폴백)
 *  - random: 챕터 내 글 중 무작위 1편
 */
export type ChapterDisplay = {
  meta: ChapterMeta;
  article: ArticleMeta | null;
};

const META_COLS =
  "id, chapter, slug, title, subtitle, author, excerpt, cover, date, visibility, created_at, updated_at";

function rowToArticleMeta(row: Record<string, unknown>): ArticleMeta {
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

export async function listHomeChapterDisplays(): Promise<ChapterDisplay[]> {
  const db = await getDb();

  // 1) 모든 메타 가져오기 (기본값 채움)
  const metas = await listChapterMetas();
  const metaMap = new Map(metas.map((m) => [m.chapter_slug, m]));

  // 2) chapters.ts 의 순서대로 메타 정합 + comingSoon 제외
  const candidates = chapters
    .filter((c) => !c.comingSoon)
    .map((c) => {
      const meta = metaMap.get(c.slug) ?? {
        chapter_slug: c.slug,
        cover_image: null,
        display_mode: "latest" as DisplayMode,
        featured_article_id: null,
        visible: true,
        position: 0,
      };
      return { chapter: c, meta };
    })
    .filter((x) => x.meta.visible);

  // 3) 각 챕터의 글을 결정 — 모든 글을 한 번에 가져온 뒤 매핑 (N+1 회피)
  const allRows = await db.execute(
    `SELECT ${META_COLS} FROM articles ORDER BY chapter, date DESC, id DESC`
  );
  const articlesByChapter = new Map<string, ArticleMeta[]>();
  for (const row of allRows.rows) {
    const m = rowToArticleMeta(row as unknown as Record<string, unknown>);
    const arr = articlesByChapter.get(m.chapter) ?? [];
    arr.push(m);
    articlesByChapter.set(m.chapter, arr);
  }

  return candidates.map(({ chapter, meta }) => {
    const list = articlesByChapter.get(chapter.slug) ?? [];
    let article: ArticleMeta | null = null;

    if (meta.display_mode === "featured" && meta.featured_article_id != null) {
      article =
        list.find((a) => a.id === meta.featured_article_id) ?? list[0] ?? null;
    } else if (meta.display_mode === "random" && list.length > 0) {
      article = list[Math.floor(Math.random() * list.length)];
    } else {
      article = list[0] ?? null;
    }

    return { meta, article };
  });
}
