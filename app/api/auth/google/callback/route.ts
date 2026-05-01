import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import {
  exchangeCodeForToken,
  fetchUserInfo,
  getGoogleConfig,
} from "@/lib/oauth-google";
import { findOrLinkGoogleUser } from "@/lib/users-db";
import { sessionOptions, type SessionData } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function loginErrorRedirect(req: NextRequest, msg: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", msg);
  const res = NextResponse.redirect(url);
  res.cookies.delete("g_oauth_state");
  res.cookies.delete("g_oauth_next");
  return res;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error");

  const expectedState = req.cookies.get("g_oauth_state")?.value;
  const next = req.cookies.get("g_oauth_next")?.value ?? "/";

  if (errorParam) {
    return loginErrorRedirect(req, "구글 로그인이 취소되었습니다.");
  }
  if (!code || !state) {
    return loginErrorRedirect(req, "잘못된 요청입니다.");
  }
  if (!expectedState || state !== expectedState) {
    return loginErrorRedirect(req, "세션이 만료되었습니다. 다시 시도해 주세요.");
  }

  const { clientId, clientSecret } = getGoogleConfig();
  const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;

  let userInfo;
  try {
    const token = await exchangeCodeForToken({
      clientId,
      clientSecret,
      code,
      redirectUri,
    });
    userInfo = await fetchUserInfo(token.access_token);
  } catch (e) {
    console.error("[google oauth]", e);
    return loginErrorRedirect(req, "구글 로그인 중 오류가 발생했습니다.");
  }

  if (!userInfo.email_verified) {
    return loginErrorRedirect(req, "이메일이 검증되지 않은 구글 계정입니다.");
  }

  const user = await findOrLinkGoogleUser({
    googleId: userInfo.sub,
    email: userInfo.email,
    picture: userInfo.picture ?? null,
  });

  if (!user) {
    return loginErrorRedirect(
      req,
      "등록되지 않은 계정입니다. 운영진에게 문의해 주세요."
    );
  }

  const res = NextResponse.redirect(new URL(next, req.url));
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  session.user = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };
  await session.save();

  res.cookies.delete("g_oauth_state");
  res.cookies.delete("g_oauth_next");
  return res;
}
