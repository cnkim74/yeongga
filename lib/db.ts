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

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      category TEXT NOT NULL DEFAULT 'other',
      message TEXT NOT NULL,
      file_url TEXT,
      file_name TEXT,
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','done','archived')),
      ip_hash TEXT,
      user_agent TEXT,
      admin_note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
    CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at DESC);

    CREATE TABLE IF NOT EXISTS page_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      visitor_id TEXT,
      user_id INTEGER,
      referer TEXT,
      user_agent TEXT,
      visited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_visits_path ON page_visits(path);
    CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON page_visits(visited_at DESC);
    CREATE INDEX IF NOT EXISTS idx_visits_visitor ON page_visits(visitor_id);

    -- Blob → R2 일회성 마이그레이션 진행 상태 추적용 테이블.
    -- chunked 방식으로 여러 번 호출되어도 안전하게 이어 작업하기 위해 사용.
    CREATE TABLE IF NOT EXISTS migration_blob_to_r2 (
      blob_url TEXT PRIMARY KEY,
      r2_url TEXT NOT NULL,
      bytes INTEGER,
      copied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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

  // ─── 마이그레이션: chapter_meta 에 hero_image 컬럼 추가 ──
  const cmCols = await client.execute("PRAGMA table_info(chapter_meta)");
  const cmColNames = cmCols.rows.map((r) => String(r.name));
  if (!cmColNames.includes("hero_image")) {
    await client.execute(`ALTER TABLE chapter_meta ADD COLUMN hero_image TEXT`);
  }

  // ─── 마이그레이션: submissions 에 저작권·출처·동의 컬럼 추가 ──
  const subCols = await client.execute("PRAGMA table_info(submissions)");
  const subColNames = subCols.rows.map((r) => String(r.name));
  if (!subColNames.includes("consent_at")) {
    await client.execute(`ALTER TABLE submissions ADD COLUMN consent_at TEXT`);
  }
  if (!subColNames.includes("attribution_mode")) {
    await client.execute(`ALTER TABLE submissions ADD COLUMN attribution_mode TEXT DEFAULT 'name'`);
  }
  if (!subColNames.includes("others_consent")) {
    await client.execute(`ALTER TABLE submissions ADD COLUMN others_consent INTEGER DEFAULT 0`);
  }

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

  // 일회성 정리: 부실한 시리즈 글 26편 삭제 + 재시드 차단 (2대·4대 명사/축하/이사회)
  // 작업표 비고 [OCR 후 보완] 자리들로, 자료가 모이면 추후 정성껏 다시 작성
  if (!(await hasMigration(client, "purge-skeleton-moim-v1"))) {
    const skeletonSlugs = [
      // 2대 명사 5
      "2dae-1999-myeongsa-1", "2dae-2000-myeongsa-2", "2dae-2001-myeongsa-3",
      "2dae-2002-myeongsa-4", "2dae-2002-myeongsa-5",
      // 2대 축하 5
      "2dae-1999-chukha-1", "2dae-2000-chukha-2", "2dae-2001-chukha-3",
      "2dae-2002-chukha-4", "2dae-2002-chukha-5",
      // 2대 이사회 4
      "2dae-1999-isagae-1", "2dae-2000-isagae-2", "2dae-2001-isagae-3", "2dae-2002-isagae-4",
      // 4대 명사 5
      "4dae-2007-myeongsa-1", "4dae-2007-myeongsa-2", "4dae-2008-myeongsa-3",
      "4dae-2009-myeongsa-4", "4dae-2010-myeongsa-5",
      // 4대 축하 5
      "4dae-2007-chukha-1", "4dae-2008-chukha-2", "4dae-2008-chukha-3",
      "4dae-2009-chukha-4", "4dae-2010-chukha-5",
      // 4대 이사회 2
      "4dae-2008-isagae-1", "4dae-2010-isagae-2",
    ];
    for (const slug of skeletonSlugs) {
      await client.execute({
        sql: "DELETE FROM articles WHERE chapter = ? AND slug = ?",
        args: ["moim", slug],
      });
      // 재시드 차단 — 다음 콘텐츠 디렉토리 시드 시 다시 추가되지 않도록
      await client.execute({
        sql: "INSERT OR IGNORE INTO seeded_deletions (chapter, slug) VALUES (?, ?)",
        args: ["moim", slug],
      });
    }
    await markMigration(client, "purge-skeleton-moim-v1");
  }

  // 일회성 정리 v2: 매년 반복 평년 정기행사 60편 삭제 + 회장기별 묶음 5편으로 압축
  // 이전 v1과 마찬가지로 자료가 모이면 추후 정성껏 다시 작성
  if (!(await hasMigration(client, "purge-skeleton-moim-v2"))) {
    const skeletonSlugs = [
      // 1대 평년 정기총회 6편 (1985~1997)
      "1985-jeongi-sinnyeon", "1988-jeongi-sinnyeon", "1990-jeongi-sinnyeon",
      "1992-jeongi-sinnyeon", "1995-jeongi-sinnyeon", "1997-jeongi-sinnyeon",
      // 2대 평년 정기/신년/탐방 12편
      "2dae-1999-jeongi", "2dae-1999-sinnyeon", "2dae-1999-tambang",
      "2dae-2000-jeongi", "2dae-2000-sinnyeon", "2dae-2000-tambang",
      "2dae-2001-jeongi", "2dae-2001-sinnyeon", "2dae-2001-tambang",
      "2dae-2002-jeongi", "2dae-2002-sinnyeon", "2dae-2002-tambang",
      // 3대 평년 정기-신년/탐방/문화상 1~3회/묶음 시도 3편 = 14편
      "3dae-2003-jeongi-sinnyeon", "3dae-2003-tambang",
      "3dae-2004-jeongi-sinnyeon", "3dae-2004-tambang", "3dae-2004-munhwasang-1",
      "3dae-2005-jeongi-sinnyeon", "3dae-2005-tambang", "3dae-2005-munhwasang-2",
      "3dae-2006-jeongi-sinnyeon", "3dae-2006-tambang", "3dae-2006-munhwasang-3",
      "3dae-chukha-mum", "3dae-myeongsa-mum", "3dae-isagae-mum",
      // 4대 평년 신년-정기/탐방/문화상 4~7회/이사회 2006 = 13편
      "4dae-2006-isagae",
      "4dae-2007-sinnyeon-jeongi", "4dae-2007-tambang", "4dae-2007-munhwasang-4",
      "4dae-2008-sinnyeon-jeongi", "4dae-2008-tambang", "4dae-2008-munhwasang-5",
      "4dae-2009-sinnyeon-jeongi", "4dae-2009-tambang", "4dae-2009-munhwasang-6",
      "4dae-2010-sinnyeon-jeongi", "4dae-2010-tambang", "4dae-2010-munhwasang-7",
      // 5대 평년 정기/신년/탐방/이사회 2010 = 15편
      "5dae-2010-isagae",
      "5dae-2011-jeongi", "5dae-2011-sinnyeon", "5dae-2011-tambang-k",
      "5dae-2012-jeongi", "5dae-2012-sinnyeon", "5dae-2012-tambang-h", "5dae-2012-tambang-k",
      "5dae-2013-jeongi", "5dae-2013-sinnyeon", "5dae-2013-tambang-k",
      "5dae-2014-jeongi", "5dae-2014-sinnyeon", "5dae-2014-tambang-h", "5dae-2014-tambang-k",
    ];
    for (const slug of skeletonSlugs) {
      await client.execute({
        sql: "DELETE FROM articles WHERE chapter = ? AND slug = ?",
        args: ["moim", slug],
      });
      await client.execute({
        sql: "INSERT OR IGNORE INTO seeded_deletions (chapter, slug) VALUES (?, ?)",
        args: ["moim", slug],
      });
    }
    await markMigration(client, "purge-skeleton-moim-v2");
  }

  // 일회성: 샘플로 만들어진 글 5편 삭제 + 재시드 차단
  // 사용자가 사이트에서 삭제했으나, 콘텐츠 디렉토리에 남아 있어 시드 시 다시 복구되던 글들
  // (이번 작업에서 콘텐츠 파일도 함께 삭제됨)
  if (!(await hasMigration(client, "purge-sample-articles-v1"))) {
    const sampleSlugs: [string, string][] = [
      ["yeongi", "cheot-moim"],
      ["moim", "2025-chu-moim"],
      ["geul", "teotbat-ilji"],
      ["geul", "oedongttal-pyeonji"],
      ["saram", "kim-yeongseok"],
    ];
    for (const [chapter, slug] of sampleSlugs) {
      await client.execute({
        sql: "DELETE FROM articles WHERE chapter = ? AND slug = ?",
        args: [chapter, slug],
      });
      // 재시드 차단 — 다음 콘텐츠 시드 시 다시 추가되지 않도록
      await client.execute({
        sql: "INSERT OR IGNORE INTO seeded_deletions (chapter, slug) VALUES (?, ?)",
        args: [chapter, slug],
      });
    }
    await markMigration(client, "purge-sample-articles-v1");
  }

  // 영가문화상 1회 시상식 옛 글 영구 삭제 — 40년사 분책에서 1회 수상자가
  // '하회별신굿탈놀이 보존회 (2003)' 가 아니라 '안동문화지킴이 (2006.1.9)' 로
  // 확인되어, 잘못된 정보의 옛 글을 삭제하고 새 슬러그 3dae-2006-munhwasang-1 로 작성.
  if (!(await hasMigration(client, "purge-wrong-munhwasang-1hoe-v1"))) {
    const slug = "yeongga-munhwasang-1hoe-sihaengshik";
    await client.execute({
      sql: "DELETE FROM articles WHERE slug = ?",
      args: [slug],
    });
    await client.execute({
      sql: "INSERT OR IGNORE INTO seeded_deletions (chapter, slug) VALUES (?, ?)",
      args: ["moim", slug],
    });
    await markMigration(client, "purge-wrong-munhwasang-1hoe-v1");
  }

  // 영가문화상 5대 8~11회 잘못된 글 영구 삭제 —
  // 40년사 분책 자료 정독 결과 영가문화상은 격년 시상으로:
  //   · 1회 2006.1.9 (안동문화지킴이)
  //   · 3회 2010.1.13 (안동문화원)
  //   · 4회 2012.1.9 (한국예총 안동시 지부)
  // 즉 5대 회장기(2011-2014)는 매년 시상 아니며 2012=4회·2014=5회가 정상.
  // 사이트의 5dae-201X-munhwasang-8~11 4편은 회차와 본문 모두 자료 없는
  // 부실 글로 확인되어 영구 삭제. 새 정확 글로 점진 대체 예정.
  if (!(await hasMigration(client, "purge-wrong-5dae-munhwasang-v1"))) {
    const slugs = [
      "5dae-2011-munhwasang-8",
      "5dae-2012-munhwasang-9",
      "5dae-2013-munhwasang-10",
      "5dae-2014-munhwasang-11",
    ];
    for (const slug of slugs) {
      await client.execute({
        sql: "DELETE FROM articles WHERE slug = ?",
        args: [slug],
      });
      await client.execute({
        sql: "INSERT OR IGNORE INTO seeded_deletions (chapter, slug) VALUES (?, ?)",
        args: ["moim", slug],
      });
    }
    await markMigration(client, "purge-wrong-5dae-munhwasang-v1");
  }

  // 일회성: 32~48번 사람 챕터 글의 대표 이미지(cover) 일괄 제거
  if (!(await hasMigration(client, "clear-saram-32-48-covers-v1"))) {
    const slugs = [
      "1dae-kim-haegil", "2dae-ryu-mokgi", "3dae-geum-changtae",
      "4dae-heo-dongjin", "5dae-ryu-jongmuk", "6dae-kim-bonggu",
      "7dae-kim-gyedong",
      "myungsa-lee-huibeom", "myungsa-kwon-oeul", "myungsa-kwon-yeongbok",
      "myungsa-kim-gwangrim", "myungsa-kim-wonjung", "myungsa-lee-jaebeom",
      "myungsa-kwon-ryeonggeon", "myungsa-lee-yongtae",
      "myungsa-hwang-hyeontak", "myungsa-kim-huigon",
    ];
    for (const slug of slugs) {
      await client.execute({
        sql: `UPDATE articles SET cover = NULL, updated_at = CURRENT_TIMESTAMP
              WHERE chapter = ? AND slug = ?`,
        args: ["saram", slug],
      });
    }
    await markMigration(client, "clear-saram-32-48-covers-v1");
  }

  // 일회성 복원: 류목기 회장 글 본문 — 사진 업로드 후 본문이 깨졌다는 보고에 따른 자동 복구
  if (!(await hasMigration(client, "restore-2dae-ryu-mokgi-v1"))) {
    try {
      const filePath = path.join(
        process.cwd(),
        "content",
        "articles",
        "saram",
        "2dae-ryu-mokgi.md"
      );
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
        const { content } = matter(raw);
        const html = await renderMarkdown(content);
        await client.execute({
          sql: `UPDATE articles SET body = ?, updated_at = CURRENT_TIMESTAMP
                WHERE chapter = ? AND slug = ?`,
          args: [html, "saram", "2dae-ryu-mokgi"],
        });
      }
    } catch (e) {
      console.warn("[restore-2dae-ryu-mokgi-v1] 실패:", e);
    }
    await markMigration(client, "restore-2dae-ryu-mokgi-v1");
  }

  // 일회성: 콘텐츠 파일에서 모든 글의 본문·메타데이터 강제 갱신
  // 시드는 INSERT OR IGNORE라 기존 슬러그의 본문이 갱신되지 않는 한계가 있어,
  // 회원 기고문·회장 평전·안동 향토 자료 등을 양질로 보강한 결을 DB에도 반영하기 위한 일회성
  if (!(await hasMigration(client, "refresh-articles-content-v1"))) {
    try {
      const articlesDir = path.join(process.cwd(), "content", "articles");
      if (fs.existsSync(articlesDir)) {
        for (const chapterSlug of fs.readdirSync(articlesDir)) {
          const chapterDir = path.join(articlesDir, chapterSlug);
          if (!fs.statSync(chapterDir).isDirectory()) continue;
          for (const file of fs.readdirSync(chapterDir)) {
            if (!file.endsWith(".md") || file.startsWith("._")) continue;
            const slug = file.replace(/\.md$/, "");
            const raw = fs.readFileSync(path.join(chapterDir, file), "utf8");
            const { data, content } = matter(raw);
            const html = await renderMarkdown(content);
            const v = String(data.visibility ?? "public").toLowerCase();
            const visibility =
              v === "members-only" || v === "members" || v === "private"
                ? "members-only"
                : "public";
            await client.execute({
              sql: `UPDATE articles SET
                      title = ?, subtitle = ?, author = ?, excerpt = ?,
                      cover = ?, date = ?, visibility = ?, body = ?,
                      updated_at = CURRENT_TIMESTAMP
                    WHERE chapter = ? AND slug = ?`,
              args: [
                String(data.title ?? slug),
                data.subtitle ? String(data.subtitle) : null,
                data.author ? String(data.author) : null,
                data.excerpt ? String(data.excerpt) : null,
                data.cover ? String(data.cover) : null,
                String(data.date ?? "1970-01-01"),
                visibility,
                html,
                chapterSlug,
                slug,
              ],
            });
          }
        }
      }
    } catch (e) {
      console.warn("[refresh-articles-content-v1] 실패:", e);
    }
    await markMigration(client, "refresh-articles-content-v1");
  }

  // 일회성 v2: 〈결〉 단어 과다 사용 톤앤매너 정리(89편) 반영
  // v1과 동일 로직 — 콘텐츠 파일에서 모든 글의 본문·메타데이터 강제 갱신
  if (!(await hasMigration(client, "refresh-articles-content-v2"))) {
    try {
      const articlesDir = path.join(process.cwd(), "content", "articles");
      if (fs.existsSync(articlesDir)) {
        for (const chapterSlug of fs.readdirSync(articlesDir)) {
          const chapterDir = path.join(articlesDir, chapterSlug);
          if (!fs.statSync(chapterDir).isDirectory()) continue;
          for (const file of fs.readdirSync(chapterDir)) {
            if (!file.endsWith(".md") || file.startsWith("._")) continue;
            const slug = file.replace(/\.md$/, "");
            const raw = fs.readFileSync(path.join(chapterDir, file), "utf8");
            const { data, content } = matter(raw);
            const html = await renderMarkdown(content);
            const v = String(data.visibility ?? "public").toLowerCase();
            const visibility =
              v === "members-only" || v === "members" || v === "private"
                ? "members-only"
                : "public";
            await client.execute({
              sql: `UPDATE articles SET
                      title = ?, subtitle = ?, author = ?, excerpt = ?,
                      cover = ?, date = ?, visibility = ?, body = ?,
                      updated_at = CURRENT_TIMESTAMP
                    WHERE chapter = ? AND slug = ?`,
              args: [
                String(data.title ?? slug),
                data.subtitle ? String(data.subtitle) : null,
                data.author ? String(data.author) : null,
                data.excerpt ? String(data.excerpt) : null,
                data.cover ? String(data.cover) : null,
                String(data.date ?? "1970-01-01"),
                visibility,
                html,
                chapterSlug,
                slug,
              ],
            });
          }
        }
      }
    } catch (e) {
      console.warn("[refresh-articles-content-v2] 실패:", e);
    }
    await markMigration(client, "refresh-articles-content-v2");
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
  // v8: 모임 챕터 84~181번 (1~5대 회장기 정기행사·창립·취임·회칙) 98편 추가
  // v9: 모임 챕터 회장기별 묶음 글 5편 추가 (1~5대 시기 정기행사 모음)
  // v10: 자취 사진 9편 + 연기 3편(기획) + 명사 11편 등 신규 글 추가
  //      (보강된 기존 글의 본문 갱신은 위의 refresh-articles-content-v1 마이그레이션 참조)
  // v11: 2~5대 회장기 자료 기반 모임 글 묶음 추가 — 2대 5편, 3대 5편,
  //      4대 5편, 5대 1차 4편 (5dae-*-munhwasang-8~11 옛 글은 위의
  //      purge-wrong-5dae-munhwasang-v1 마이그레이션이 seeded_deletions
  //      에 등록해 두므로 재시드 시 제외됨).
  // v12: 5대 류종묵 회장기 2차 배치 6편 추가 — 홍영재·김경동 특강,
  //      2013·2014 신년하례(+영가문화상 5회 김희곤), 권영진 대구시장
  //      축하, 연천 탐방.
  // v13: 5대 류종묵 회장기 3차 배치 5편 추가 — 박석무·박세일·김용직
  //      특강, 김광림·류성걸 19대 의원 당선 축하, 2012 서산·아산만
  //      탐방(흥국 공장 견학 포함).
  // v14: 6대 김봉구 회장기 1차 배치 5편 추가 — 2015 신년하례(회장
  //      취임), 중국 사천성(중경·양자강) 탐방, 정부락 교수 〈북한정세
  //      와 남북관계 전망〉, 백두대간 협곡열차·영월 청령포, 2016
  //      신년하례 + 영가문화상 6회(안동 내방가사 보존회).
  // v15: 6대 김봉구 회장기 2차 배치 6편 추가 — 괴산 산막이옛길 + 경북
  //      도청 개청, 회장 영어 특강, 라오스 탐방, 2017 신년하례(회장
  //      유임), 김병렬 교수 독도 특강, 김봉구 회장 사임 + 김계동 7대
  //      회장 선임.
  const seedKey = "content-seed-v15";
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

  // 이미 DB 에 있는 글은 시드에서 건너뜀 — INSERT OR IGNORE 만으로는
  // 라운드트립이 누적되어 Vercel 서버리스 타임아웃(504)이 났던 이슈.
  // (chapter, slug) 쌍을 한 번 끌어와 메모리 셋으로 조회.
  const existingRows = await client.execute(
    "SELECT chapter, slug FROM articles"
  );
  const existingSet = new Set(
    existingRows.rows.map((r) => `${r.chapter}::${r.slug}`)
  );

  const articlesDir = path.join(process.cwd(), "content", "articles");
  if (fs.existsSync(articlesDir)) {
    for (const chapterSlug of fs.readdirSync(articlesDir)) {
      const chapterDir = path.join(articlesDir, chapterSlug);
      if (!fs.statSync(chapterDir).isDirectory()) continue;
      for (const file of fs.readdirSync(chapterDir)) {
        if (!file.endsWith(".md")) continue;
        const slug = file.replace(/\.md$/, "");
        const key = `${chapterSlug}::${slug}`;
        // 삭제 차단 목록에 있으면 시딩 건너뜀
        if (deletedSet.has(key)) continue;
        // 이미 DB 에 있으면 시딩 건너뜀 (본문 갱신은 별도 마이그레이션)
        if (existingSet.has(key)) continue;
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
