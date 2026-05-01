import "server-only";
import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "./passwords";

let _client: Client | null = null;
let _initPromise: Promise<void> | null = null;

function makeClient(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url && url.startsWith("libsql://")) {
    return createClient({ url, authToken });
  }

  // 로컬 개발 — 파일 SQLite
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return createClient({ url: `file:${path.join(dataDir, "yeongga.db")}` });
}

async function init(client: Client) {
  await client.executeMultiple(`
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
      provider TEXT,
      video_id TEXT,
      thumbnail_url TEXT,
      featured INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 시드: 관리자 + 회원 샘플
  const userCount = (
    await client.execute("SELECT COUNT(*) as n FROM users")
  ).rows[0].n as number;

  if (userCount === 0) {
    const adminUser = process.env.ADMIN_USERNAME ?? "admin";
    const adminPass = process.env.ADMIN_PASSWORD ?? "yeongga";
    const insert = (
      username: string,
      name: string,
      pass: string,
      role: "admin" | "member",
      joined: string | null,
      note: string
    ) =>
      client.execute({
        sql: `INSERT INTO users (username, name, password_hash, role, joined_at, note)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [username, name, hashPassword(pass), role, joined, note],
      });

    await insert(
      adminUser,
      "관리자",
      adminPass,
      "admin",
      "1998-10-12",
      "초기 관리자 계정 — 비밀번호를 반드시 변경하세요"
    );
    await insert("kim", "김영석", "yeongga", "member", "1998-10-12", "초대 회원 · 회장");
    await insert("park", "박정자", "yeongga", "member", "1998-10-12", "서기");
    await insert("lee", "이숙자", "yeongga", "member", "2003-04-05", "");
    await insert("jeong", "정인규", "yeongga", "member", "2010-09-14", "");
  }

  // 시드: 슬라이드
  const slideCount = (
    await client.execute("SELECT COUNT(*) as n FROM slides")
  ).rows[0].n as number;

  if (slideCount === 0) {
    const insert = (
      image: string,
      kicker: string,
      title: string,
      excerpt: string,
      cta: string,
      href: string,
      pos: number
    ) =>
      client.execute({
        sql: `INSERT INTO slides (image_path, kicker, title, excerpt, cta, href, position, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [image, kicker, title, excerpt, cta, href, pos],
      });

    await insert(
      "/slides/cover-mountain.jpg",
      "卷頭言 · 권두언",
      "오래된 인연의\n새로운 기록",
      "스물여덟 해 동안 쌓아 온 영가회의 발자취를, 한 권의 매거진처럼 펼쳐 봅니다.",
      "회장의 인사 읽기",
      "/archive/yeon-gi/hoejang-insa",
      1
    );
    await insert(
      "/slides/cover-sea.jpg",
      "이번 호 · 모임",
      "양평에 모인\n가을의 하루",
      "단풍이 한창이던 두물머리에서 열한 명이 모였습니다. 그날의 회의록과 이야기를 옮겨 적습니다.",
      "회의록 보기",
      "/archive/moim/2025-chu-moim",
      2
    );
    await insert(
      "/slides/cover-lake.jpg",
      "사람 · 회원의 글",
      "멀리 있는\n너에게",
      "텃밭에서 거둔 가을 무, 그리고 부치지 못한 한 통의 편지. 회원들의 글을 한자리에 모았습니다.",
      "글 펼치기",
      "/archive/geul/oedongttal-pyeonji",
      3
    );
  }

  // 시드: 동영상
  const videoCount = (
    await client.execute("SELECT COUNT(*) as n FROM videos")
  ).rows[0].n as number;

  if (videoCount === 0) {
    const insert = (
      kicker: string,
      title: string,
      desc: string,
      url: string,
      featured: 0 | 1,
      pos: number
    ) => {
      const p = parseEmbed(url);
      return client.execute({
        sql: `INSERT INTO videos
              (kicker, title, description, embed_url, provider, video_id, thumbnail_url, featured, position)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          kicker,
          title,
          desc,
          p.embedUrl,
          p.provider,
          p.videoId,
          p.thumbnailUrl,
          featured,
          pos,
        ],
      });
    };

    await insert(
      "이번 호 영상",
      "둘러앉은 자리 — 가을 모임 영상",
      "양평 두물머리 가을 모임에서 회원들이 둘러앉아 나눈 이야기를 짧게 묶었습니다.",
      "https://www.youtube.com/watch?v=2OEL4P1Rz04",
      1,
      1
    );
    await insert(
      "회상 · 자료",
      "1998년 첫 모임 — 흑백 기록",
      "회의 시작이 된 가을 저녁의 흔적. 사진과 짧은 글을 영상으로 엮었습니다.",
      "https://www.youtube.com/watch?v=jfKfPfyJRdk",
      0,
      2
    );
  }
}

export async function getDb(): Promise<Client> {
  if (_client) {
    if (_initPromise) await _initPromise;
    return _client;
  }
  _client = makeClient();
  _initPromise = init(_client);
  await _initPromise;
  return _client;
}

// ─── 임베드 URL 파서 ────────────────────────────
export type ParsedEmbed = {
  embedUrl: string;
  provider: "youtube" | "vimeo" | "other";
  videoId: string | null;
  thumbnailUrl: string | null;
};

export function parseEmbed(input: string): ParsedEmbed {
  const url = input.trim();
  const yt = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/
  );
  if (yt) {
    const id = yt[1];
    return {
      embedUrl: `https://www.youtube.com/embed/${id}`,
      provider: "youtube",
      videoId: id,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }
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
