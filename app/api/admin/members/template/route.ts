import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CSV 템플릿 — 엑셀에서 그대로 열어 편집 후 다시 업로드 가능
export async function GET() {
  await requireAdmin();
  const lines = [
    "이름,아이디,이메일,권한,가입일,비밀번호,메모",
    "김영석,kim,kim@example.com,회원,1998-10-12,,초대 회원 · 회장",
    "박정자,park,park@example.com,회원,1998-10-12,,서기",
    "관리자샘플,sample-admin,sample@example.com,관리자,2026-05-01,,",
  ];
  // BOM + UTF-8 — 엑셀이 한글 깨짐 없이 열 수 있도록
  const body = "﻿" + lines.join("\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="yeongga-members-template.csv"',
    },
  });
}
