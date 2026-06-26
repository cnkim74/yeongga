import "server-only";
import { unstable_cache } from "next/cache";
import { getDb } from "./db";

const CACHE_TTL = 60;

export type Document = {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  mime: string | null;
  position: number;
  created_at: string;
};

function rowToDocument(row: Record<string, unknown>): Document {
  return {
    id: Number(row.id),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    category: row.category != null ? String(row.category) : null,
    file_url: String(row.file_url),
    file_name: String(row.file_name),
    file_size: Number(row.file_size ?? 0),
    mime: row.mime != null ? String(row.mime) : null,
    position: Number(row.position),
    created_at: String(row.created_at),
  };
}

export const listDocuments = unstable_cache(
  async (): Promise<Document[]> => {
    const db = await getDb();
    const res = await db.execute(
      "SELECT * FROM documents ORDER BY category ASC, position ASC, id DESC"
    );
    return res.rows.map((r) => rowToDocument(r as Record<string, unknown>));
  },
  ["documents:list"],
  { tags: ["documents"], revalidate: CACHE_TTL }
);

/** 어드민 카드용 — 총 개수 + 카테고리 수 */
export const countDocuments = unstable_cache(
  async (): Promise<{ total: number; categories: number }> => {
    const db = await getDb();
    const r = await db.execute(
      `SELECT
         COUNT(*) AS total,
         COUNT(DISTINCT COALESCE(category, '')) AS categories
       FROM documents`
    );
    const row = r.rows[0];
    return {
      total: Number(row.total),
      categories: Number(row.categories ?? 0),
    };
  },
  ["documents:count"],
  { tags: ["documents"], revalidate: CACHE_TTL }
);

export const getDocument = unstable_cache(
  async (id: number): Promise<Document | null> => {
    const db = await getDb();
    const res = await db.execute({
      sql: "SELECT * FROM documents WHERE id = ? LIMIT 1",
      args: [id],
    });
    if (res.rows.length === 0) return null;
    return rowToDocument(res.rows[0] as Record<string, unknown>);
  },
  ["documents:byId"],
  { tags: ["documents"], revalidate: CACHE_TTL }
);

export async function createDocument(data: {
  title: string;
  description?: string | null;
  category?: string | null;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime?: string | null;
  position?: number;
}): Promise<number> {
  const db = await getDb();
  const res = await db.execute({
    sql: `INSERT INTO documents
            (title, description, category, file_url, file_name, file_size, mime, position)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.title,
      data.description ?? null,
      data.category ?? null,
      data.file_url,
      data.file_name,
      data.file_size ?? 0,
      data.mime ?? null,
      data.position ?? 0,
    ],
  });
  return Number(res.lastInsertRowid);
}

export async function updateDocument(
  id: number,
  data: Partial<{
    title: string;
    description: string | null;
    category: string | null;
    file_url: string;
    file_name: string;
    file_size: number;
    mime: string | null;
    position: number;
  }>
): Promise<void> {
  const db = await getDb();
  const sets: string[] = ["updated_at = CURRENT_TIMESTAMP"];
  const args: (string | number | null)[] = [];

  const cols: (keyof typeof data)[] = [
    "title",
    "description",
    "category",
    "file_url",
    "file_name",
    "file_size",
    "mime",
    "position",
  ];
  for (const col of cols) {
    if (data[col] !== undefined) {
      sets.push(`${col} = ?`);
      args.push(data[col] as string | number | null);
    }
  }

  args.push(id);
  await db.execute({
    sql: `UPDATE documents SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function deleteDocument(id: number): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM documents WHERE id = ?", args: [id] });
}
