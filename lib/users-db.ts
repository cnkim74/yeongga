import "server-only";
import { randomBytes } from "node:crypto";
import { unstable_cache } from "next/cache";
import { getDb } from "./db";
import { hashPassword, verifyPassword } from "./passwords";

/**
 * 저자 이름 → 아바타 URL 맵 (아바타 있는 사용자만).
 * 공개 글/아카이브 페이지가 저자 아바타를 찾을 때 쓰는 캐시 조회.
 * 예전엔 페이지마다 listUsers()로 전체 회원을 스캔해 Turso 읽기 폭증의 한 원인이었음.
 */
export const listAuthorAvatars = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const db = await getDb();
    const r = await db.execute(
      "SELECT name, avatar_url FROM users WHERE avatar_url IS NOT NULL AND avatar_url != ''"
    );
    const map: Record<string, string> = {};
    for (const row of r.rows) {
      const rec = row as unknown as Record<string, unknown>;
      if (rec.name != null && rec.avatar_url != null) {
        map[String(rec.name)] = String(rec.avatar_url);
      }
    }
    return map;
  },
  ["users:authorAvatars"],
  { tags: ["members"], revalidate: 1800 }
);

export type User = {
  id: number;
  username: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  auth_provider: "local" | "google" | "naver";
  provider_id: string | null;
  role: "admin" | "member";
  status: "pending" | "approved";
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
    status: row.status === "pending" ? "pending" : "approved",
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
  // 아이디(username) 또는 이메일로 로그인 허용
  const ident = username.trim();
  const r = await db.execute({
    sql: `SELECT id, username, name, email, avatar_url, auth_provider, provider_id, password_hash, role, status, joined_at, note, created_at
          FROM users
          WHERE username = ? OR LOWER(TRIM(email)) = LOWER(TRIM(?))
          LIMIT 1`,
    args: [ident, ident],
  });
  const row = r.rows[0] as unknown as UserRow | undefined;
  if (!row) return null;
  if (!verifyPassword(password, String(row.password_hash))) return null;
  return rowToUser(row as unknown as Record<string, unknown>);
}

export async function listUsers(): Promise<User[]> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT id, username, name, email, avatar_url, auth_provider, provider_id, role, status, joined_at, note, created_at
     FROM users ORDER BY role DESC, joined_at ASC, id ASC`
  );
  return r.rows.map((r) => rowToUser(r as unknown as Record<string, unknown>));
}

/** 어드민 카드용 — 전체 행 로드 없이 카운트만 */
export async function countUsers(): Promise<{ total: number; admins: number }> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins
     FROM users`
  );
  const row = r.rows[0];
  return { total: Number(row.total), admins: Number(row.admins ?? 0) };
}

/** 어드민 홈 "최근 회원" 6명 — 풀 리스트 안 가져옴 */
export async function listRecentUsers(limit = 6): Promise<User[]> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT id, username, name, email, avatar_url, auth_provider, provider_id, role, status, joined_at, note, created_at
          FROM users ORDER BY role DESC, joined_at ASC, id ASC LIMIT ?`,
    args: [limit],
  });
  return r.rows.map((r) => rowToUser(r as unknown as Record<string, unknown>));
}

export async function getUser(id: number): Promise<User | null> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT id, username, name, email, avatar_url, auth_provider, provider_id, role, status, joined_at, note, created_at
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
  avatar_url?: string | null;
  password?: string | null; // 비워두면 무작위 — Google 전용 계정용
  role: "admin" | "member";
  status?: "pending" | "approved";
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
    sql: `INSERT INTO users (username, name, email, avatar_url, password_hash, role, status, joined_at, note)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.username,
      input.name,
      input.email ?? null,
      input.avatar_url ?? null,
      hashPassword(passwordToHash),
      input.role,
      input.status ?? "approved",
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
    avatar_url?: string | null;
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
      sql: `UPDATE users SET name=?, email=?, avatar_url=?, role=?, joined_at=?, note=?, password_hash=? WHERE id=?`,
      args: [
        input.name,
        input.email ?? null,
        input.avatar_url ?? null,
        input.role,
        input.joined_at ?? null,
        input.note ?? null,
        hashPassword(input.newPassword),
        id,
      ],
    });
  } else {
    await db.execute({
      sql: `UPDATE users SET name=?, email=?, avatar_url=?, role=?, joined_at=?, note=? WHERE id=?`,
      args: [
        input.name,
        input.email ?? null,
        input.avatar_url ?? null,
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
// 매칭되는 회원이 없으면 'pending'(승인 대기) 회원으로 신규 생성한다.
export async function findOrLinkGoogleUser(input: {
  googleId: string;
  email: string;
  name?: string | null;
  picture?: string | null;
}): Promise<User | null> {
  const db = await getDb();
  const email = input.email.trim().toLowerCase();

  let r = await db.execute({
    sql: `SELECT id FROM users WHERE auth_provider = 'google' AND provider_id = ? LIMIT 1`,
    args: [input.googleId],
  });

  if (r.rows.length === 0) {
    // 대소문자 무시하고 비교 (DB에 대문자 섞여 있어도 매칭되도록)
    r = await db.execute({
      sql: `SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1`,
      args: [email],
    });
  }

  // 기존 회원 — 구글 연결 정보 갱신 후 반환
  if (r.rows.length > 0) {
    const id = Number(r.rows[0].id);
    await db.execute({
      sql: `UPDATE users
            SET auth_provider = 'google',
                provider_id = ?,
                email = ?,
                avatar_url = COALESCE(?, avatar_url)
            WHERE id = ?`,
      args: [input.googleId, email, input.picture ?? null, id],
    });
    return getUser(id);
  }

  // 신규 — 승인 대기(pending) 회원으로 생성
  const username = await uniqueUsername(db, email);
  const ins = await db.execute({
    sql: `INSERT INTO users
            (username, name, email, avatar_url, password_hash, role, status, auth_provider, provider_id, joined_at)
          VALUES (?, ?, ?, ?, ?, 'member', 'pending', 'google', ?, ?)`,
    args: [
      username,
      (input.name && input.name.trim()) || email.split("@")[0],
      email,
      input.picture ?? null,
      hashPassword(randomBytes(24).toString("hex")),
      input.googleId,
      new Date().toISOString().slice(0, 10),
    ],
  });
  return getUser(Number(ins.lastInsertRowid));
}

/** username 후보가 비어있지 않고 유일하도록 보정 */
async function uniqueUsername(
  db: Awaited<ReturnType<typeof getDb>>,
  base: string
): Promise<string> {
  let candidate = base || `user-${randomBytes(3).toString("hex")}`;
  let n = 2;
  // 최대 몇 번만 시도 (충돌은 사실상 없음)
  for (let i = 0; i < 50; i++) {
    const dup = await db.execute({
      sql: "SELECT 1 FROM users WHERE username = ? LIMIT 1",
      args: [candidate],
    });
    if (dup.rows.length === 0) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
  return `${base}-${randomBytes(4).toString("hex")}`;
}

/** 승인 대기 중인 회원 목록 (신청 최신순) */
export async function listPendingUsers(): Promise<User[]> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT id, username, name, email, avatar_url, auth_provider, provider_id, role, status, joined_at, note, created_at
     FROM users WHERE status = 'pending' ORDER BY id DESC`
  );
  return r.rows.map((r) => rowToUser(r as unknown as Record<string, unknown>));
}

export async function approveUser(id: number): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE users SET status = 'approved' WHERE id = ?",
    args: [id],
  });
}
