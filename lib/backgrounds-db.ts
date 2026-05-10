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

const PAGES = ["home", "archive", "search", "videos", "about", "ebooks"] as const;
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
  // 행이 없으면 INSERT, 있으면 UPDATE (image_path는 null이 아닐 때만 덮어씀)
  const existing = await db.execute({
    sql: "SELECT id FROM page_backgrounds WHERE page = ?",
    args: [page],
  });
  if (existing.rows.length === 0) {
    await db.execute({
      sql: `INSERT INTO page_backgrounds (page, image_path, opacity, position, active, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        page,
        data.image_path ?? null,
        data.opacity ?? 0.2,
        data.position ?? "center",
        data.active ? 1 : 0,
      ],
    });
  } else {
    const sets: string[] = ["opacity = ?", "position = ?", "active = ?", "updated_at = CURRENT_TIMESTAMP"];
    const args: (string | number | null)[] = [
      data.opacity ?? 0.2,
      data.position ?? "center",
      data.active ? 1 : 0,
    ];
    // image_path가 명시적으로 전달됐을 때만 업데이트
    if ("image_path" in data) {
      sets.unshift("image_path = ?");
      args.unshift(data.image_path ?? null);
    }
    args.push(page);
    await db.execute({
      sql: `UPDATE page_backgrounds SET ${sets.join(", ")} WHERE page = ?`,
      args,
    });
  }
}

export async function setPageBackgroundImage(page: string, image_path: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `UPDATE page_backgrounds SET image_path = ?, updated_at = CURRENT_TIMESTAMP WHERE page = ?`,
    args: [image_path, page],
  });
}
