import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;
const publicBase = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

export function r2Configured(): boolean {
  return Boolean(accountId && accessKeyId && secretAccessKey && bucket && publicBase);
}

let _client: S3Client | null = null;
function client(): S3Client {
  if (_client) return _client;
  if (!r2Configured()) {
    throw new Error("R2 환경 변수가 설정되지 않았습니다.");
  }
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
  });
  return _client;
}

export function r2PublicUrl(key: string): string {
  return `${publicBase}/${key.replace(/^\//, "")}`;
}

export async function r2Put(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket!,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return r2PublicUrl(key);
}

export async function r2Delete(key: string): Promise<void> {
  try {
    await client().send(
      new DeleteObjectCommand({
        Bucket: bucket!,
        Key: key,
      })
    );
  } catch {
    // 이미 없으면 무시
  }
}

export async function r2PresignedPutUrl(
  key: string,
  contentType: string,
  expiresInSec = 600
): Promise<string> {
  return getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: bucket!,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: expiresInSec }
  );
}

export function r2KeyFromPublicUrl(url: string): string | null {
  if (!publicBase || !url.startsWith(publicBase + "/")) return null;
  return url.slice(publicBase.length + 1);
}
