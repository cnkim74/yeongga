import { NextResponse, type NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin } from "@/lib/auth";
import { saveUpload } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COVER_MAX = 50 * 1024 * 1024; // 50MB — 표지 이미지 여유

export async function POST(req: NextRequest) {
  await requireAdmin();

  const contentType = req.headers.get("content-type") ?? "";

  // ── 로컬 개발/폴백: multipart form-data 로 직접 수신 ──
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "파일이 없습니다." },
        { status: 400 }
      );
    }
    const result = await saveUpload("ebooks", file);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json({ ok: true, url: result.publicPath, bytes: result.bytes });
  }

  // ── Vercel Blob: 클라이언트 직접 업로드 토큰 발급 (서버 4.5MB 우회) ──
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
        ],
        maximumSizeInBytes: COVER_MAX,
      }),
      onUploadCompleted: async () => {
        // 완료 후 DB 처리가 필요하면 여기에
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    console.error("[ebook-cover upload]", err);
    return NextResponse.json(
      { ok: false, error: "업로드 토큰 발급에 실패했습니다." },
      { status: 500 }
    );
  }
}
