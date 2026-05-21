// Google Analytics 4 Data API 래퍼
//
// 서버 사이드에서 GA4 데이터를 조회한다. 어드민 페이지의 〈접속 통계〉 위젯에서만 호출.
//
// 환경변수:
//   GA_PROPERTY_ID            — GA4 속성 ID (9~10자리 숫자, 측정 ID 아님)
//   GA_SERVICE_ACCOUNT_JSON   — 서비스 계정 키 JSON 문자열 전체
//
// 모든 함수는 환경변수가 없으면 빈 결과(또는 null)를 반환해 어드민 페이지가
// 그래도 렌더되도록 한다.

import { BetaAnalyticsDataClient } from "@google-analytics/data";

const PROPERTY_ID = process.env.GA_PROPERTY_ID;
const SERVICE_ACCOUNT_JSON = process.env.GA_SERVICE_ACCOUNT_JSON;

let cachedClient: BetaAnalyticsDataClient | null = null;

/** GA4 Data API 클라이언트 — 환경변수가 없으면 null. */
function getClient(): BetaAnalyticsDataClient | null {
  if (!PROPERTY_ID || !SERVICE_ACCOUNT_JSON) return null;
  if (cachedClient) return cachedClient;
  try {
    const credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
    cachedClient = new BetaAnalyticsDataClient({ credentials });
    return cachedClient;
  } catch (err) {
    console.error("[ga-analytics] failed to init client:", err);
    return null;
  }
}

/** GA 가 설정돼 있는지 ─ 어드민 페이지에서 안내 배너 표시용. */
export function isAnalyticsConfigured(): boolean {
  return Boolean(PROPERTY_ID && SERVICE_ACCOUNT_JSON);
}

const PROPERTY = () => `properties/${PROPERTY_ID}`;

// ─── 위젯 1: 방문자 추이 ──────────────────────────────────────────

export type VisitorPoint = {
  date: string; // YYYY-MM-DD
  activeUsers: number;
  pageViews: number;
};

export type VisitorSummary = {
  /** 지난 30일 일자별 추이 (오래→최근). */
  daily: VisitorPoint[];
  /** 오늘. */
  today: { activeUsers: number; pageViews: number };
  /** 어제. */
  yesterday: { activeUsers: number; pageViews: number };
  /** 지난 7일 합계. */
  last7d: { activeUsers: number; pageViews: number };
  /** 지난 28일 합계 — MAU 근사. */
  last28d: { activeUsers: number; pageViews: number };
};

export async function getVisitorSummary(): Promise<VisitorSummary | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const [dailyRes, todayRes, yesterdayRes, last7Res, last28Res] =
      await Promise.all([
        // 일자별 30일
        client.runReport({
          property: PROPERTY(),
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "activeUsers" },
            { name: "screenPageViews" },
          ],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        }),
        // 오늘
        client.runReport({
          property: PROPERTY(),
          dateRanges: [{ startDate: "today", endDate: "today" }],
          metrics: [
            { name: "activeUsers" },
            { name: "screenPageViews" },
          ],
        }),
        // 어제
        client.runReport({
          property: PROPERTY(),
          dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }],
          metrics: [
            { name: "activeUsers" },
            { name: "screenPageViews" },
          ],
        }),
        // 지난 7일
        client.runReport({
          property: PROPERTY(),
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          metrics: [
            { name: "activeUsers" },
            { name: "screenPageViews" },
          ],
        }),
        // 지난 28일
        client.runReport({
          property: PROPERTY(),
          dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
          metrics: [
            { name: "activeUsers" },
            { name: "screenPageViews" },
          ],
        }),
      ]);

    const daily: VisitorPoint[] = (dailyRes[0].rows ?? []).map((r) => {
      const d = r.dimensionValues?.[0]?.value ?? ""; // "20260520"
      const iso =
        d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;
      return {
        date: iso,
        activeUsers: Number(r.metricValues?.[0]?.value ?? 0),
        pageViews: Number(r.metricValues?.[1]?.value ?? 0),
      };
    });

    const sumOf = (res: typeof todayRes) => ({
      activeUsers: Number(res[0].rows?.[0]?.metricValues?.[0]?.value ?? 0),
      pageViews: Number(res[0].rows?.[0]?.metricValues?.[1]?.value ?? 0),
    });

    return {
      daily,
      today: sumOf(todayRes),
      yesterday: sumOf(yesterdayRes),
      last7d: sumOf(last7Res),
      last28d: sumOf(last28Res),
    };
  } catch (err) {
    console.error("[ga-analytics] getVisitorSummary failed:", err);
    return null;
  }
}

// ─── 위젯 2: 인기 글 TOP 10 ───────────────────────────────────────

export type TopPage = {
  path: string;
  title: string | null;
  pageViews: number;
  activeUsers: number;
};

export async function getTopPages(
  limit = 10,
  days = 28
): Promise<TopPage[]> {
  const client = getClient();
  if (!client) return [];

  try {
    const [res] = await client.runReport({
      property: PROPERTY(),
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "activeUsers" },
      ],
      orderBys: [
        { metric: { metricName: "screenPageViews" }, desc: true },
      ],
      limit,
    });

    return (res.rows ?? []).map((r) => ({
      path: r.dimensionValues?.[0]?.value ?? "",
      title: r.dimensionValues?.[1]?.value ?? null,
      pageViews: Number(r.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
    }));
  } catch (err) {
    console.error("[ga-analytics] getTopPages failed:", err);
    return [];
  }
}

// ─── 위젯 3: 이벤트 발생 횟수 ─────────────────────────────────────

export type EventCount = {
  name: string;
  count: number;
};

export async function getEventCounts(days = 28): Promise<EventCount[]> {
  const client = getClient();
  if (!client) return [];

  try {
    const [res] = await client.runReport({
      property: PROPERTY(),
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    });

    return (res.rows ?? []).map((r) => ({
      name: r.dimensionValues?.[0]?.value ?? "",
      count: Number(r.metricValues?.[0]?.value ?? 0),
    }));
  } catch (err) {
    console.error("[ga-analytics] getEventCounts failed:", err);
    return [];
  }
}
