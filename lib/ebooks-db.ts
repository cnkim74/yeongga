import "server-only";
import { getDb } from "./db";

export type Ebook = {
  id: number;
  title: string;
  description: string | null;
  pdf_url: string;
  cover_url: string | null;
  visibility: "public" | "members-only";
  position: number;
  created_at: string;
};

function rowToEbook(row: Record<string, unknown>): Ebook {
  return {
    id: Number(row.id),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    pdf_url: String(row.pdf_url),
    cover_url: row.cover_url != null ? String(row.cover_url) : null,
    visibility: row.visibility === "members-only" ? "members-only" : "public",
    position: Number(row.position),
    created_at: String(row.created_at),
  };
}

export async function listEbooks(): Promise<Ebook[]> {
  const db = await getDb();
  const res = await db.execute(
    "SELECT * FROM ebooks ORDER BY position ASC, id ASC"
  );
  return res.rows.map((r) => rowToEbook(r as Record<string, unknown>));
}

export async function getEbook(id: number): Promise<Ebook | null> {
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT * FROM ebooks WHERE id = ? LIMIT 1",
    args: [id],
  });
  if (res.rows.length === 0) return null;
  return rowToEbook(res.rows[0] as Record<string, unknown>);
}

export async function createEbook(data: {
  title: string;
  description?: string | null;
  pdf_url: string;
  cover_url?: string | null;
  visibility?: "public" | "members-only";
  position?: number;
}): Promise<number> {
  const db = await getDb();
  const res = await db.execute({
    sql: `INSERT INTO ebooks (title, description, pdf_url, cover_url, visibility, position)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      data.title,
      data.description ?? null,
      data.pdf_url,
      data.cover_url ?? null,
      data.visibility ?? "public",
      data.position ?? 0,
    ],
  });
  return Number(res.lastInsertRowid);
}

export async function updateEbook(
  id: number,
  data: Partial<{
    title: string;
    description: string | null;
    pdf_url: string;
    cover_url: string | null;
    visibility: "public" | "members-only";
    position: number;
  }>
): Promise<void> {
  const db = await getDb();
  const sets: string[] = ["updated_at = CURRENT_TIMESTAMP"];
  const args: (string | number | null)[] = [];

  if (data.title !== undefined) {
    sets.push("title = ?");
    args.push(data.title);
  }
  if (data.description !== undefined) {
    sets.push("description = ?");
    args.push(data.description);
  }
  if (data.pdf_url !== undefined) {
    sets.push("pdf_url = ?");
    args.push(data.pdf_url);
  }
  if (data.cover_url !== undefined) {
    sets.push("cover_url = ?");
    args.push(data.cover_url);
  }
  if (data.visibility !== undefined) {
    sets.push("visibility = ?");
    args.push(data.visibility);
  }
  if (data.position !== undefined) {
    sets.push("position = ?");
    args.push(data.position);
  }

  args.push(id);
  await db.execute({
    sql: `UPDATE ebooks SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function deleteEbook(id: number): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM ebooks WHERE id = ?", args: [id] });
}
