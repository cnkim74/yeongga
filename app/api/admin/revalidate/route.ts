import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 앱 밖에서 DB 를 직접 고쳤을 때(마이그레이션·일괄 게시 등) 캐시를 즉시 비우는 용도.
// 평소 편집은 admin action 이 알아서 revalidateTag 를 부르므로 쓸 일이 없다.
const TAGS = [
  "articles",
  "ebooks",
  "gallery",
  "slides",
  "banners",
  "backgrounds",
  "members",
] as const;

async function flush() {
  await requireAdmin();
  for (const tag of TAGS) {
    revalidateTag(tag, "max");
  }
  return NextResponse.json({ ok: true, revalidated: TAGS });
}

export async function POST() {
  return flush();
}

// 관리자가 브라우저에서 주소를 열어 바로 갱신할 수 있게 GET 도 받는다.
// (캐시 무효화는 멱등하고 admin 인증을 거치므로 안전)
export async function GET() {
  return flush();
}
