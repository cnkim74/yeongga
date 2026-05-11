import "server-only";
import { getDb } from "./db";

export type MemberBanner = {
  id: number;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string;
  position: number;
  active: boolean;
  created_at: string;
};

function rowToBanner(row: Record<string, unknown>): MemberBanner {
  return {
    id: Number(row.id),
    title: String(row.title),
    subtitle: row.subtitle == null ? null : String(row.subtitle),
    image_url: String(row.image_url),
    link_url: String(row.link_url),
    position: Number(row.position),
    active: Number(row.active) === 1,
    created_at: String(row.created_at),
  };
}

export async function listBanners(): Promise<MemberBanner[]> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT * FROM member_banners ORDER BY position ASC, id ASC`
  );
  return r.rows.map((row) => rowToBanner(row as unknown as Record<string, unknown>));
}

export async function listActiveBanners(): Promise<MemberBanner[]> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT * FROM member_banners WHERE active = 1 ORDER BY position ASC, id ASC`
  );
  return r.rows.map((row) => rowToBanner(row as unknown as Record<string, unknown>));
}

export async function getBanner(id: number): Promise<MemberBanner | null> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT * FROM member_banners WHERE id = ?`,
    args: [id],
  });
  return r.rows[0]
    ? rowToBanner(r.rows[0] as unknown as Record<string, unknown>)
    : null;
}

export async function createBanner(data: {
  title: string;
  subtitle?: string | null;
  image_url: string;
  link_url: string;
  position?: number;
  active?: boolean;
}): Promise<number> {
  const db = await getDb();
  const r = await db.execute({
    sql: `INSERT INTO member_banners (title, subtitle, image_url, link_url, position, active)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      data.title,
      data.subtitle ?? null,
      data.image_url,
      data.link_url,
      data.position ?? 0,
      data.active === false ? 0 : 1,
    ],
  });
  return Number(r.lastInsertRowid);
}

export async function updateBanner(
  id: number,
  data: Partial<{
    title: string;
    subtitle: string | null;
    image_url: string;
    link_url: string;
    position: number;
    active: boolean;
  }>
): Promise<void> {
  const db = await getDb();
  const sets: string[] = ["updated_at = CURRENT_TIMESTAMP"];
  const args: (string | number | null)[] = [];
  if (data.title !== undefined) { sets.push("title = ?"); args.push(data.title); }
  if (data.subtitle !== undefined) { sets.push("subtitle = ?"); args.push(data.subtitle); }
  if (data.image_url !== undefined) { sets.push("image_url = ?"); args.push(data.image_url); }
  if (data.link_url !== undefined) { sets.push("link_url = ?"); args.push(data.link_url); }
  if (data.position !== undefined) { sets.push("position = ?"); args.push(data.position); }
  if (data.active !== undefined) { sets.push("active = ?"); args.push(data.active ? 1 : 0); }
  args.push(id);
  await db.execute({
    sql: `UPDATE member_banners SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function deleteBanner(id: number): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: `DELETE FROM member_banners WHERE id = ?`, args: [id] });
}
