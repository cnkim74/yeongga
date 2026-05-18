import { createUploadRoute, IMAGE_MIME_TYPES } from "@/lib/upload-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createUploadRoute({
  bucket: "chapters",
  allowedMimeTypes: IMAGE_MIME_TYPES,
  maxBytes: 30 * 1024 * 1024,
});
