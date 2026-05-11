import { NextResponse, type NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX = 30 * 1024 * 1024; // 30MB

/**
 * 자료 제공 폼 첨부 — 비로그인 사용자도 접근 (인증 없음).
 * 봇 방지를 위해 application/json 토큰 발급만 받음.
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { ok: false, error: "지원하지 않는 요청 형식입니다." },
      { status: 400 }
    );
  }
  try {
    const body = (await req.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "application/pdf",
        ],
        maximumSizeInBytes: MAX,
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (err) {
    console.error("[submission upload]", err);
    return NextResponse.json(
      { ok: false, error: "업로드 토큰 발급 실패" },
      { status: 500 }
    );
  }
}
