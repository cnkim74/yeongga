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

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      author_id INTEGER,
      author_name TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      views INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS post_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      mime TEXT,
      position INTEGER NOT NULL DEFAULT 0
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

  // 관리자 계정은 아래 ensureAdmin 이 보장한다. 데모 회원 샘플 시드는
  // 약한 기본 비밀번호(yeongga) 문제로 제거됨 — 실제 회원은 구글 로그인 또는
  // 관리자가 발급한 계정으로 가입한다.

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

  // 데모 회원 계정(kim/park/lee/jeong) 영구 삭제 — 약한 기본 비밀번호 'yeongga' 제거.
  // 초기 시드로 만들어진 로컬 인증 샘플 계정만 대상. (글의 author_name 은 남으므로 표시는 유지)
  if (!(await hasMigration(client, "remove-demo-members-v1"))) {
    await client.execute(
      `DELETE FROM users
         WHERE auth_provider = 'local' AND role = 'member'
           AND username IN ('kim','park','lee','jeong')`
    );
    await markMigration(client, "remove-demo-members-v1");
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
  // v16: 7대 김계동 회장기 1차 배치 5편 추가 — 2017.5.26 회장 취임 +
  //      7.13 이사회, 2017.9.12 정선 5일장, 2017.10.26 권원오 교수
  //      특강 〈어떻게 살 것인가?〉, 2017.11.14 베트남 다낭, 2018.1.5
  //      신년하례(영가회 40년사 제작 천명).
  // v17: 7대 김계동 회장기 2차 배치 3편 추가 — 2018.4.24 김휘동 회원
  //      〈솔바위〉 사진전시회, 2018.5.17 강화도 탐방, 2018.8.30 임시
  //      총회(김봉구 전 회장 감사패 + 신입회원 13명 + 김동기 학술원
  //      회장 〈4차 산업혁명시대〉 특강).
  // v18: 〈향〉 챕터 보강 5편 추가 (10번 분책 〈안동은?〉 미발췌 부분
  //      에서) — 도산서원, 병산서원, 임청각·학봉종택, 안동의 전탑·
  //      석불(법흥사지 칠층전탑·동부동 오층전탑·이천동 마애여래입상),
  //      한국국학진흥원.
  // v19: 〈향〉 챕터 보강 2차 4편 추가 — 안동의 역사 인물(김방경·김자수·
  //      권부·권근·이황·김성일), 태사묘 + 안동향교 + 예안향교, 안동의
  //      박물관(안동민속박물관·하회 세계탈박물관·전통문화콘텐츠박물관),
  //      안동의 자연 명승(안동댐·임하댐·암산유원지·무릉유원지·700년
  //      은행나무·도산온천·학가산온천).
  // v20: 〈사람〉 챕터 보강 5편 추가 — 9번 분책 회원 기고문 저자 가운데
  //      명사 시리즈에 없던 분들의 인물 글: 강민창(재경안동향우회 8대
  //      회장·전 치안본부장, 1972 永嘉회담 연락간사), 김경한(전 법무부
  //      차장·한국법치재단 이사장), 김원(전 서울시립대 부총장), 권기성
  //      (세명대 국제교수·재단이사), 이유택(전 송파구청장·원로회원).
  //      9번 분책의 24편 기고문은 〈글〉 챕터에 이미 모두 들어가 있어,
  //      저자 인물에 대한 〈명사〉 글로 보강.
  // v21: 〈자취〉 챕터 보강 4편 추가 (11번 분책 〈사진으로 보는 영가회
  //      발자취 + 편집후기 + 부록〉에서) — 영가문화상 6회의 자취(1회
  //      안동문화지킴이~6회 안동내방가사보존회), 영가회 입회·탈퇴·
  //      경조사 규정의 자취(7대 김계동 회장기 입회비 30→20만 원 인하),
  //      영가문화상 운영 규정의 자취(2005 제정·2011 개정), 재경 안동
  //      9개 고등학교 친선체육대회(2018.10.27 제44회).
  // v22: 영가회보 8-1호(2022년 겨울호) 5편 PoC 추가 — 윤상부 8대 회장
  //      칼럼 〈영가회의 르네상스를 위해 앞장서겠습니다〉(글), 영가희망
  //      포럼 제1차(이희범 전 산자부장관 발제·김휘동 전 안동시장 토론,
  //      2021.11.30)(모임), 영가문화상 지속 선정키로(2022.1.8 이사회,
  //      자취), 영가회 회칙 개정+임원·사무처 구성(자취), 권영세 안동
  //      시장 재발간 축하 메시지(글). 18편 영가회보 아카이빙의 첫 호.
  // v23: 영가회보 8-1호 본격 보강 14편 추가 — 향(서울·부산~안동 1시간대
  //      중앙선 복선화, 고향세법 시행), 자취(월영교 50만 관광객, 영가회보
  //      자취, 풍산·흥국 기획대담, 영가회 40년 ① 영가상록회, 신규회원·
  //      특별회비·부음), 사람(영가 사람들 ① 국담 권태연 안동소주 창업,
  //      하남 류한상 안동문화원장 유고 서화), 글(故 금창태 추모, 김광림
  //      안동 백신산업 메카 회고, 윤병진 통합 결단 촉구, 이동수 혁신과
  //      보수, 김휘동 귀천 〈上〉, 역대회장 5인 재발간 축하, 김대원 수묵
  //      안동, 이유대 안동의 맛 ① 안동국시). 8-1호 총 19편 아카이빙 완료.
  // v24: 영가회보 8-2호(2022년 봄호) 19편 아카이빙 — 향(웰니스 50선,
  //      KTX 서울역 출발, 지방소멸 특별법), 자취(행정통합 조사 58.4%,
  //      영가골프회 출발, 윤석열 안동 공약, 회원 동정, 안동영여서 노래비,
  //      세영그룹 기획대담, 신규회원·세법상식), 사람(안동의 경제인 ②
  //      운치림·윤서환), 글(정종수 상생발전 칼럼, 진평구 도청이전 기고,
  //      김상영 지방소멸, 김휘동 귀천 〈下〉, 이종묵 귀거래사, 권용오
  //      세계정신문화수도, 이유대 안동의 맛 ② 간고등어, 유천 김광원
  //      추모시, 평직 공무원 행복찾기 ①), 모임(예천·안동 상생발전 토론회
  //      6월 개최). 한 호의 큰 그림: 안동·예천 행정통합 조사 + 새 정부 결.
  // v25: 영가회보 8-3호(2022년 여름호) 21편 아카이빙 — 자취(행정통합
  //      급물살, 명예회원 위촉, 김정현 철탑산업훈장, 회원 동정, 안동인구
  //      감소 여전, 시의회 의장단·향우회 체육대회, 영가문화봉사상·지원법
  //      통과·에어플 사과, 영가회 소식 6명+골프회+탐방), 향(안동호반
  //      달빛야행, 예천곤충축제, 고향세법 시행령), 사람(안동의 경제인
  //      ③ 김흥학 신원어패럴), 글(김명호 도청신도시 아킬레스건, 안동의
  //      맛 ③ 안동찜닭, 김희동 정신문화 브랜드, 정창식 45년 사무실
  //      없다니, 김달영 지원법 실효성, 황선석 면단위주택 중과세, 남승룡
  //      안동팔경, 평직공무원 행복찾기 ② 파라과이, 권기성 길상지 〈上〉,
  //      류미향 안동삼베), 모임(권기창 시장 취임, 원로회의 의장 류종묵
  //      추대, 권기창·조은희 당선축하연). 한 호의 큰 그림: 권기창 신임
  //      시장기 출범 + 영가회 명예회원·원로회의·당선축하연의 한 결.
  // v26: 영가회보 8-4호(2022년 가을호) 22편 아카이빙 — 자취(권기창
  //      시장 통합 안되면 도청 별도 분리, 영가문화상 추천·로고 잠정확정,
  //      회원 동정, 기획대담 동방건설, 3대문화권사업 핵심시설 개장,
  //      신규회원 10명+원수첩+BCT 기업탐방), 향(가을 축제, 고향세법
  //      10만→13만), 사람(안동의 경제인 ④ 권용철 한약재), 글(남영찬
  //      안동 선비 혁신DNA, 안동의 맛 ④ 文魚 문어, 권기성 길상지
  //      〈下〉 우직·믿음·무뚝뚝, 권원오의 행복 아카데미 ① 어리석게
  //      살자, 류상영 병역 명문가, 남승룡 안동 3다3무, 평직공무원
  //      행복찾기 ③ 콜롬비아, 춘파 장원석 서예), 모임(2022 영가희망
  //      포럼 200명+권기창·이철우 주제발표, 출향기업·시장 간담회,
  //      류종묵 학생 격려, 문화유적 탐방 10/25-26, 예천군민회·향우회
  //      여름 추억). 한 호 큰 그림: 영가희망포럼이 한 결로 가장 크게.
  // v27: 영가회보 8-5호(2023년 겨울호) 22편 아카이빙 — 자취(통합 논의
  //      후끈, 신규회원·여성 활발, (가칭)영가경제포럼 창립+류종묵 인터뷰,
  //      장원석 참여영가 휘호, 명예회원 2분, 영가문화상·선행상 정광영·
  //      채수남, 선거구 획정·김정호 울진, 안동인구 13만, 유네스코 3대
  //      카테고리, 회원수첩·부회장 4명·연회비 20만, 회원 동정, 고위
  //      공무원 현황, 신규회원·대평산업), 향(고향사랑기부제 1월 시행,
  //      소비기한·만나이, 토끼해·봉제사접빈객), 사람(안동의 경제인 ⑤
  //      정현섭 정미·건축·광업·정치), 글(윤상부 신년사, 권용근 특별기고
  //      통합·상생, 안호삼 선비문화·지식인 사회화, 정만규 행복찾기 ④
  //      감사하며 살아가기, 남영찬 선비정신·자원봉사, 김유진 귀농귀촌
  //      돈과 사람, 남승룡 영호루, 안동사투리 핸나 알밥, 안동의 맛 ⑤
  //      안동찜닭 두번째), 모임(정기총회·신년회 7억 모금, 재경향우회
  //      송년의 밤). 한 호 큰 그림: (가칭)영가경제포럼 창립 + 7억 모금.
  // v28: 영가회보 8-6호(2023년 봄호) 21편 아카이빙 — 자취(영가경제연구원
  //      4월 법인설립·5월 토론회, 정기총회, 영가회보 후원인, 예천 민간단체
  //      출범, 시의회 선거구 존속 요구, 농축협 조합장 13명, 회원 동정,
  //      신규회원·윤용성 건강해법), 향(바이오 생명 국가산단, 고향사랑기부
  //      1억원, 법흥 인도교 역사 속으로), 사람(일송 김동삼 만주벌 호랑이,
  //      안동의 경제인 ⑥ 이정석), 글(정광영 영가문화상 인터뷰, 채수남
  //      영가선행상 인터뷰, 유철균 메타버스 정기총회 특강, 안동 습속 세조
  //      성종 호평, 진세준 유연한 지혜와 용기, 권용설 특수성에서 출발해야,
  //      안동의 신비 齋·樓·亭, 남승룡 태사묘 안묘당중수기, 안동의 풍미
  //      ⑥ 上 한우, 정창식 유랑 47년 끝내자, 봄·텃밭 10평). 한 호 큰
  //      그림: 영가경제연구원 법인 설립 + 바이오 국가산단 후보지.
  // v29: 영가회보 8-7호(2023년 여름호) 19편 아카이빙 — 자취(영가회 1억·
  //      향우회 3억 기부 약정, 영가경제연구원 창립기념 세미나(박재범·
  //      이재준), 군위 대구편입 지역구 조정 난항, 상생 행정협의회 협약식,
  //      명예회원 3분, 회원 동정, 허동진 50년 장학, 안동 원도심 동서울행
  //      시외버스, 신규회원·윤용성 폐 건강비법), 향(귀농귀촌 시군 전국
  //      10위), 사람(조영일 시조시인 별세), 글(수구초심 특별기고, 권영찰
  //      떡시루, 임재공 차 한 잔의 생각, 석근 떠난 이 지키는 이, 김희구
  //      여성가산점·정년연장, 권영철 21세기 휴먼르네상스, 권원오 박약회
  //      행복아카데미, 김교식 잃어버린 문화유산, 정재석 정신문화수도
  //      안동향우회, 안동의 풍미 ⑦ 下 한우 국밥육회갈비찜). 한 호 큰
  //      그림: 영가회 1억·향우회 3억 약정 + 영가경제연구원 창립 세미나.
  // v30: 영가회보 8-8호(2023년 가을호) 22편 아카이빙 — 자취(안동·예천
  //      선거구 존속, 영가경제연구원 설립절차 마무리, 서울시·안동시 5개
  //      분야 협력, 명예로운 안동인상 김영식·권영식, 회원 동정, 류목기
  //      2대회장 인터뷰, 고향사랑기부 3억·예천 전국1위, 충녀 실종자
  //      수색, 안동대 국립의대 촉구, 영가회 소식 양배추), 향(안동의 날,
  //      옥동 파크골프장), 모임(투자유치자문위원회 24명, 역대회장 모두
  //      참석 원로 간담회), 글(정종수 칼럼 ②, 김영식·권영식 인터뷰,
  //      이재일 예정된 미래·만들어가는 미래, 김지숙 도농상생, 박근식
  //      안보태세, 권세준 예천 도약 10월, 안동춘추 국망 산하, 김창준
  //      오펜하이머, 청백리 보백당, 왔니껴투어·안동 마, 도재억 백두대간
  //      낙동강 부산영가회). 한 호 큰 그림: 안동·예천 선거구 존속 +
  //      서울안동 5개분야 + 명예로운 안동인상 + 류목기 2대 인터뷰.
  // v31: 영가회보 8-9호~8-13호(2024~2025) 5호 109편 일괄 아카이빙 —
  //      8-9호(2024년 겨울호, 22편): 4.10총선, 이동시 여거위도 휘호,
  //      정기총회 미래 100년 주춧돌, 신년사, 누가뛰나, 회원동정, 안동시
  //      역점사업, 도내2위 예천전국5위, 경북발전협의회, KTX 서울역
  //      연장, 인구 15만2930, 이재범 기업, 이모저모, 노인 26%, 박재범
  //      정신문화, 향우회 송년 1000, 장원석 창립주역, 김국주 지역
  //      대학, 김희동 20세기초 상, 김광식 구국, 퇴계 여성들, 김대원
  //      정자, 안동춘추 시베리아, 류영철 시간나면, 영가회 소식.
  //      8-10호(2024년 봄호, 22편): 김형동 재선, 인구 주춤, 하회 선유
  //      줄불, 명예愛전당, 예천탐방안내, 남영찬 22대국회, 여소야대,
  //      회원동정·부음, 황현택 자전, 농촌학교 폐교, 락고재하회, 교육
  //      발전특구, 신공항철도, 송강미술관, 고재성 출산율, 예천백종원,
  //      안동농협, 권혁수 전통문화, 김원 인터뷰, 권석화 인의예지, 김
  //      승종 중, 조정환 소상공인, 안동춘추 모스크바, 퇴계현판①, 향교,
  //      류영철 하, 영가회 소식.
  //      8-11호(2024년 여름호, 22편): 경북·대구 통합, 인구 881명 증가,
  //      국립경국대 확정, 월영교 1위, 바이오 국가첨단특화단지, 임청각
  //      복원, 재경향우회, 원로 간담회, 회원동정, 이희범 비망록, 탈춤
  //      페스 K-Festival 대상, 임하호둘레길 모음, 함은창 대법원, 3대
  //      특구, 영가회 300명 예천탐방, 김원곤 춘우세우, 권정달 인터뷰,
  //      조용 봉황 예천, 안동춘추 하, 문성하 안동브랜드, 안동춘추
  //      모스크바인연, 류대원 서애, 퇴계현판②, 남승룡 글읽는소리,
  //      영가회 소식.
  //      8-12호(2024년 가을호, 22편): 기업하기좋은도시, 탈춤페스 10/6,
  //      서울 발전전략설명회, 안동장터 서울시청, 사통팔달철도, 경북
  //      문화부·통합제자리, 회원동정, 권한기 노블레스, 답례품다양화,
  //      찜닭소주 33선, 청소년박람회, 이희범 국제질서, 2024바이오엑스포,
  //      스탠포드호텔, 이종훈 원전, 김자숙·권원오, 안동춘추 북풍,
  //      김광식 연어, 안동김씨 명문, 황만수 제도화, 안동유교 23단체,
  //      영가회 소식.
  //      8-13호(2025년 겨울호, 21편): 통합 북부저해, 을사년 휘호,
  //      정기총회 2/7, 2024 영가문화상 차전놀이·선행상 김인근, 윤상부
  //      회고 송구, 2024원로간담·송년1000, 권기창 CEO, 회원동정·미술상
  //      진교, KTX 1시간45분, 박정희 동상, 코레일 50% 할인, 차전놀이
  //      대통령상, 김광호 교만필패, 국립의대 국회토론, 산림과학 최우수,
  //      흥국 50주년, 비뚤어진 가치관 인성교육, 금경수·권세준, 권민수
  //      보이차, 안동춘추 만주, 청량산 먹과붓·을사년·권혁배 서예,
  //      이육사 백마탄초인 상, 안동사투리 24회, 영가회 소식.
  //      한 호 큰 그림: 4.10총선 김형동 재선 + 국립경국대 + 바이오
  //      국가첨단특화 + KTX 완전개통 + 흥국 50주년 + 영가문화상 차전.
  // v32: 9권 9호 시즌(2025년 봄~2026년 봄) 5개 호 119편.
  //      9-1호(2025년 봄호, 23편): 박대섭 9대 회장 선임, 정기총회 200,
  //      위임 인사, 자작추, 토계귀향취소, 영가회 소식, 영가탐방 한일,
  //      여유공간 6위, 석전 마리치고, 산불 성금, 권석환 전통 보고,
  //      2025 안동 1300억, 권명문, 청량산 하, 김자숙 시그널, 이재 안동
  //      봉사, 권유경 통합론, 이육사 하, 이재 안동춘추 주식회사,
  //      2026 동아시아 문화도시, 안동 고유 특색, 하회·월영 30선,
  //      미식 Vault 전통주.
  //      9-2호(2025년 여름호, 17편): 산불 극복 한마음, 산불 이후 재건,
  //      박장수 산불 발전, 스카치위스키 안동소주, 서윤희 예술미술,
  //      김지숙 남긴 것, 안동·전주 문화유산, 안동 인구 2년, 3억8000
  //      전달, 부회장 4명, 회원 동정, 이대형 네트워크, 이일영 공준,
  //      영가포럼 1차, 영가포럼 2차 9월, 안동 전통 왔니껴, 영가회 소식.
  //      9-3호(2025년 가을호, 15편): 2차 영가포럼 안동소주, 영가포럼
  //      특집, KBS 위매동, 권민영 의대, 안동·춘추 철도 육로, 안동 기제
  //      묘제, 전통 바른 이해, 산불 특별법, 48년 법인화, 동훈 50년,
  //      경북버스 지원, 회원자랑 김광수, 소주 찜닭 한일, 영가회 소식,
  //      영가회 소식 새출발.
  //      9-4호(2026년 신년호, 36편): 6월 선거 후보 즐비, 통합 건의서
  //      지방시대위, 2026 정기총회, 무이산 탐방 3월, 박대섭 신년사,
  //      명예회원 정원주·이재원, 토계 귀향 3월, 회원 동정, 권기창
  //      시정 방향, KTX 중앙선 증편, 월영진룡유주 브뤼셀 금상, 투자유치
  //      자문위원, 재경향우회 송년·11개 고교 체육, 의대 국립신설 5000,
  //      2025 고향사랑 역대최대, 안동유림 범암인사, 서울광장 왔니껴
  //      안동장터, 21세기 인문가치포럼 12회, 이상혁 엄마 스펙, 정기총회
  //      이모저모, 고고고 도덕살리기, 재경향우회 금경수, 건국훈장,
  //      이상룡 100주년, 천룡종가 김치, 안동 새 역사의 명당, 경북선
  //      안동 진입, 전통주 미래전략, 기로연·양로연, 이상룡·서애·유천,
  //      봉정사 만세루 보물, 장원석 꼭집 사랑방, 도산 고산정 명승,
  //      풍산柳氏 ⑫, 제15회 사투리 부모님, 영가회 소식·겨울철 국.
  //      9-5호(2026년 봄호, 28편): 한일정상회담 안동, 6.3 안동시장
  //      선거 국힘 3명·더민주 단일, 영가청년 출범, 무이산 본고장 탐방,
  //      영남만인소 142년만 광화문, 원로 간담회 2026 상반기, 1차 이사회
  //      9월 영가포럼, 분당일대 회원, 회원동정, 황현득 신간, 정덕영
  //      북부권 심장 양보, MoVi 이동서비스, 류필호 퇴계학 대중화,
  //      김은한 영가청년회, 회재 6회 귀향, 임대식 문화원, 어은 오시도
  //      사투리 버스, 안동향교 정태권령지, 민속주 안동소주 증류주 대상,
  //      상생지원위원회, 김원동 무이산 화재편, 이재독 농지 〈상〉,
  //      장태석 노사 상식, 풍산金氏 八蓮五桂 ⑬, 정수민 무이산 〈상〉,
  //      안동의 맛 ⑭ 가양주, 이아름 자녀 증여, 영가회 소식.
  //      한 호 큰 그림: 9대 박대섭 회장기 + 안동·예천 통합 의지 +
  //      영가청년 출범 + 무이산 해외문화탐방 + 한일정상회담 안동
  //      가시화 + 6.3 안동시장 선거.
  const seedKey = "content-seed-v32";
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
