import "server-only";
import { getDb } from "./db";
import { hashPassword, verifyPassword } from "./passwords";

export type User = {
  id: number;
  username: string;
  name: string;
  role: "admin" | "member";
  joined_at: string | null;
  note: string | null;
  created_at: string;
};

type UserRow = User & { password_hash: string };

export function authenticate(username: string, password: string): User | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, username, name, password_hash, role, joined_at, note, created_at
       FROM users WHERE username = ?`
    )
    .get(username) as UserRow | undefined;

  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  const { password_hash: _ph, ...user } = row;
  return user;
}

export function listUsers(): User[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, username, name, role, joined_at, note, created_at
       FROM users ORDER BY role DESC, joined_at ASC, id ASC`
    )
    .all() as User[];
}

export function getUser(id: number): User | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, username, name, role, joined_at, note, created_at
       FROM users WHERE id = ?`
    )
    .get(id) as User | undefined;
  return row ?? null;
}

export function createUser(input: {
  username: string;
  name: string;
  password: string;
  role: "admin" | "member";
  joined_at?: string | null;
  note?: string | null;
}): { ok: true; id: number } | { ok: false; error: string } {
  const db = getDb();
  const exists = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(input.username);
  if (exists) return { ok: false, error: "이미 사용 중인 아이디입니다." };

  const result = db
    .prepare(
      `INSERT INTO users (username, name, password_hash, role, joined_at, note)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.username,
      input.name,
      hashPassword(input.password),
      input.role,
      input.joined_at ?? null,
      input.note ?? null
    );
  return { ok: true, id: Number(result.lastInsertRowid) };
}

export function updateUser(
  id: number,
  input: {
    name: string;
    role: "admin" | "member";
    joined_at?: string | null;
    note?: string | null;
    newPassword?: string | null;
  }
) {
  const db = getDb();
  if (input.newPassword) {
    db.prepare(
      `UPDATE users SET name=?, role=?, joined_at=?, note=?, password_hash=? WHERE id=?`
    ).run(
      input.name,
      input.role,
      input.joined_at ?? null,
      input.note ?? null,
      hashPassword(input.newPassword),
      id
    );
  } else {
    db.prepare(
      `UPDATE users SET name=?, role=?, joined_at=?, note=? WHERE id=?`
    ).run(
      input.name,
      input.role,
      input.joined_at ?? null,
      input.note ?? null,
      id
    );
  }
}

export function deleteUser(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

export function countByRole() {
  const db = getDb();
  const rows = db
    .prepare(`SELECT role, COUNT(*) as n FROM users GROUP BY role`)
    .all() as { role: string; n: number }[];
  return Object.fromEntries(rows.map((r) => [r.role, r.n])) as Record<
    "admin" | "member",
    number
  >;
}
