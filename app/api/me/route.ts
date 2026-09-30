import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/me
 * 클라이언트에서 세션 확인용 — 최소한의 정보만 반환
 * (관리자 편집 버튼 표시, 회원전용 콘텐츠 잠금 해제 등에 사용)
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { loggedIn: false, isAdmin: false, user: null },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }
  return NextResponse.json(
    {
      loggedIn: true,
      isAdmin: user.role === "admin",
      name: user.name,
      // 머리글의 회원 메뉴가 쓰는 값 — 이름·아이디·구분
      user: { name: user.name, username: user.username, role: user.role },
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
