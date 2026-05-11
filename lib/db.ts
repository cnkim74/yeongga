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

/** 마이그레이션 가드 — 한 번 실행된 작업은 키로 기록해 두 번 실행 안 함 */
async function hasMigration(client: Client, key: string): Promise<boolean> {
  try {
    const r = await client.execute({
      sql: "SELECT 1 FROM migrations_log WHERE key = ? LIMIT 1",
      args: [key],
    });
    return r.rows.length > 0;
  } catch {
    return false; // migrations_log 가 아직 없으면 false
  }
}

async function markMigration(client: Client, key: string): Promise<void> {
  await client.execute({
    sql: "INSERT OR IGNORE INTO migrations_log (key, run_at) VALUES (?, CURRENT_TIMESTAMP)",
    args: [key],
  });
}

async function init(client: Client) {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS migrations_log (
      key TEXT PRIMARY KEY,
      run_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

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

    CREATE TABLE IF NOT EXISTS article_tags (
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      PRIMARY KEY (article_id, tag)
    );
    CREATE INDEX IF NOT EXISTS idx_article_tags_tag ON article_tags(tag);

    CREATE TABLE IF NOT EXISTS page_backgrounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT UNIQUE NOT NULL,
      image_path TEXT,
      opacity REAL NOT NULL DEFAULT 0.2,
      position TEXT NOT NULL DEFAULT 'center',
      active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ebooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      pdf_url TEXT NOT NULL,
      cover_url TEXT,
      visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','members-only')),
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS seeded_deletions (
      chapter TEXT NOT NULL,
      slug    TEXT NOT NULL,
      PRIMARY KEY (chapter, slug)
    );

    CREATE TABLE IF NOT EXISTS photo_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      cover_url TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES photo_categories(id) ON DELETE SET NULL,
      title TEXT,
      description TEXT,
      image_url TEXT NOT NULL,
      taken_at TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','members-only')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(category_id);

    CREATE TABLE IF NOT EXISTS chapter_meta (
      chapter_slug TEXT PRIMARY KEY,
      cover_image TEXT,
      display_mode TEXT NOT NULL DEFAULT 'latest' CHECK(display_mode IN ('latest','featured','random')),
      featured_article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
      visible INTEGER NOT NULL DEFAULT 1,
      position INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS member_banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT,
      image_url TEXT NOT NULL,
      link_url TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_banners_active_position ON member_banners(active, position);
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

  // 성능 인덱스 — 자주 쓰이는 정렬/필터 조합
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_articles_chapter_date ON articles(chapter, date DESC)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(date DESC)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_slides_active_position ON slides(active, position)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_videos_featured ON videos(featured)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_photos_visibility_position ON photos(visibility, position)`
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

  // ─── ensureAdmin: 매 부팅마다 admin 단일 계정 보장 + 중복 자동 병합 ──
  // 보장 사항
  //   1) ADMIN_USERNAME 으로 식별되는 canonical admin 한 명이 존재
  //   2) 그 사람의 email = ADMIN_EMAIL, role = 'admin'
  //   3) (env가 있으면) password_hash = hash(ADMIN_PASSWORD)
  //   4) 같은 ADMIN_EMAIL 로 다른 admin 행이 있으면 그쪽의 Google 연결 정보·
  //      avatar_url 을 canonical 로 흡수한 뒤 그 행을 삭제 (멱등).
  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
  const adminEmail = process.env.ADMIN_EMAIL ?? "cnkim74@gmail.com";
  const adminPassEnv = process.env.ADMIN_PASSWORD;

  // Step 1) canonical 찾기 또는 생성
  let canonicalId: number;
  const byUsername = await client.execute({
    sql: "SELECT id FROM users WHERE username = ? LIMIT 1",
    args: [adminUsername],
  });

  if (byUsername.rows.length > 0) {
    canonicalId = Number(byUsername.rows[0].id);
  } else {
    // username 매칭 실패 — 같은 이메일의 admin이 있으면 그걸 canonical 로 채택하고
    // username만 ADMIN_USERNAME 으로 리네임. 없으면 새로 생성.
    const byEmail = await client.execute({
      sql: "SELECT id FROM users WHERE email = ? AND role = 'admin' ORDER BY id LIMIT 1",
      args: [adminEmail],
    });
    if (byEmail.rows.length > 0) {
      canonicalId = Number(byEmail.rows[0].id);
      await client.execute({
        sql: "UPDATE users SET username = ? WHERE id = ?",
        args: [adminUsername, canonicalId],
      });
    } else {
      const ins = await client.execute({
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
      canonicalId = Number(ins.lastInsertRowid);
    }
  }

  // Step 2) 같은 email 로 매달려 있는 다른 admin 행 흡수 + 삭제
  const dups = await client.execute({
    sql: `SELECT id, auth_provider, provider_id, avatar_url
          FROM users
          WHERE email = ? AND role = 'admin' AND id != ?`,
    args: [adminEmail, canonicalId],
  });

  for (const dup of dups.rows) {
    const canon = (
      await client.execute({
        sql: "SELECT auth_provider, provider_id, avatar_url FROM users WHERE id = ?",
        args: [canonicalId],
      })
    ).rows[0];

    const sets: string[] = [];
    const args: (string | number | null)[] = [];

    if (canon.auth_provider === "local" && dup.auth_provider === "google") {
      sets.push("auth_provider = 'google'");
      sets.push("provider_id = ?");
      args.push(dup.provider_id == null ? null : String(dup.provider_id));
    }
    if (!canon.avatar_url && dup.avatar_url) {
      sets.push("avatar_url = ?");
      args.push(String(dup.avatar_url));
    }
    if (sets.length > 0) {
      args.push(canonicalId);
      await client.execute({
        sql: `UPDATE users SET ${sets.join(", ")} WHERE id = ?`,
        args,
      });
    }

    await client.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [Number(dup.id)],
    });
    console.log(
      `[ensureAdmin] merged duplicate admin id=${dup.id} into canonical id=${canonicalId}`
    );
  }

  // Step 3) email/role/password 동기화
  if (adminPassEnv) {
    await client.execute({
      sql: `UPDATE users
            SET email = ?, password_hash = ?, role = 'admin'
            WHERE id = ?`,
      args: [adminEmail, hashPassword(adminPassEnv), canonicalId],
    });
  } else {
    await client.execute({
      sql: `UPDATE users SET email = ?, role = 'admin' WHERE id = ?`,
      args: [adminEmail, canonicalId],
    });
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
      "/archive/yeongi/hoejang-insa",
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

  // 마이그레이션: 챕터명 정정 (한 번만 실행)
  if (!(await hasMigration(client, "chapter-rename-v1"))) {
    await client.execute("UPDATE articles SET chapter = 'jachwi' WHERE chapter = 'natnal'");
    await client.execute("UPDATE articles SET chapter = 'yeongi' WHERE chapter = 'yeon-gi'");
    await client.execute("UPDATE articles SET chapter = 'jachui' WHERE chapter = 'jachwi'");
    await markMigration(client, "chapter-rename-v1");
  }

  // 마이그레이션: 마크다운 본문 → HTML (한 번만, 전체 스캔 부담 큼)
  if (!(await hasMigration(client, "markdown-to-html-v1"))) {
    const mdRows = await client.execute("SELECT id, body FROM articles");
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
    await markMigration(client, "markdown-to-html-v1");
  }

  // 시드: 글 (content/articles/<chapter>/*.md → DB 업서트)
  // 한 번 시드된 후에는 cold-start 마다 다시 디스크 스캔하지 않도록 가드
  // 새 콘텐츠 파일이 추가됐을 때만 SEED_FROM_FILES=1 환경변수로 재실행
  const seedKey = "content-seed-v1";
  const shouldSeed =
    !(await hasMigration(client, seedKey)) ||
    process.env.SEED_FROM_FILES === "1";

  if (shouldSeed) {
  const deletedRows = await client.execute(
    "SELECT chapter, slug FROM seeded_deletions"
  );
  const deletedSet = new Set(
    deletedRows.rows.map((r) => `${r.chapter}::${r.slug}`)
  );

  const articlesDir = path.join(process.cwd(), "content", "articles");
  if (fs.existsSync(articlesDir)) {
    for (const chapterSlug of fs.readdirSync(articlesDir)) {
      const chapterDir = path.join(articlesDir, chapterSlug);
      if (!fs.statSync(chapterDir).isDirectory()) continue;
      for (const file of fs.readdirSync(chapterDir)) {
        if (!file.endsWith(".md")) continue;
        const slug = file.replace(/\.md$/, "");
        // 삭제 차단 목록에 있으면 시딩 건너뜀
        if (deletedSet.has(`${chapterSlug}::${slug}`)) continue;
        const raw = fs.readFileSync(path.join(chapterDir, file), "utf8");
        const { data, content } = matter(raw);
        const v = String(data.visibility ?? "public").toLowerCase();
        const visibility =
          v === "members-only" || v === "members" || v === "private"
            ? "members-only"
            : "public";
        await client.execute({
          sql: `INSERT OR IGNORE INTO articles
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

        // 프론트매터 tags → article_tags (INSERT OR IGNORE 멱등)
        const rawTags = data.tags;
        if (rawTags) {
          const tags = String(rawTags)
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean);
          if (tags.length > 0) {
            const row = await client.execute({
              sql: "SELECT id FROM articles WHERE chapter = ? AND slug = ?",
              args: [chapterSlug, slug],
            });
            if (row.rows.length > 0) {
              const articleId = Number(row.rows[0].id);
              for (const tag of tags) {
                await client.execute({
                  sql: "INSERT OR IGNORE INTO article_tags (article_id, tag) VALUES (?, ?)",
                  args: [articleId, tag],
                });
              }
            }
          }
        }
      }
    }
  }
  await markMigration(client, seedKey);
  } // ← shouldSeed 끝

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

  // 시드: 페이지 배경 (멱등 — INSERT OR IGNORE)
  for (const page of ["home", "archive", "gallery", "search", "videos", "about", "ebooks"]) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO page_backgrounds (page, image_path, opacity, position, active)
            VALUES (?, ?, 0.2, 'center', 0)`,
      args: [page, page === "about" ? "/andong-hahoe-panorama.jpg" : null],
    });
  }
  // about 페이지 배경 활성화
  await client.execute({
    sql: `UPDATE page_backgrounds SET active = 1 WHERE page = 'about' AND image_path IS NOT NULL`,
    args: [],
  });
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
