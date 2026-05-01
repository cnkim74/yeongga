import "server-only";
import * as XLSX from "xlsx";
import { createUser } from "./users-db";

export type ParsedRow = {
  rowNumber: number; // 엑셀 행 번호 (헤더 제외, 1부터)
  raw: Record<string, string>; // 원본 칸별 값
  data: {
    name: string;
    username: string;
    email: string | null;
    role: "admin" | "member";
    joined_at: string | null;
    note: string | null;
    password: string | null;
  };
  errors: string[];
};

export type ImportResult = {
  created: number;
  failed: number;
  errors: { rowNumber: number; name: string; error: string }[];
};

const HEADERS: { keys: string[]; field: keyof ParsedRow["data"] }[] = [
  { keys: ["이름", "name"], field: "name" },
  { keys: ["아이디", "username", "ID"], field: "username" },
  { keys: ["이메일", "email", "Email", "이-메일", "메일"], field: "email" },
  { keys: ["권한", "role", "Role"], field: "role" },
  { keys: ["가입일", "joined_at", "joined", "가입날짜"], field: "joined_at" },
  { keys: ["비밀번호", "password", "Password", "암호"], field: "password" },
  { keys: ["메모", "note", "비고", "Note"], field: "note" },
];

const SLUG_USERNAME_RE = /^[a-z0-9][a-z0-9_.-]*$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeHeader(s: string): string {
  return String(s ?? "").trim().replace(/\s+/g, "").toLowerCase();
}

function mapHeaderRow(headerRow: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = 0; i < headerRow.length; i++) {
    const norm = normalizeHeader(String(headerRow[i] ?? ""));
    for (const def of HEADERS) {
      if (def.keys.some((k) => normalizeHeader(k) === norm)) {
        map[def.field] = i;
        break;
      }
    }
  }
  return map;
}

function normalizeRoleValue(v: string): "admin" | "member" {
  const s = v.trim().toLowerCase();
  if (s === "admin" || s === "관리자" || s === "운영자") return "admin";
  return "member";
}

function normalizeDate(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  if (ISO_DATE_RE.test(s)) return s;
  // YYYY/MM/DD, YYYY.MM.DD → YYYY-MM-DD
  const m = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (m) {
    const yyyy = m[1];
    const mm = String(parseInt(m[2], 10)).padStart(2, "0");
    const dd = String(parseInt(m[3], 10)).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return null; // 파싱 못 했으면 null (오류는 따로 알림 안 함, optional 필드)
}

export async function parseExcelFile(file: File): Promise<ParsedRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  if (rows.length === 0) return [];

  const headerRow = rows[0];
  const colMap = mapHeaderRow(headerRow);

  const parsed: ParsedRow[] = [];
  const seenUsernames = new Set<string>();
  const seenEmails = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => String(c ?? "").trim() === "")) continue; // 빈 줄 skip

    const raw: Record<string, string> = {};
    for (let i = 0; i < headerRow.length; i++) {
      raw[String(headerRow[i] ?? `col${i}`)] = String(row[i] ?? "").trim();
    }

    const get = (f: keyof ParsedRow["data"]) =>
      colMap[f] !== undefined ? String(row[colMap[f]] ?? "").trim() : "";

    const name = get("name");
    const username = get("username");
    const emailRaw = get("email");
    const email = emailRaw ? emailRaw.toLowerCase() : null;
    const role = normalizeRoleValue(get("role"));
    const joined_at = normalizeDate(get("joined_at"));
    const note = get("note") || null;
    const password = get("password") || null;

    const errors: string[] = [];
    if (!name) errors.push("이름이 비어 있음");
    if (!username) errors.push("아이디가 비어 있음");
    else if (!SLUG_USERNAME_RE.test(username)) {
      errors.push("아이디는 영문 소문자·숫자·-_. 만 사용 가능 (예: cnkim74)");
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("이메일 형식이 올바르지 않음");
    }
    if (username && seenUsernames.has(username)) {
      errors.push(`엑셀 안에서 아이디 "${username}" 가 중복됨`);
    }
    if (email && seenEmails.has(email)) {
      errors.push(`엑셀 안에서 이메일 "${email}" 가 중복됨`);
    }
    if (username) seenUsernames.add(username);
    if (email) seenEmails.add(email);

    parsed.push({
      rowNumber: r,
      raw,
      data: {
        name,
        username,
        email,
        role,
        joined_at,
        note,
        password,
      },
      errors,
    });
  }

  return parsed;
}

export async function commitRows(rows: ParsedRow[]): Promise<ImportResult> {
  const result: ImportResult = { created: 0, failed: 0, errors: [] };
  for (const row of rows) {
    if (row.errors.length > 0) continue; // skip rows with parse errors
    const r = await createUser({
      username: row.data.username,
      name: row.data.name,
      email: row.data.email,
      password: row.data.password,
      role: row.data.role,
      joined_at: row.data.joined_at,
      note: row.data.note,
    });
    if (r.ok) {
      result.created += 1;
    } else {
      result.failed += 1;
      result.errors.push({
        rowNumber: row.rowNumber,
        name: row.data.name || row.data.username,
        error: r.error,
      });
    }
  }
  return result;
}
