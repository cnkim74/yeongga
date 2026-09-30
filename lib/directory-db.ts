import "server-only";
import { unstable_cache } from "next/cache";
import { getDb } from "./db";
import type { DirectoryEntry } from "./directory-parse";

export type DirectoryMember = DirectoryEntry & { id: number };

export const DIRECTORY_TAG = "directory";
const TAG = DIRECTORY_TAG;
const TTL = 3600;

export const listDirectory = unstable_cache(
  async (): Promise<DirectoryMember[]> => {
    const db = await getDb();
    const r = await db.execute(
      `SELECT id, name, hanja, position, career, page_no
         FROM directory_members ORDER BY sort_key, id`,
    );
    return r.rows.map((row) => {
      const o = row as unknown as Record<string, unknown>;
      return {
        id: Number(o.id),
        name: String(o.name ?? ""),
        hanja: String(o.hanja ?? ""),
        position: String(o.position ?? ""),
        career: String(o.career ?? ""),
        pageNo: Number(o.page_no ?? 0),
      };
    });
  },
  ["directory:list", "v1"],
  { tags: [TAG], revalidate: TTL },
);

export const getDirectoryMeta = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const db = await getDb();
    const r = await db.execute("SELECT key, value FROM directory_meta");
    const out: Record<string, string> = {};
    for (const row of r.rows) {
      const o = row as unknown as Record<string, unknown>;
      out[String(o.key)] = String(o.value);
    }
    return out;
  },
  ["directory:meta", "v1"],
  { tags: [TAG], revalidate: TTL },
);

/** 수첩을 새로 올릴 때 전체를 갈아 끼운다 */
export async function replaceDirectory(
  entries: DirectoryEntry[],
  meta: { label: string },
): Promise<number> {
  const db = await getDb();
  await db.execute("DELETE FROM directory_members");
  const rows = entries.filter((e) => e.name);
  for (let i = 0; i < rows.length; i += 200) {
    await db.batch(
      rows.slice(i, i + 200).map((e) => ({
        sql: `INSERT INTO directory_members
                (name, hanja, position, career, page_no, sort_key)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [e.name, e.hanja, e.position, e.career, e.pageNo, e.name],
      })),
      "write",
    );
  }
  await db.batch(
    [
      { sql: "INSERT OR REPLACE INTO directory_meta (key, value) VALUES ('label', ?)", args: [meta.label] },
      { sql: "INSERT OR REPLACE INTO directory_meta (key, value) VALUES ('count', ?)", args: [String(rows.length)] },
      { sql: "INSERT OR REPLACE INTO directory_meta (key, value) VALUES ('updated_at', ?)", args: [new Date().toISOString()] },
    ] as { sql: string; args: (string | number)[] }[],
    "write",
  );
  return rows.length;
}

/** 이름 첫 글자의 초성 */
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ".split("");
const CHO_GROUP: Record<string, string> = {
  ㄲ: "ㄱ", ㄸ: "ㄷ", ㅃ: "ㅂ", ㅆ: "ㅅ", ㅉ: "ㅈ",
};

export function initialOf(name: string): string {
  const c = name.charCodeAt(0);
  if (c < 0xac00 || c > 0xd7a3) return "기타";
  const cho = CHO[Math.floor((c - 0xac00) / 588)];
  return CHO_GROUP[cho] ?? cho;
}

export const INITIALS = [
  "ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

export const countDirectory = unstable_cache(
  async (): Promise<number> => {
    const db = await getDb();
    const r = await db.execute("SELECT COUNT(*) AS n FROM directory_members");
    const o = r.rows[0] as unknown as Record<string, unknown>;
    return Number(o?.n ?? 0);
  },
  ["directory:count", "v1"],
  { tags: [TAG], revalidate: TTL },
);
