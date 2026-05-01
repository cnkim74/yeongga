import "server-only";
import { getDb, parseEmbed } from "./db";

export type Video = {
  id: number;
  kicker: string | null;
  title: string;
  description: string | null;
  embed_url: string;
  provider: "youtube" | "vimeo" | "other" | null;
  video_id: string | null;
  thumbnail_url: string | null;
  featured: number; // 0/1
  position: number;
  created_at: string;
};

export function listVideos(): Video[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM videos ORDER BY featured DESC, position ASC, id DESC`
    )
    .all() as Video[];
}

export function getVideo(id: number): Video | null {
  const db = getDb();
  return (
    (db.prepare(`SELECT * FROM videos WHERE id = ?`).get(id) as Video) ?? null
  );
}

export function getFeaturedVideo(): Video | null {
  const db = getDb();
  return (
    (db
      .prepare(
        `SELECT * FROM videos WHERE featured = 1 ORDER BY position ASC, id DESC LIMIT 1`
      )
      .get() as Video) ?? null
  );
}

export function createVideo(input: {
  kicker?: string | null;
  title: string;
  description?: string | null;
  inputUrl: string; // 사용자가 붙여 넣은 URL (watch?v= 포함 가능)
  featured: boolean;
}): { ok: true; id: number } | { ok: false; error: string } {
  const parsed = parseEmbed(input.inputUrl);
  if (parsed.provider === "other") {
    // 그래도 저장은 허용하되, 임베드가 안 될 수 있다는 경고는 admin UI에서 표시
  }
  const db = getDb();
  if (input.featured) {
    db.prepare("UPDATE videos SET featured = 0").run();
  }
  const max =
    (db.prepare(`SELECT MAX(position) as m FROM videos`).get() as {
      m: number | null;
    }).m ?? 0;
  const result = db
    .prepare(
      `INSERT INTO videos (kicker, title, description, embed_url, provider, video_id, thumbnail_url, featured, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.kicker ?? null,
      input.title,
      input.description ?? null,
      parsed.embedUrl,
      parsed.provider,
      parsed.videoId,
      parsed.thumbnailUrl,
      input.featured ? 1 : 0,
      max + 1
    );
  return { ok: true, id: Number(result.lastInsertRowid) };
}

export function updateVideo(
  id: number,
  input: {
    kicker?: string | null;
    title: string;
    description?: string | null;
    inputUrl: string;
    featured: boolean;
  }
) {
  const parsed = parseEmbed(input.inputUrl);
  const db = getDb();
  if (input.featured) {
    db.prepare("UPDATE videos SET featured = 0 WHERE id != ?").run(id);
  }
  db.prepare(
    `UPDATE videos
     SET kicker=?, title=?, description=?, embed_url=?, provider=?, video_id=?, thumbnail_url=?, featured=?
     WHERE id=?`
  ).run(
    input.kicker ?? null,
    input.title,
    input.description ?? null,
    parsed.embedUrl,
    parsed.provider,
    parsed.videoId,
    parsed.thumbnailUrl,
    input.featured ? 1 : 0,
    id
  );
}

export function deleteVideo(id: number) {
  getDb().prepare("DELETE FROM videos WHERE id = ?").run(id);
}

export function setFeatured(id: number) {
  const db = getDb();
  db.prepare("UPDATE videos SET featured = 0").run();
  db.prepare("UPDATE videos SET featured = 1 WHERE id = ?").run(id);
}
