import { NextResponse, type NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin } from "@/lib/auth";
import { saveUpload } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLIDE_MAX = 15 * 1024 * 1024; // 15MB

export async function POST(req: NextRequest) {
  await requireAdmin();

  const contentType = req.headers.get("content-type") ?? "";

  // ── 로컬 개발 / 작은 파일: multipart form-data 로 직접 수신 ──
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "파일이 없습니다." },
        { status: 400 }
      );
    }
    const result = await saveUpload("slides", file);
    if (!result.ok) return NextResponse.json(result, { status: 400 });
    return NextResponse.json({
      ok: true,
      url: result.publicPath,
      bytes: result.bytes,
    });
  }

  // ── Vercel Blob: 클라이언트 직접 업로드 토큰 발급 (4.5MB 우회) ──
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
        maximumSizeInBytes: SLIDE_MAX,
      }),
      onUploadCompleted: async () => {
        // 완료 후 추가 처리가 필요하면 여기에
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    console.error("[slide upload]", err);
    return NextResponse.json(
      { ok: false, error: "업로드 토큰 발급에 실패했습니다." },
      { status: 500 }
    );
  }
}
