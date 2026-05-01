import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 디버그용 — 회원 테이블의 raw 데이터를 그대로 노출 (admin 전용).
// avatar_url이 DB에 실제로 어떻게 들어갔는지 확인용.
export async function GET() {
  await requireAdmin();
  const db = await getDb();
  const r = await db.execute(
    `SELECT id, username, name, email, avatar_url, auth_provider, provider_id,
            role, joined_at, created_at,
            LENGTH(avatar_url) as avatar_url_len,
            LENGTH(password_hash) as password_hash_len
     FROM users ORDER BY id`
  );

  const cols = await db.execute("PRAGMA table_info(users)");

  return NextResponse.json({
    schema: cols.rows.map((r) => ({
      name: r.name,
      type: r.type,
      notnull: r.notnull,
      dflt_value: r.dflt_value,
    })),
    users: r.rows,
  });
}
