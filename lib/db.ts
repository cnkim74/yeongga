import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "./passwords";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "yeongga.db");

let _db: Database.Database | null = null;

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function init(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','member')),
      joined_at TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_path TEXT NOT NULL,
      kicker TEXT,
      title TEXT NOT NULL,
      excerpt TEXT,
      cta TEXT,
      href TEXT NOT NULL DEFAULT '/',
      position INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kicker TEXT,
      title TEXT NOT NULL,
      description TEXT,
      embed_url TEXT NOT NULL,
      provider TEXT,             -- 'youtube' | 'vimeo' | 'other'
      video_id TEXT,             -- 추출한 식별자
      thumbnail_url TEXT,        -- 자동 추정
      featured INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 시드: 관리자 계정 + 회원 샘플
  const userCount = db.prepare("SELECT COUNT(*) as n FROM users").get() as {
    n: number;
  };
  if (userCount.n === 0) {
    const adminUser = process.env.ADMIN_USERNAME ?? "admin";
    const adminPass = process.env.ADMIN_PASSWORD ?? "yeongga";
    const insert = db.prepare(
      `INSERT INTO users (username, name, password_hash, role, joined_at, note)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    insert.run(
      adminUser,
      "관리자",
      hashPassword(adminPass),
      "admin",
      "1998-10-12",
      "초기 관리자 계정 — 비밀번호를 반드시 변경하세요"
    );
    insert.run(
      "kim",
      "김영석",
      hashPassword("yeongga"),
      "member",
      "1998-10-12",
      "초대 회원 · 회장"
    );
    insert.run(
      "park",
      "박정자",
      hashPassword("yeongga"),
      "member",
      "1998-10-12",
      "서기"
    );
    insert.run(
      "lee",
      "이숙자",
      hashPassword("yeongga"),
      "member",
      "2003-04-05",
      ""
    );
    insert.run(
      "jeong",
      "정인규",
      hashPassword("yeongga"),
      "member",
      "2010-09-14",
      ""
    );
  }

  // 시드: 슬라이드 (현재 하드코딩과 동일)
  const slideCount = db.prepare("SELECT COUNT(*) as n FROM slides").get() as {
    n: number;
  };
  if (slideCount.n === 0) {
    const insert = db.prepare(
      `INSERT INTO slides (image_path, kicker, title, excerpt, cta, href, position, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    );
    insert.run(
      "/slides/cover-mountain.jpg",
      "卷頭言 · 권두언",
      "오래된 인연의\n새로운 기록",
      "스물여덟 해 동안 쌓아 온 영가회의 발자취를, 한 권의 매거진처럼 펼쳐 봅니다.",
      "회장의 인사 읽기",
      "/archive/yeon-gi/hoejang-insa",
      1
    );
    insert.run(
      "/slides/cover-sea.jpg",
      "이번 호 · 모임",
      "양평에 모인\n가을의 하루",
      "단풍이 한창이던 두물머리에서 열한 명이 모였습니다. 그날의 회의록과 이야기를 옮겨 적습니다.",
      "회의록 보기",
      "/archive/moim/2025-chu-moim",
      2
    );
    insert.run(
      "/slides/cover-lake.jpg",
      "사람 · 회원의 글",
      "멀리 있는\n너에게",
      "텃밭에서 거둔 가을 무, 그리고 부치지 못한 한 통의 편지. 회원들의 글을 한자리에 모았습니다.",
      "글 펼치기",
      "/archive/geul/oedongttal-pyeonji",
      3
    );
  }

  // 시드: 동영상 (영가회 정서에 맞을 만한 클래식한 영상 2편)
  const videoCount = db.prepare("SELECT COUNT(*) as n FROM videos").get() as {
    n: number;
  };
  if (videoCount.n === 0) {
    const insert = db.prepare(
      `INSERT INTO videos
        (kicker, title, description, embed_url, provider, video_id, thumbnail_url, featured, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    // 더미: 자연/한국 분위기 — 실제 운영 시 회원이 보낸 영상으로 교체
    const yt1 = parseEmbed("https://www.youtube.com/watch?v=2OEL4P1Rz04");
    insert.run(
      "이번 호 영상",
      "둘러앉은 자리 — 가을 모임 영상",
      "양평 두물머리 가을 모임에서 회원들이 둘러앉아 나눈 이야기를 짧게 묶었습니다.",
      yt1.embedUrl,
      yt1.provider,
      yt1.videoId,
      yt1.thumbnailUrl,
      1,
      1
    );
    const yt2 = parseEmbed("https://www.youtube.com/watch?v=jfKfPfyJRdk");
    insert.run(
      "회상 · 자료",
      "1998년 첫 모임 — 흑백 기록",
      "회의 시작이 된 가을 저녁의 흔적. 사진과 짧은 글을 영상으로 엮었습니다.",
      yt2.embedUrl,
      yt2.provider,
      yt2.videoId,
      yt2.thumbnailUrl,
      0,
      2
    );
  }
}

export function getDb(): Database.Database {
  if (_db) return _db;
  ensureDir(DATA_DIR);
  _db = new Database(DB_PATH);
  init(_db);
  return _db;
}

// ─── 임베드 URL 파서 ─────────────────────────────────────
export type ParsedEmbed = {
  embedUrl: string;
  provider: "youtube" | "vimeo" | "other";
  videoId: string | null;
  thumbnailUrl: string | null;
};

export function parseEmbed(input: string): ParsedEmbed {
  const url = input.trim();

  // YouTube
  const yt =
    url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) {
    const id = yt[1];
    return {
      embedUrl: `https://www.youtube.com/embed/${id}`,
      provider: "youtube",
      videoId: id,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }

  // Vimeo
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) {
    const id = vm[1];
    return {
      embedUrl: `https://player.vimeo.com/video/${id}`,
      provider: "vimeo",
      videoId: id,
      thumbnailUrl: null,
    };
  }

  return {
    embedUrl: url,
    provider: "other",
    videoId: null,
    thumbnailUrl: null,
  };
}
