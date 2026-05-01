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
  active: number; // 0/1
  created_at: string;
};

export function listSlides(): Slide[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM slides ORDER BY position ASC, id ASC`
    )
    .all() as Slide[];
}

export function listActiveSlides(): Slide[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM slides WHERE active = 1 ORDER BY position ASC, id ASC`
    )
    .all() as Slide[];
}

export function getSlide(id: number): Slide | null {
  const db = getDb();
  return (
    (db.prepare(`SELECT * FROM slides WHERE id = ?`).get(id) as Slide) ?? null
  );
}

export function createSlide(input: {
  image_path: string;
  kicker?: string | null;
  title: string;
  excerpt?: string | null;
  cta?: string | null;
  href: string;
  active: boolean;
}): number {
  const db = getDb();
  const max =
    (db.prepare(`SELECT MAX(position) as m FROM slides`).get() as {
      m: number | null;
    }).m ?? 0;
  const result = db
    .prepare(
      `INSERT INTO slides (image_path, kicker, title, excerpt, cta, href, position, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.image_path,
      input.kicker ?? null,
      input.title,
      input.excerpt ?? null,
      input.cta ?? null,
      input.href,
      max + 1,
      input.active ? 1 : 0
    );
  return Number(result.lastInsertRowid);
}

export function updateSlide(
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
  const db = getDb();
  db.prepare(
    `UPDATE slides
     SET image_path=?, kicker=?, title=?, excerpt=?, cta=?, href=?, active=?
     WHERE id=?`
  ).run(
    input.image_path,
    input.kicker ?? null,
    input.title,
    input.excerpt ?? null,
    input.cta ?? null,
    input.href,
    input.active ? 1 : 0,
    id
  );
}

export function deleteSlide(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM slides WHERE id = ?").run(id);
}

export function moveSlide(id: number, direction: "up" | "down") {
  const db = getDb();
  const slides = listSlides();
  const i = slides.findIndex((s) => s.id === id);
  if (i < 0) return;
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= slides.length) return;
  const a = slides[i];
  const b = slides[j];
  const swap = db.prepare("UPDATE slides SET position=? WHERE id=?");
  // 단순 swap
  swap.run(b.position, a.id);
  swap.run(a.position, b.id);
}

export function toggleActive(id: number, active: boolean) {
  const db = getDb();
  db.prepare("UPDATE slides SET active=? WHERE id=?").run(active ? 1 : 0, id);
}
