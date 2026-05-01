import "server-only";
import { getDb } from "./db";

export type Slide = {
  id: number;
  image_path: string;
  kicker: string | null;
  title: string;
  excerpt: string | null;
  cta: string | null;
  href: string;
  position: number;
  active: number;
  created_at: string;
};

function rowToSlide(row: Record<string, unknown>): Slide {
  return {
    id: Number(row.id),
    image_path: String(row.image_path),
    kicker: row.kicker == null ? null : String(row.kicker),
    title: String(row.title),
    excerpt: row.excerpt == null ? null : String(row.excerpt),
    cta: row.cta == null ? null : String(row.cta),
    href: String(row.href),
    position: Number(row.position),
    active: Number(row.active),
    created_at: String(row.created_at),
  };
}

export async function listSlides(): Promise<Slide[]> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT * FROM slides ORDER BY position ASC, id ASC`
  );
  return r.rows.map((row) => rowToSlide(row as unknown as Record<string, unknown>));
}

export async function listActiveSlides(): Promise<Slide[]> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT * FROM slides WHERE active = 1 ORDER BY position ASC, id ASC`
  );
  return r.rows.map((row) => rowToSlide(row as unknown as Record<string, unknown>));
}

export async function getSlide(id: number): Promise<Slide | null> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT * FROM slides WHERE id = ?`,
    args: [id],
  });
  const row = r.rows[0];
  return row ? rowToSlide(row as unknown as Record<string, unknown>) : null;
}

export async function createSlide(input: {
  image_path: string;
  kicker?: string | null;
  title: string;
  excerpt?: string | null;
  cta?: string | null;
  href: string;
  active: boolean;
}): Promise<number> {
  const db = await getDb();
  const maxR = await db.execute(`SELECT MAX(position) as m FROM slides`);
  const maxRow = maxR.rows[0];
  const max = maxRow && maxRow.m != null ? Number(maxRow.m) : 0;
  const r = await db.execute({
    sql: `INSERT INTO slides (image_path, kicker, title, excerpt, cta, href, position, active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.image_path,
      input.kicker ?? null,
      input.title,
      input.excerpt ?? null,
      input.cta ?? null,
      input.href,
      max + 1,
      input.active ? 1 : 0,
    ],
  });
  return Number(r.lastInsertRowid);
}

export async function updateSlide(
  id: number,
  input: {
    image_path: string;
    kicker?: string | null;
    title: string;
    excerpt?: string | null;
    cta?: string | null;
    href: string;
    active: boolean;
  }
) {
  const db = await getDb();
  await db.execute({
    sql: `UPDATE slides
          SET image_path=?, kicker=?, title=?, excerpt=?, cta=?, href=?, active=?
          WHERE id=?`,
    args: [
      input.image_path,
      input.kicker ?? null,
      input.title,
      input.excerpt ?? null,
      input.cta ?? null,
      input.href,
      input.active ? 1 : 0,
      id,
    ],
  });
}

export async function deleteSlide(id: number) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM slides WHERE id = ?", args: [id] });
}

export async function moveSlide(id: number, direction: "up" | "down") {
  const slides = await listSlides();
  const i = slides.findIndex((s) => s.id === id);
  if (i < 0) return;
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= slides.length) return;
  const a = slides[i];
  const b = slides[j];
  const db = await getDb();
  await db.execute({
    sql: "UPDATE slides SET position=? WHERE id=?",
    args: [b.position, a.id],
  });
  await db.execute({
    sql: "UPDATE slides SET position=? WHERE id=?",
    args: [a.position, b.id],
  });
}

export async function toggleActive(id: number, active: boolean) {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE slides SET active=? WHERE id=?",
    args: [active ? 1 : 0, id],
  });
}
