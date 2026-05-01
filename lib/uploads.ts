import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 12 * 1024 * 1024; // 12MB

export type UploadResult =
  | { ok: true; publicPath: string; bytes: number }
  | { ok: false; error: string };

export async function saveUpload(
  bucket: "slides",
  file: File
): Promise<UploadResult> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "파일이 비어 있습니다." };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `파일이 너무 큽니다 (최대 ${MAX_BYTES / 1024 / 1024}MB).`,
    };
  }
  const ext = MIME_EXT[file.type];
  if (!ext) {
    return {
      ok: false,
      error: "지원하지 않는 형식입니다 (jpg, png, webp, gif 만 가능).",
    };
  }

  const dir = path.join(UPLOADS_ROOT, bucket);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${Date.now().toString(36)}-${crypto
    .randomBytes(6)
    .toString("hex")}.${ext}`;
  const fullPath = path.join(dir, filename);

  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(fullPath, buf);

  return {
    ok: true,
    publicPath: `/uploads/${bucket}/${filename}`,
    bytes: buf.length,
  };
}

export async function deleteUploadIfLocal(publicPath: string) {
  // 시드 파일(/slides/, /chapters/) 같은 외부는 건드리지 않음
  if (!publicPath.startsWith("/uploads/")) return;
  const full = path.join(process.cwd(), "public", publicPath);
  try {
    await fs.unlink(full);
  } catch {
    // 이미 없으면 무시
  }
}
