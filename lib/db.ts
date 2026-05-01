import "server-only";
import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { hashPassword } from "./passwords";
import { looksLikeHTML, renderMarkdown } from "./markdown";

let _client: Client | null = null;
let _initPromise: Promise<void> | null = null;

function makeClient(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url && url.startsWith("libsql://")) {
    return createClient({ url, authToken });
  }

  // 로컬 개발 — 파일 SQLite (file URI는 // 두 개 + 절대 경로)
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.resolve(dataDir, "yeongga.db");
  return createClient({ url: `file://${dbPath}` });
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

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      author TEXT,
      excerpt TEXT,
      cover TEXT,
      date TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','members-only')),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(chapter, slug)
    );
  `);

  // ─── 마이그레이션: users 테이블에 추가 칼럼 (이미 있으면 skip) ──
  const userCols = await client.execute("PRAGMA table_info(users)");
  const colNames = userCols.rows.map((r) => String(r.name));
  const addCol = async (name: string, def: string) => {
    if (!colNames.includes(name)) {
      await client.execute(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
    }
  };
  await addCol("email", "TEXT");
  await addCol("avatar_url", "TEXT");
  await addCol("auth_provider", "TEXT NOT NULL DEFAULT 'local'");
  await addCol("provider_id", "TEXT");

  // email + provider_id 에 인덱스 (OAuth 로 빠르게 매칭)
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_users_provider ON users(auth_provider, provider_id)`
  );

  // 시드: 관리자 + 회원 샘플
  const userCount = (
    await client.execute("SELECT COUNT(*) as n FROM users")
  ).rows[0].n as number;

  if (userCount === 0) {
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

    await insert("kim", "김영석", "yeongga", "member", "1998-10-12", "초대 회원 · 회장");
    await insert("park", "박정자", "yeongga", "member", "1998-10-12", "서기");
    await insert("lee", "이숙자", "yeongga", "member", "2003-04-05", "");
    await insert("jeong", "정인규", "yeongga", "member", "2010-09-14", "");
  }

  // ─── ensureAdmin: 매 부팅마다 admin 계정 보장 + email 동기화 ──
  // - cnkim74@gmail.com 을 admin 의 email 로 박아 두면, 추후 Google OAuth 가
  //   같은 이메일로 로그인해 들어올 때 자동으로 이 admin 계정과 연결됨.
  // - ADMIN_PASSWORD env 가 있으면 비밀번호도 그 값으로 동기화 (env 바꾸면 자동 리셋).
  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
  const adminEmail = process.env.ADMIN_EMAIL ?? "cnkim74@gmail.com";
  const adminPassEnv = process.env.ADMIN_PASSWORD;

  const adminRow = await client.execute({
    sql: "SELECT id FROM users WHERE username = ? OR email = ?",
    args: [adminUsername, adminEmail],
  });

  if (adminRow.rows.length === 0) {
    // 새로 생성
    await client.execute({
      sql: `INSERT INTO users
            (username, name, email, password_hash, role, auth_provider, joined_at, note)
            VALUES (?, ?, ?, ?, 'admin', 'local', ?, ?)`,
      args: [
        adminUsername,
        "관리자",
        adminEmail,
        hashPassword(adminPassEnv ?? "yeongga"),
        new Date().toISOString().slice(0, 10),
        "초기 관리자 계정",
      ],
    });
  } else {
    // 이메일 동기화 + (env 비밀번호가 있으면) 비밀번호도 동기화
    if (adminPassEnv) {
      await client.execute({
        sql: `UPDATE users
              SET email = ?, password_hash = ?, role = 'admin'
              WHERE username = ? OR email = ?`,
        args: [
          adminEmail,
          hashPassword(adminPassEnv),
          adminUsername,
          adminEmail,
        ],
      });
    } else {
      await client.execute({
        sql: `UPDATE users
              SET email = ?, role = 'admin'
              WHERE username = ? OR email = ?`,
        args: [adminEmail, adminUsername, adminEmail],
      });
    }
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

  // 마이그레이션: natnal → jachwi 장 이름 변경 (멱등 — 매칭되는 행이 없으면 no-op)
  await client.execute(
    "UPDATE articles SET chapter = 'jachwi' WHERE chapter = 'natnal'"
  );

  // 마이그레이션: 마크다운 본문 → HTML (멱등 — 이미 HTML인 행은 건너뜀)
  const mdRows = await client.execute(
    "SELECT id, body FROM articles"
  );
  for (const row of mdRows.rows) {
    const id = Number(row.id);
    const body = String(row.body);
    if (looksLikeHTML(body)) continue;
    const html = await renderMarkdown(body);
    await client.execute({
      sql: "UPDATE articles SET body = ?, updated_at = updated_at WHERE id = ?",
      args: [html, id],
    });
  }

  // 시드: 글 (기존 content/articles/<chapter>/*.md 파일을 DB로 일회 이관)
  const articleCount = (
    await client.execute("SELECT COUNT(*) as n FROM articles")
  ).rows[0].n as number;

  if (articleCount === 0) {
    const articlesDir = path.join(process.cwd(), "content", "articles");
    if (fs.existsSync(articlesDir)) {
      for (const chapterSlug of fs.readdirSync(articlesDir)) {
        const chapterDir = path.join(articlesDir, chapterSlug);
        if (!fs.statSync(chapterDir).isDirectory()) continue;
        for (const file of fs.readdirSync(chapterDir)) {
          if (!file.endsWith(".md")) continue;
          const slug = file.replace(/\.md$/, "");
          const raw = fs.readFileSync(path.join(chapterDir, file), "utf8");
          const { data, content } = matter(raw);
          const v = String(data.visibility ?? "public").toLowerCase();
          const visibility =
            v === "members-only" || v === "members" || v === "private"
              ? "members-only"
              : "public";
          await client.execute({
            sql: `INSERT INTO articles
                  (chapter, slug, title, subtitle, author, excerpt, cover, date, visibility, body)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              chapterSlug,
              slug,
              String(data.title ?? slug),
              data.subtitle ? String(data.subtitle) : null,
              data.author ? String(data.author) : null,
              data.excerpt ? String(data.excerpt) : null,
              data.cover ? String(data.cover) : null,
              String(data.date ?? "1970-01-01"),
              visibility,
              content,
            ],
          });
        }
      }
    }
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
