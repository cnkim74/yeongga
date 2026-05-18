import { createUploadRoute, IMAGE_MIME_TYPES, IMAGE_MAX_BYTES } from "@/lib/upload-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createUploadRoute({
  bucket: "banners",
  allowedMimeTypes: IMAGE_MIME_TYPES,
  maxBytes: IMAGE_MAX_BYTES,
});
