import "server-only";
import { getDb } from "./db";

export type PostAttachment = {
  id: number;
  post_id: number;
  file_url: string;
  file_name: string;
  file_size: number;
  mime: string | null;
  position: number;
};

export type Post = {
  id: number;
  title: string;
  body: string;
  author_id: number | null;
  author_name: string;
  pinned: boolean;
  views: number;
  created_at: string;
  updated_at: string;
};

export type PostWithMeta = Post & { attachment_count: number };
export type PostDetail = Post & { attachments: PostAttachment[] };

function rowToPost(row: Record<string, unknown>): Post {
  return {
    id: Number(row.id),
    title: String(row.title),
    body: String(row.body ?? ""),
    author_id: row.author_id != null ? Number(row.author_id) : null,
    author_name: String(row.author_name),
    pinned: Number(row.pinned) === 1,
    views: Number(row.views ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function rowToAttachment(row: Record<string, unknown>): PostAttachment {
  return {
    id: Number(row.id),
    post_id: Number(row.post_id),
    file_url: String(row.file_url),
    file_name: String(row.file_name),
    file_size: Number(row.file_size ?? 0),
    mime: row.mime != null ? String(row.mime) : null,
    position: Number(row.position),
  };
}

/** 목록 — 공지(pinned) 먼저, 그다음 최신순. 첨부 개수 포함. */
export async function listPosts(): Promise<PostWithMeta[]> {
  const db = await getDb();
  const res = await db.execute(
    `SELECT p.*,
            (SELECT COUNT(*) FROM post_attachments a WHERE a.post_id = p.id) AS attachment_count
     FROM posts p
     ORDER BY p.pinned DESC, p.id DESC`
  );
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return { ...rowToPost(row), attachment_count: Number(row.attachment_count ?? 0) };
  });
}

export async function getPost(id: number): Promise<PostDetail | null> {
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT * FROM posts WHERE id = ? LIMIT 1",
    args: [id],
  });
  if (res.rows.length === 0) return null;
  const post = rowToPost(res.rows[0] as Record<string, unknown>);
  const att = await db.execute({
    sql: "SELECT * FROM post_attachments WHERE post_id = ? ORDER BY position ASC, id ASC",
    args: [id],
  });
  return {
    ...post,
    attachments: att.rows.map((r) => rowToAttachment(r as Record<string, unknown>)),
  };
}

export async function incrementViews(id: number): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE posts SET views = views + 1 WHERE id = ?",
    args: [id],
  });
}

export type AttachmentInput = {
  file_url: string;
  file_name: string;
  file_size?: number;
  mime?: string | null;
};

export async function createPost(data: {
  title: string;
  body: string;
  author_id: number | null;
  author_name: string;
  pinned?: boolean;
  attachments?: AttachmentInput[];
}): Promise<number> {
  const db = await getDb();
  const res = await db.execute({
    sql: `INSERT INTO posts (title, body, author_id, author_name, pinned)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      data.title,
      data.body,
      data.author_id,
      data.author_name,
      data.pinned ? 1 : 0,
    ],
  });
  const postId = Number(res.lastInsertRowid);
  await replaceAttachments(postId, data.attachments ?? []);
  return postId;
}

export async function updatePost(
  id: number,
  data: {
    title: string;
    body: string;
    pinned?: boolean;
    attachments?: AttachmentInput[];
  }
): Promise<void> {
  const db = await getDb();
  const sets = ["title = ?", "body = ?", "updated_at = CURRENT_TIMESTAMP"];
  const args: (string | number | null)[] = [data.title, data.body];
  if (data.pinned !== undefined) {
    sets.push("pinned = ?");
    args.push(data.pinned ? 1 : 0);
  }
  args.push(id);
  await db.execute({ sql: `UPDATE posts SET ${sets.join(", ")} WHERE id = ?`, args });
  if (data.attachments) await replaceAttachments(id, data.attachments);
}

/** 첨부 목록을 통째로 교체 (간단·확실). */
async function replaceAttachments(postId: number, attachments: AttachmentInput[]) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM post_attachments WHERE post_id = ?", args: [postId] });
  for (let i = 0; i < attachments.length; i++) {
    const a = attachments[i];
    await db.execute({
      sql: `INSERT INTO post_attachments (post_id, file_url, file_name, file_size, mime, position)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [postId, a.file_url, a.file_name, a.file_size ?? 0, a.mime ?? null, i],
    });
  }
}

export async function setPinned(id: number, pinned: boolean): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE posts SET pinned = ? WHERE id = ?",
    args: [pinned ? 1 : 0, id],
  });
}

/** 게시글 삭제 — 첨부 메타도 함께. 첨부 파일 URL 목록을 반환(스토리지 정리용). */
export async function deletePost(id: number): Promise<string[]> {
  const db = await getDb();
  const att = await db.execute({
    sql: "SELECT file_url FROM post_attachments WHERE post_id = ?",
    args: [id],
  });
  const urls = att.rows.map((r) => String((r as Record<string, unknown>).file_url));
  await db.execute({ sql: "DELETE FROM post_attachments WHERE post_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM posts WHERE id = ?", args: [id] });
  return urls;
}
