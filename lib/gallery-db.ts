import "server-only";
import { unstable_cache } from "next/cache";
import { getDb } from "./db";

// 캐시 TTL — 60s. 카테고리/사진 변경 시 admin action 의 revalidateTag("gallery") 로 즉시 무효화.
const CACHE_TTL = 60;

export type PhotoCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  position: number;
  photo_count?: number;
};

export type Photo = {
  id: number;
  category_id: number | null;
  title: string | null;
  description: string | null;
  image_url: string;
  taken_at: string | null;
  position: number;
  visibility: "public" | "members-only";
  created_at: string;
  category_name?: string | null;
};

function rowToCategory(row: Record<string, unknown>): PhotoCategory {
  return {
    id: Number(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description != null ? String(row.description) : null,
    cover_url: row.cover_url != null ? String(row.cover_url) : null,
    position: Number(row.position),
    photo_count: row.photo_count != null ? Number(row.photo_count) : undefined,
  };
}

function rowToPhoto(row: Record<string, unknown>): Photo {
  return {
    id: Number(row.id),
    category_id: row.category_id != null ? Number(row.category_id) : null,
    title: row.title != null ? String(row.title) : null,
    description: row.description != null ? String(row.description) : null,
    image_url: String(row.image_url),
    taken_at: row.taken_at != null ? String(row.taken_at) : null,
    position: Number(row.position),
    visibility: row.visibility === "members-only" ? "members-only" : "public",
    created_at: String(row.created_at),
    category_name: row.category_name != null ? String(row.category_name) : null,
  };
}

// ─── 카테고리 CRUD ──────────────────────────────────────────

export const listCategories = unstable_cache(
  async (): Promise<PhotoCategory[]> => {
    const db = await getDb();
    const res = await db.execute(`
      SELECT c.id, c.name, c.slug, c.description, c.cover_url, c.position,
             COUNT(p.id) AS photo_count
      FROM photo_categories c
      LEFT JOIN photos p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.position ASC, c.id ASC
    `);
    return res.rows.map((r) => rowToCategory(r as Record<string, unknown>));
  },
  ["gallery:categories"],
  { tags: ["gallery"], revalidate: CACHE_TTL }
);

export type Album = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  cover: string | null;
  photo_count: number;
};

/** 앨범 카드용 — 카테고리 + 대표 이미지(커버 없으면 첫 사진) + 사진 수.
 *  publicOnly 면 공개 사진만으로 커버·개수 산정. */
export const listAlbums = unstable_cache(
  async (publicOnly = false): Promise<Album[]> => {
    const db = await getDb();
    const visFilter = publicOnly ? "AND pp.visibility = 'public'" : "";
    const visFilter2 = publicOnly ? "AND pc.visibility = 'public'" : "";
    const res = await db.execute(`
      SELECT c.id, c.name, c.slug, c.description, c.position,
             COALESCE(
               c.cover_url,
               (SELECT pp.image_url FROM photos pp
                 WHERE pp.category_id = c.id ${visFilter}
                 ORDER BY pp.position ASC, pp.id ASC LIMIT 1)
             ) AS cover,
             (SELECT COUNT(*) FROM photos pc
                WHERE pc.category_id = c.id ${visFilter2}) AS photo_count
      FROM photo_categories c
      ORDER BY c.position ASC, c.id ASC
    `);
    return res.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: Number(row.id),
        name: String(row.name),
        slug: String(row.slug),
        description: row.description != null ? String(row.description) : null,
        position: Number(row.position),
        cover: row.cover != null ? String(row.cover) : null,
        photo_count: Number(row.photo_count ?? 0),
      };
    });
  },
  ["gallery:albums"],
  { tags: ["gallery"], revalidate: CACHE_TTL }
);

export async function getCategoryById(id: number): Promise<PhotoCategory | null> {
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT c.id, c.name, c.slug, c.description, c.cover_url, c.position,
                 COUNT(p.id) AS photo_count
          FROM photo_categories c
          LEFT JOIN photos p ON p.category_id = c.id
          WHERE c.id = ?
          GROUP BY c.id
          LIMIT 1`,
    args: [id],
  });
  if (res.rows.length === 0) return null;
  return rowToCategory(res.rows[0] as Record<string, unknown>);
}

export async function getCategoryBySlug(slug: string): Promise<PhotoCategory | null> {
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT c.id, c.name, c.slug, c.description, c.cover_url, c.position,
                 COUNT(p.id) AS photo_count
          FROM photo_categories c
          LEFT JOIN photos p ON p.category_id = c.id
          WHERE c.slug = ?
          GROUP BY c.id
          LIMIT 1`,
    args: [slug],
  });
  if (res.rows.length === 0) return null;
  return rowToCategory(res.rows[0] as Record<string, unknown>);
}

export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string | null;
  cover_url?: string | null;
  position?: number;
}): Promise<number> {
  const db = await getDb();
  const res = await db.execute({
    sql: `INSERT INTO photo_categories (name, slug, description, cover_url, position)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      data.name,
      data.slug,
      data.description ?? null,
      data.cover_url ?? null,
      data.position ?? 0,
    ],
  });
  return Number(res.lastInsertRowid);
}

export async function updateCategory(
  id: number,
  data: Partial<{
    name: string;
    slug: string;
    description: string | null;
    cover_url: string | null;
    position: number;
  }>
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
  if (data.slug !== undefined) { sets.push("slug = ?"); args.push(data.slug); }
  if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description); }
  if (data.cover_url !== undefined) { sets.push("cover_url = ?"); args.push(data.cover_url); }
  if (data.position !== undefined) { sets.push("position = ?"); args.push(data.position); }

  if (sets.length === 0) return;
  args.push(id);
  await db.execute({
    sql: `UPDATE photo_categories SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM photo_categories WHERE id = ?", args: [id] });
}

// ─── 사진 CRUD ──────────────────────────────────────────────

/** 어드민 카드용 — 카운트만 */
export async function countPhotos(): Promise<number> {
  const db = await getDb();
  const r = await db.execute(`SELECT COUNT(*) AS n FROM photos`);
  return Number(r.rows[0].n);
}

export const listPhotos = unstable_cache(
  async (opts?: {
    categoryId?: number;
    visibility?: string;
  }): Promise<Photo[]> => {
    const db = await getDb();
    const conditions: string[] = [];
    const args: (string | number | null)[] = [];

    if (opts?.categoryId !== undefined) {
      conditions.push("p.category_id = ?");
      args.push(opts.categoryId);
    }
    if (opts?.visibility) {
      conditions.push("p.visibility = ?");
      args.push(opts.visibility);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const res = await db.execute({
      sql: `SELECT p.id, p.category_id, p.title, p.description, p.image_url,
                   p.taken_at, p.position, p.visibility, p.created_at,
                   c.name AS category_name
            FROM photos p
            LEFT JOIN photo_categories c ON c.id = p.category_id
            ${where}
            ORDER BY p.position ASC, p.id DESC`,
      args,
    });
    return res.rows.map((r) => rowToPhoto(r as Record<string, unknown>));
  },
  ["gallery:photos"],
  { tags: ["gallery"], revalidate: CACHE_TTL }
);

export async function getPhoto(id: number): Promise<Photo | null> {
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT p.id, p.category_id, p.title, p.description, p.image_url,
                 p.taken_at, p.position, p.visibility, p.created_at,
                 c.name AS category_name
          FROM photos p
          LEFT JOIN photo_categories c ON c.id = p.category_id
          WHERE p.id = ?
          LIMIT 1`,
    args: [id],
  });
  if (res.rows.length === 0) return null;
  return rowToPhoto(res.rows[0] as Record<string, unknown>);
}

export async function createPhoto(data: {
  category_id?: number | null;
  title?: string | null;
  description?: string | null;
  image_url: string;
  taken_at?: string | null;
  position?: number;
  visibility?: "public" | "members-only";
}): Promise<number> {
  const db = await getDb();
  const res = await db.execute({
    sql: `INSERT INTO photos (category_id, title, description, image_url, taken_at, position, visibility)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.category_id ?? null,
      data.title ?? null,
      data.description ?? null,
      data.image_url,
      data.taken_at ?? null,
      data.position ?? 0,
      data.visibility ?? "public",
    ],
  });
  return Number(res.lastInsertRowid);
}

export async function updatePhoto(
  id: number,
  data: Partial<{
    category_id: number | null;
    title: string | null;
    description: string | null;
    image_url: string;
    taken_at: string | null;
    position: number;
    visibility: "public" | "members-only";
  }>
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  if (data.category_id !== undefined) { sets.push("category_id = ?"); args.push(data.category_id); }
  if (data.title !== undefined) { sets.push("title = ?"); args.push(data.title); }
  if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description); }
  if (data.image_url !== undefined) { sets.push("image_url = ?"); args.push(data.image_url); }
  if (data.taken_at !== undefined) { sets.push("taken_at = ?"); args.push(data.taken_at); }
  if (data.position !== undefined) { sets.push("position = ?"); args.push(data.position); }
  if (data.visibility !== undefined) { sets.push("visibility = ?"); args.push(data.visibility); }

  if (sets.length === 0) return;
  args.push(id);
  await db.execute({
    sql: `UPDATE photos SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function deletePhoto(id: number): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM photos WHERE id = ?", args: [id] });
}

export const listPhotosByCategory = unstable_cache(
  async (categorySlug: string): Promise<Photo[]> => {
    const db = await getDb();
    const res = await db.execute({
      sql: `SELECT p.id, p.category_id, p.title, p.description, p.image_url,
                   p.taken_at, p.position, p.visibility, p.created_at,
                   c.name AS category_name
            FROM photos p
            JOIN photo_categories c ON c.id = p.category_id
            WHERE c.slug = ?
            ORDER BY p.position ASC, p.id DESC`,
      args: [categorySlug],
    });
    return res.rows.map((r) => rowToPhoto(r as Record<string, unknown>));
  },
  ["gallery:photosByCategory"],
  { tags: ["gallery"], revalidate: CACHE_TTL }
);
