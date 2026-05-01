import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { buildAuthorizeUrl, getGoogleConfig } from "@/lib/oauth-google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { clientId } = getGoogleConfig();
  const next = req.nextUrl.searchParams.get("next") ?? "/";
  const state = randomBytes(16).toString("hex");
  const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;

  const url = buildAuthorizeUrl({ clientId, redirectUri, state });
  const res = NextResponse.redirect(url);

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };
  res.cookies.set("g_oauth_state", state, cookieOpts);
  res.cookies.set("g_oauth_next", next, cookieOpts);

  return res;
}
