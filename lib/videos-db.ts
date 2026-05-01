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
  featured: number;
  position: number;
  created_at: string;
};

function rowToVideo(row: Record<string, unknown>): Video {
  return {
    id: Number(row.id),
    kicker: row.kicker == null ? null : String(row.kicker),
    title: String(row.title),
    description: row.description == null ? null : String(row.description),
    embed_url: String(row.embed_url),
    provider: (row.provider as Video["provider"]) ?? null,
    video_id: row.video_id == null ? null : String(row.video_id),
    thumbnail_url: row.thumbnail_url == null ? null : String(row.thumbnail_url),
    featured: Number(row.featured),
    position: Number(row.position),
    created_at: String(row.created_at),
  };
}

export async function listVideos(): Promise<Video[]> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT * FROM videos ORDER BY featured DESC, position ASC, id DESC`
  );
  return r.rows.map((row) => rowToVideo(row as unknown as Record<string, unknown>));
}

export async function getVideo(id: number): Promise<Video | null> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT * FROM videos WHERE id = ?`,
    args: [id],
  });
  const row = r.rows[0];
  return row ? rowToVideo(row as unknown as Record<string, unknown>) : null;
}

export async function getFeaturedVideo(): Promise<Video | null> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT * FROM videos WHERE featured = 1 ORDER BY position ASC, id DESC LIMIT 1`
  );
  const row = r.rows[0];
  return row ? rowToVideo(row as unknown as Record<string, unknown>) : null;
}

export async function createVideo(input: {
  kicker?: string | null;
  title: string;
  description?: string | null;
  inputUrl: string;
  featured: boolean;
}): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const parsed = parseEmbed(input.inputUrl);
  const db = await getDb();
  if (input.featured) {
    await db.execute("UPDATE videos SET featured = 0");
  }
  const maxR = await db.execute(`SELECT MAX(position) as m FROM videos`);
  const maxRow = maxR.rows[0];
  const max = maxRow && maxRow.m != null ? Number(maxRow.m) : 0;
  const r = await db.execute({
    sql: `INSERT INTO videos
          (kicker, title, description, embed_url, provider, video_id, thumbnail_url, featured, position)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.kicker ?? null,
      input.title,
      input.description ?? null,
      parsed.embedUrl,
      parsed.provider,
      parsed.videoId,
      parsed.thumbnailUrl,
      input.featured ? 1 : 0,
      max + 1,
    ],
  });
  return { ok: true, id: Number(r.lastInsertRowid) };
}

export async function updateVideo(
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
  const db = await getDb();
  if (input.featured) {
    await db.execute({
      sql: "UPDATE videos SET featured = 0 WHERE id != ?",
      args: [id],
    });
  }
  await db.execute({
    sql: `UPDATE videos
          SET kicker=?, title=?, description=?, embed_url=?, provider=?, video_id=?, thumbnail_url=?, featured=?
          WHERE id=?`,
    args: [
      input.kicker ?? null,
      input.title,
      input.description ?? null,
      parsed.embedUrl,
      parsed.provider,
      parsed.videoId,
      parsed.thumbnailUrl,
      input.featured ? 1 : 0,
      id,
    ],
  });
}

export async function deleteVideo(id: number) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM videos WHERE id = ?", args: [id] });
}

export async function setFeatured(id: number) {
  const db = await getDb();
  await db.execute("UPDATE videos SET featured = 0");
  await db.execute({
    sql: "UPDATE videos SET featured = 1 WHERE id = ?",
    args: [id],
  });
}
