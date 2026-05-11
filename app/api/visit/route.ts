import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { recordVisit, purgeOldVisits } from "@/lib/visits-db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_PATTERNS = [
  /bot/i,
  /spider/i,
  /crawl/i,
  /slurp/i,
  /facebookexternalhit/i,
  /headlesschrome/i,
  /lighthouse/i,
  /preview/i,
];

/** path 가 추적 대상인지 (어드민·API·정적자원 제외) */
function shouldTrack(path: string): boolean {
  if (!path) return false;
  if (path.startsWith("/admin")) return false;
  if (path.startsWith("/api")) return false;
  if (path.startsWith("/_next")) return false;
  if (path.startsWith("/login")) return false;
  if (path.match(/\.(ico|png|jpg|jpeg|svg|webp|gif|css|js|map)$/i)) return false;
  return true;
}

/** 방문자 익명 ID — IP + User-Agent + 짧은 솔트 해시 (개인정보 미저장) */
function makeVisitorId(ip: string, ua: string): string {
  const SALT = process.env.VISITOR_SALT ?? "yeongga-visitor-2026";
  return crypto
    .createHash("sha256")
    .update(`${ip}::${ua}::${SALT}`)
    .digest("hex")
    .slice(0, 16);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const path = String(body?.path ?? "").slice(0, 500);

    if (!shouldTrack(path)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const ua = req.headers.get("user-agent") ?? "";
    // 봇 필터링
    if (BOT_PATTERNS.some((re) => re.test(ua))) {
      return NextResponse.json({ ok: true, skipped: "bot" });
    }

    // IP 추출 (Vercel 헤더 우선)
    const ip =
      req.headers.get("x-real-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "0.0.0.0";

    const visitor_id = makeVisitorId(ip, ua);
    const referer = req.headers.get("referer")?.slice(0, 500) ?? null;

    // 로그인 사용자라면 user_id 도 함께 (실패해도 무시)
    let user_id: number | null = null;
    try {
      const user = await getCurrentUser();
      if (user) user_id = user.id;
    } catch {}

    await recordVisit({
      path,
      visitor_id,
      user_id,
      referer,
      user_agent: ua.slice(0, 300),
    });

    // 1% 확률로 오래된 데이터 정리 (cron 대용)
    if (Math.random() < 0.01) {
      purgeOldVisits().catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[visit]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
