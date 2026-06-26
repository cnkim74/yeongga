import {
  createUploadRoute,
  DOC_MAX_BYTES,
  saveDocumentUpload,
} from "@/lib/upload-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 자료실 — 모든 형식 허용. 확장자는 원본 파일명에서 보존.
export const POST = createUploadRoute({
  bucket: "documents",
  allowedMimeTypes: [], // allowAnyType 켜져 있어 검사 안 함
  allowAnyType: true,
  maxBytes: DOC_MAX_BYTES,
  saver: saveDocumentUpload,
});
