// R2 버킷 CORS 설정 — yeongga.com 에서 cdn.yeongga.com 의 PDF/이미지를
// fetch() 로 가져올 수 있게 하는 정책.
//
// 실행:
//   node scripts/r2-set-cors.mjs
//
// 필요 환경변수 (.env.local 또는 셸):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//
// 적용 후 확인:
//   curl -i -X OPTIONS \
//     -H "Origin: https://yeongga.com" \
//     -H "Access-Control-Request-Method: GET" \
//     https://cdn.yeongga.com/ebooks/<some>.pdf
//   → Access-Control-Allow-Origin: https://yeongga.com 가 응답에 나와야 정상

import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3";
import { readFileSync, existsSync } from "node:fs";

// 단순 .env.local 로더 — dotenv 없이 직접 읽기
function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const [, key, rawVal] = m;
    if (process.env[key]) continue; // 이미 있으면 덮지 않음
    let val = rawVal;
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  console.error(
    "❌ R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET 가 누락됐습니다."
  );
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

// 허용 정책 — yeongga.com 및 모든 서브도메인 + 로컬·Vercel 프리뷰
const corsRules = [
  {
    AllowedOrigins: [
      "https://yeongga.com",
      "https://www.yeongga.com",
      "https://*.yeongga.com",
      "https://*.vercel.app",
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    AllowedMethods: ["GET", "HEAD"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag", "Content-Length", "Content-Type", "Accept-Ranges"],
    MaxAgeSeconds: 3600,
  },
];

console.log(`▶ R2 버킷 〈${bucket}〉 에 CORS 정책 적용 중…`);
console.log(JSON.stringify({ CORSRules: corsRules }, null, 2));

try {
  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: { CORSRules: corsRules },
    })
  );
  console.log("✓ CORS 정책 적용 완료.");
} catch (err) {
  console.error("❌ CORS 적용 실패:", err.message);
  process.exit(1);
}

// 확인용 — 방금 적용한 정책 다시 읽어오기
try {
  const result = await client.send(
    new GetBucketCorsCommand({ Bucket: bucket })
  );
  console.log("\n▶ 현재 적용된 CORS 정책 (R2 에코백):");
  console.log(JSON.stringify(result.CORSRules, null, 2));
} catch (err) {
  console.warn("⚠ 적용 후 조회 실패:", err.message);
}

console.log(
  "\n다음 단계 — 브라우저에서 직접 확인:\n" +
    `  curl -i -X OPTIONS \\\n` +
    `    -H "Origin: https://yeongga.com" \\\n` +
    `    -H "Access-Control-Request-Method: GET" \\\n` +
    `    https://cdn.yeongga.com/ebooks/<some>.pdf\n` +
    "→ 응답에 Access-Control-Allow-Origin: https://yeongga.com 이 보이면 정상."
);
