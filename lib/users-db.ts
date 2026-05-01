import "server-only";
import { randomBytes } from "node:crypto";
import { getDb } from "./db";
import { hashPassword, verifyPassword } from "./passwords";

export type User = {
  id: number;
  username: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  auth_provider: "local" | "google" | "naver";
  provider_id: string | null;
  role: "admin" | "member";
  joined_at: string | null;
  note: string | null;
  created_at: string;
};

type UserRow = User & { password_hash: string };

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    username: String(row.username),
    name: String(row.name),
    email: row.email == null ? null : String(row.email),
    avatar_url: row.avatar_url == null ? null : String(row.avatar_url),
    auth_provider: (row.auth_provider as User["auth_provider"]) ?? "local",
    provider_id: row.provider_id == null ? null : String(row.provider_id),
    role: row.role as "admin" | "member",
    joined_at: row.joined_at == null ? null : String(row.joined_at),
    note: row.note == null ? null : String(row.note),
    created_at: String(row.created_at),
  };
}

export async function authenticate(
  username: string,
  password: string
): Promise<User | null> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT id, username, name, email, avatar_url, auth_provider, provider_id, password_hash, role, joined_at, note, created_at
          FROM users WHERE username = ?`,
    args: [username],
  });
  const row = r.rows[0] as unknown as UserRow | undefined;
  if (!row) return null;
  if (!verifyPassword(password, String(row.password_hash))) return null;
  return rowToUser(row as unknown as Record<string, unknown>);
}

export async function listUsers(): Promise<User[]> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT id, username, name, email, avatar_url, auth_provider, provider_id, role, joined_at, note, created_at
     FROM users ORDER BY role DESC, joined_at ASC, id ASC`
  );
  return r.rows.map((r) => rowToUser(r as unknown as Record<string, unknown>));
}

export async function getUser(id: number): Promise<User | null> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT id, username, name, email, avatar_url, auth_provider, provider_id, role, joined_at, note, created_at
          FROM users WHERE id = ?`,
    args: [id],
  });
  const row = r.rows[0];
  return row ? rowToUser(row as unknown as Record<string, unknown>) : null;
}

export async function createUser(input: {
  username: string;
  name: string;
  email?: string | null;
  password?: string | null; // 비워두면 무작위 — Google 전용 계정용
  role: "admin" | "member";
  joined_at?: string | null;
  note?: string | null;
}): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const db = await getDb();
  const exists = await db.execute({
    sql: "SELECT id FROM users WHERE username = ?",
    args: [input.username],
  });
  if (exists.rows.length > 0)
    return { ok: false, error: "이미 사용 중인 아이디입니다." };

  if (input.email) {
    const emailDup = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [input.email],
    });
    if (emailDup.rows.length > 0)
      return { ok: false, error: "이미 등록된 이메일입니다." };
  }

  const passwordToHash = input.password || randomBytes(24).toString("hex");

  const r = await db.execute({
    sql: `INSERT INTO users (username, name, email, password_hash, role, joined_at, note)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.username,
      input.name,
      input.email ?? null,
      hashPassword(passwordToHash),
      input.role,
      input.joined_at ?? null,
      input.note ?? null,
    ],
  });
  return { ok: true, id: Number(r.lastInsertRowid) };
}

export async function updateUser(
  id: number,
  input: {
    name: string;
    email?: string | null;
    role: "admin" | "member";
    joined_at?: string | null;
    note?: string | null;
    newPassword?: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();

  if (input.email) {
    const emailDup = await db.execute({
      sql: "SELECT id FROM users WHERE email = ? AND id != ?",
      args: [input.email, id],
    });
    if (emailDup.rows.length > 0)
      return { ok: false, error: "이미 등록된 이메일입니다." };
  }

  if (input.newPassword) {
    await db.execute({
      sql: `UPDATE users SET name=?, email=?, role=?, joined_at=?, note=?, password_hash=? WHERE id=?`,
      args: [
        input.name,
        input.email ?? null,
        input.role,
        input.joined_at ?? null,
        input.note ?? null,
        hashPassword(input.newPassword),
        id,
      ],
    });
  } else {
    await db.execute({
      sql: `UPDATE users SET name=?, email=?, role=?, joined_at=?, note=? WHERE id=?`,
      args: [
        input.name,
        input.email ?? null,
        input.role,
        input.joined_at ?? null,
        input.note ?? null,
        id,
      ],
    });
  }
  return { ok: true };
}

export async function deleteUser(id: number) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM users WHERE id = ?", args: [id] });
}

// Google OAuth — provider_id 또는 email로 기존 회원을 찾아 연결.
// 미등록(매칭되는 회원 없음) 이면 null 반환 → 호출자가 거부 처리.
export async function findOrLinkGoogleUser(input: {
  googleId: string;
  email: string;
  picture?: string | null;
}): Promise<User | null> {
  const db = await getDb();

  let r = await db.execute({
    sql: `SELECT id FROM users WHERE auth_provider = 'google' AND provider_id = ? LIMIT 1`,
    args: [input.googleId],
  });

  if (r.rows.length === 0) {
    r = await db.execute({
      sql: `SELECT id FROM users WHERE email = ? LIMIT 1`,
      args: [input.email],
    });
  }

  if (r.rows.length === 0) return null;

  const id = Number(r.rows[0].id);

  await db.execute({
    sql: `UPDATE users
          SET auth_provider = 'google',
              provider_id = ?,
              email = ?,
              avatar_url = COALESCE(?, avatar_url)
          WHERE id = ?`,
    args: [input.googleId, input.email, input.picture ?? null, id],
  });

  return getUser(id);
}
