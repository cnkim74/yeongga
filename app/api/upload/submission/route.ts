import { createUploadRoute } from "@/lib/upload-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 자료 제공 폼 첨부 — 비로그인 사용자도 접근 (publicAccess: true).
export const POST = createUploadRoute({
  bucket: "submissions",
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
  ],
  maxBytes: 30 * 1024 * 1024,
  publicAccess: true,
});
