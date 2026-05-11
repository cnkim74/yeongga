import "server-only";
import { getDb } from "./db";
import type {
  AttributionMode,
  Submission,
  SubmissionCategory,
  SubmissionStatus,
} from "./submissions-types";

// 공용 타입·라벨은 ./submissions-types 에서 re-export
// (client component 가 server-only 가드를 우회하지 않도록 분리)
export {
  CATEGORY_LABELS,
  STATUS_LABELS,
  ATTRIBUTION_LABELS,
} from "./submissions-types";
export type {
  Submission,
  SubmissionCategory,
  SubmissionStatus,
  AttributionMode,
} from "./submissions-types";

function rowToSubmission(row: Record<string, unknown>): Submission {
  const cat = String(row.category);
  const category: SubmissionCategory =
    cat === "photo" || cat === "document" || cat === "memoir" || cat === "video"
      ? cat
      : "other";
  const st = String(row.status);
  const status: SubmissionStatus =
    st === "reviewing" || st === "done" || st === "archived" ? st : "new";
  const am = String(row.attribution_mode ?? "name");
  const attribution_mode: AttributionMode =
    am === "anon" || am === "anon_era" ? am : "name";

  return {
    id: Number(row.id),
    name: String(row.name),
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    category,
    message: String(row.message),
    file_url: row.file_url ? String(row.file_url) : null,
    file_name: row.file_name ? String(row.file_name) : null,
    status,
    ip_hash: row.ip_hash ? String(row.ip_hash) : null,
    user_agent: row.user_agent ? String(row.user_agent) : null,
    admin_note: row.admin_note ? String(row.admin_note) : null,
    consent_at: row.consent_at ? String(row.consent_at) : null,
    attribution_mode,
    others_consent: Number(row.others_consent ?? 0) === 1,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function createSubmission(data: {
  name: string;
  email?: string | null;
  phone?: string | null;
  category: SubmissionCategory;
  message: string;
  file_url?: string | null;
  file_name?: string | null;
  ip_hash?: string | null;
  user_agent?: string | null;
  attribution_mode?: AttributionMode;
  others_consent?: boolean;
  /** 동의 시각 — 미지정 시 현재 시각 사용 */
  consent_at?: string;
}): Promise<number> {
  const db = await getDb();
  const r = await db.execute({
    sql: `INSERT INTO submissions
          (name, email, phone, category, message, file_url, file_name, ip_hash, user_agent,
           consent_at, attribution_mode, others_consent)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.name,
      data.email ?? null,
      data.phone ?? null,
      data.category,
      data.message,
      data.file_url ?? null,
      data.file_name ?? null,
      data.ip_hash ?? null,
      data.user_agent ?? null,
      data.consent_at ?? new Date().toISOString(),
      data.attribution_mode ?? "name",
      data.others_consent ? 1 : 0,
    ],
  });
  return Number(r.lastInsertRowid);
}

export async function listSubmissions(): Promise<Submission[]> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT * FROM submissions ORDER BY
      CASE status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 WHEN 'done' THEN 2 ELSE 3 END,
      created_at DESC`
  );
  return r.rows.map((row) => rowToSubmission(row as unknown as Record<string, unknown>));
}

export async function getSubmission(id: number): Promise<Submission | null> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT * FROM submissions WHERE id = ?`,
    args: [id],
  });
  return r.rows[0]
    ? rowToSubmission(r.rows[0] as unknown as Record<string, unknown>)
    : null;
}

export async function updateSubmissionStatus(
  id: number,
  status: SubmissionStatus,
  adminNote?: string | null
): Promise<void> {
  const db = await getDb();
  const sets: string[] = ["status = ?", "updated_at = CURRENT_TIMESTAMP"];
  const args: (string | number | null)[] = [status];
  if (adminNote !== undefined) {
    sets.push("admin_note = ?");
    args.push(adminNote);
  }
  args.push(id);
  await db.execute({
    sql: `UPDATE submissions SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function deleteSubmission(id: number): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: `DELETE FROM submissions WHERE id = ?`, args: [id] });
}

/** 신규 접수 개수 — 어드민 홈 뱃지용 */
export async function countNewSubmissions(): Promise<number> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT COUNT(*) AS n FROM submissions WHERE status = 'new'`
  );
  return Number(r.rows[0].n);
}
