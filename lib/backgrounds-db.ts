import "server-only";
import { getDb } from "./db";

export type PageBackground = {
  id: number;
  page: string;
  image_path: string | null;
  opacity: number;
  position: string;
  active: boolean;
};

const PAGES = ["home", "archive", "search", "videos", "about"] as const;
export type PageSlug = (typeof PAGES)[number];

function rowToBg(row: Record<string, unknown>): PageBackground {
  return {
    id: Number(row.id),
    page: String(row.page),
    image_path: row.image_path == null ? null : String(row.image_path),
    opacity: Number(row.opacity),
    position: String(row.position ?? "center"),
    active: Number(row.active) === 1,
  };
}

export async function listPageBackgrounds(): Promise<PageBackground[]> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT id, page, image_path, opacity, position, active FROM page_backgrounds ORDER BY id`
  );
  return r.rows.map((row) => rowToBg(row as unknown as Record<string, unknown>));
}

export async function getPageBackground(page: string): Promise<PageBackground | null> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT id, page, image_path, opacity, position, active FROM page_backgrounds WHERE page = ?`,
    args: [page],
  });
  const row = r.rows[0];
  if (!row) return null;
  return rowToBg(row as unknown as Record<string, unknown>);
}

export async function upsertPageBackground(
  page: string,
  data: { image_path?: string | null; opacity?: number; position?: string; active?: boolean }
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO page_backgrounds (page, image_path, opacity, position, active, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(page) DO UPDATE SET
            image_path = COALESCE(excluded.image_path, image_path),
            opacity = excluded.opacity,
            position = excluded.position,
            active = excluded.active,
            updated_at = CURRENT_TIMESTAMP`,
    args: [
      page,
      data.image_path ?? null,
      data.opacity ?? 0.2,
      data.position ?? "center",
      data.active ? 1 : 0,
    ],
  });
}

export async function setPageBackgroundImage(page: string, image_path: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `UPDATE page_backgrounds SET image_path = ?, updated_at = CURRENT_TIMESTAMP WHERE page = ?`,
    args: [image_path, page],
  });
}
