import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  saveUpload,
  saveEbookUpload,
  generateUploadKey,
  extFromMime,
  type Bucket,
} from "@/lib/uploads";
import { r2Configured, r2PresignedPutUrl, r2PublicUrl } from "@/lib/r2";

export interface UploadRouteConfig {
  bucket: Bucket;
  allowedMimeTypes: readonly string[];
  maxBytes: number;
  // Ebook PDF처럼 saveUpload 분기가 다른 경우에 쓰는 슬롯.
  // 미설정 시 saveUpload(bucket, file) 사용.
  saver?: (file: File) => Promise<
    | { ok: true; publicPath: string; bytes: number }
    | { ok: false; error: string }
  >;
  // MIME → 확장자 추출 결과를 덮어쓸 때 사용 (예: PDF는 항상 "pdf").
  forceExt?: string;
  // 익명 접근 허용 — submission 같은 비로그인 폼 전용.
  publicAccess?: boolean;
}

/**
 * 공통 업로드 라우트 핸들러.
 *
 * 두 가지 모드 자동 분기:
 * 1. JSON {mode: "presign", filename, contentType, size}
 *    → R2 presigned PUT URL 발급 (브라우저가 직접 R2에 업로드, 함수 본문 한도 우회)
 * 2. multipart/form-data
 *    → 로컬 개발용·폴백. 서버가 직접 받아 saveUpload 호출.
 */
export function createUploadRoute(config: UploadRouteConfig) {
  return async function POST(req: NextRequest) {
    if (!config.publicAccess) {
      await requireAdmin();
    }
    const contentType = req.headers.get("content-type") ?? "";

    // ── presigned URL 발급 (Vercel Blob client upload 대체) ──
    if (contentType.includes("application/json")) {
      if (!r2Configured()) {
        return NextResponse.json(
          { ok: false, error: "R2 스토리지가 설정되지 않았습니다. 환경 변수를 확인하세요." },
          { status: 500 }
        );
      }
      let body: { mode?: string; filename?: string; contentType?: string; size?: number };
      try {
        body = await req.json();
      } catch {
        return NextResponse.json(
          { ok: false, error: "잘못된 요청 본문입니다." },
          { status: 400 }
        );
      }
      if (body.mode !== "presign") {
        return NextResponse.json(
          { ok: false, error: "지원하지 않는 모드입니다." },
          { status: 400 }
        );
      }
      const mime = body.contentType ?? "";
      if (!config.allowedMimeTypes.includes(mime)) {
        return NextResponse.json(
          { ok: false, error: `허용되지 않는 형식입니다. (${mime})` },
          { status: 400 }
        );
      }
      if (typeof body.size !== "number" || body.size <= 0) {
        return NextResponse.json(
          { ok: false, error: "파일 크기 정보가 잘못되었습니다." },
          { status: 400 }
        );
      }
      if (body.size > config.maxBytes) {
        return NextResponse.json(
          {
            ok: false,
            error: `파일이 너무 큽니다 (최대 ${Math.floor(config.maxBytes / 1024 / 1024)}MB).`,
          },
          { status: 400 }
        );
      }
      const ext = config.forceExt ?? extFromMime(mime) ?? "bin";
      const key = generateUploadKey(config.bucket, ext);
      const uploadUrl = await r2PresignedPutUrl(key, mime);
      const publicUrl = r2PublicUrl(key);
      return NextResponse.json({
        ok: true,
        uploadUrl,
        publicUrl,
        key,
        contentType: mime,
      });
    }

    // ── multipart/form-data 직접 수신 (로컬 개발·폴백) ──
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { ok: false, error: "파일이 없습니다." },
          { status: 400 }
        );
      }
      const result = config.saver
        ? await config.saver(file)
        : await saveUpload(config.bucket, file);
      if (!result.ok) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        url: result.publicPath,
        bytes: result.bytes,
      });
    }

    return NextResponse.json(
      { ok: false, error: "지원하지 않는 Content-Type 입니다." },
      { status: 400 }
    );
  };
}

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const IMAGE_MAX_BYTES = 50 * 1024 * 1024; // 50MB
export const PDF_MAX_BYTES = 300 * 1024 * 1024; // 300MB

export { saveEbookUpload };
