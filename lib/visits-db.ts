import "server-only";
import { getDb } from "./db";

export type PageVisit = {
  id: number;
  path: string;
  visitor_id: string | null;
  user_id: number | null;
  referer: string | null;
  user_agent: string | null;
  visited_at: string;
};

function rowToVisit(row: Record<string, unknown>): PageVisit {
  return {
    id: Number(row.id),
    path: String(row.path),
    visitor_id: row.visitor_id ? String(row.visitor_id) : null,
    user_id: row.user_id == null ? null : Number(row.user_id),
    referer: row.referer ? String(row.referer) : null,
    user_agent: row.user_agent ? String(row.user_agent) : null,
    visited_at: String(row.visited_at),
  };
}

/** 방문 기록 추가 */
export async function recordVisit(data: {
  path: string;
  visitor_id?: string | null;
  user_id?: number | null;
  referer?: string | null;
  user_agent?: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO page_visits (path, visitor_id, user_id, referer, user_agent)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      data.path,
      data.visitor_id ?? null,
      data.user_id ?? null,
      data.referer ?? null,
      data.user_agent ?? null,
    ],
  });
}

/** 30일 이전 데이터 삭제 — 가끔(확률 1%) 호출 */
export async function purgeOldVisits(): Promise<void> {
  const db = await getDb();
  await db.execute(
    `DELETE FROM page_visits WHERE visited_at < datetime('now', '-30 days')`
  );
}

/** 어드민 대시보드 — 통계 요약 */
export type VisitStats = {
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
  uniqueToday: number;
  uniqueWeek: number;
};

export async function getVisitStats(): Promise<VisitStats> {
  const db = await getDb();
  const r = await db.execute(`
    SELECT
      SUM(CASE WHEN visited_at >= datetime('now', 'start of day') THEN 1 ELSE 0 END) AS today,
      SUM(CASE WHEN visited_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS week,
      SUM(CASE WHEN visited_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS month,
      COUNT(*) AS total,
      COUNT(DISTINCT CASE WHEN visited_at >= datetime('now', 'start of day') THEN visitor_id END) AS unique_today,
      COUNT(DISTINCT CASE WHEN visited_at >= datetime('now', '-7 days') THEN visitor_id END) AS unique_week
    FROM page_visits
  `);
  const row = r.rows[0];
  return {
    today: Number(row.today ?? 0),
    thisWeek: Number(row.week ?? 0),
    thisMonth: Number(row.month ?? 0),
    total: Number(row.total ?? 0),
    uniqueToday: Number(row.unique_today ?? 0),
    uniqueWeek: Number(row.unique_week ?? 0),
  };
}

/** 인기 페이지 Top N (지정 기간) */
export type TopPage = { path: string; visits: number; uniques: number };

export async function getTopPages(
  days: 1 | 7 | 30 = 7,
  limit = 10
): Promise<TopPage[]> {
  const db = await getDb();
  const r = await db.execute({
    sql: `
      SELECT path, COUNT(*) AS visits, COUNT(DISTINCT visitor_id) AS uniques
      FROM page_visits
      WHERE visited_at >= datetime('now', '-' || ? || ' days')
      GROUP BY path
      ORDER BY visits DESC
      LIMIT ?
    `,
    args: [days, limit],
  });
  return r.rows.map((row) => ({
    path: String(row.path),
    visits: Number(row.visits),
    uniques: Number(row.uniques),
  }));
}

/** 최근 방문 N건 */
export async function getRecentVisits(limit = 50): Promise<PageVisit[]> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT * FROM page_visits ORDER BY visited_at DESC LIMIT ?`,
    args: [limit],
  });
  return r.rows.map((row) => rowToVisit(row as unknown as Record<string, unknown>));
}

/** 시간대별 방문 (지난 24시간, 1시간 단위) */
export type HourlyBucket = { hour: string; visits: number };

export async function getHourlyVisits24h(): Promise<HourlyBucket[]> {
  const db = await getDb();
  const r = await db.execute(`
    SELECT
      strftime('%Y-%m-%d %H:00', visited_at) AS hour,
      COUNT(*) AS visits
    FROM page_visits
    WHERE visited_at >= datetime('now', '-24 hours')
    GROUP BY hour
    ORDER BY hour ASC
  `);
  return r.rows.map((row) => ({
    hour: String(row.hour),
    visits: Number(row.visits),
  }));
}

/** 일별 방문 (지난 14일) */
export type DailyBucket = { day: string; visits: number; uniques: number };

export async function getDailyVisits14d(): Promise<DailyBucket[]> {
  const db = await getDb();
  const r = await db.execute(`
    SELECT
      date(visited_at) AS day,
      COUNT(*) AS visits,
      COUNT(DISTINCT visitor_id) AS uniques
    FROM page_visits
    WHERE visited_at >= datetime('now', '-14 days')
    GROUP BY day
    ORDER BY day ASC
  `);
  return r.rows.map((row) => ({
    day: String(row.day),
    visits: Number(row.visits),
    uniques: Number(row.uniques),
  }));
}
