import {
  createUploadRoute,
  PDF_MAX_BYTES,
  saveEbookUpload,
} from "@/lib/upload-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createUploadRoute({
  bucket: "ebooks",
  allowedMimeTypes: ["application/pdf"],
  maxBytes: PDF_MAX_BYTES,
  forceExt: "pdf",
  saver: saveEbookUpload,
});
