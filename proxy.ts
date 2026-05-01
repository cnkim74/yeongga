import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

export const config = {
  // 모든 페이지 + admin (정적 자산은 제외)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff|woff2|ttf)).*)",
  ],
};

const REALM = "Yeongga Archive (in development)";

function basicAuthChallenge() {
  return new NextResponse("인증이 필요합니다", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
    },
  });
}

function checkBasicAuth(req: NextRequest, expectedUser: string, expectedPass: string) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return false;
  try {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
    const sep = decoded.indexOf(":");
    if (sep < 0) return false;
    const user = decoded.slice(0, sep);
    const pass = decoded.slice(sep + 1);
    return user === expectedUser && pass === expectedPass;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  // ─── 1. 사이트 전체 비밀번호 게이트 (개발 중에만 사용) ──────────
  // SITE_PASSWORD 환경변수가 있으면 활성화. 없애면 자동으로 풀림.
  const sitePass = process.env.SITE_PASSWORD;
  if (sitePass) {
    const siteUser = process.env.SITE_USERNAME ?? "yeongga";
    if (!checkBasicAuth(req, siteUser, sitePass)) {
      return basicAuthChallenge();
    }
  }

  // ─── 2. /admin/* 만 관리자 세션 검증 ──────────────────────────
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const res = NextResponse.next();
    const session = await getIronSession<SessionData>(req, res, sessionOptions);

    if (!session.user || session.user.role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(
        req.nextUrl.pathname + req.nextUrl.search
      )}&need=admin`;
      return NextResponse.redirect(url);
    }
    return res;
  }

  return NextResponse.next();
}
