import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  experimental: {
    // 고해상도 갤러리 사진(20~50MB) 업로드 여유.
    // 이미지 파일은 /api/upload/photo 라우트 — 별도 body 제한 없음.
    // serverActions 한도는 폼 기반 업로드 안전망용.
    serverActions: { bodySizeLimit: "50mb" },
  },
  images: {
    remotePatterns: [
      // Cloudflare R2 — 영가회 커스텀 도메인 (운영)
      { protocol: "https", hostname: "cdn.yeongga.com" },
      // Cloudflare R2 — pub-*.r2.dev (테스트·폴백)
      { protocol: "https", hostname: "*.r2.dev" },
      // Vercel Blob (마이그레이션 기간 동안 호환 유지)
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Wikimedia Commons (about 페이지 배경 등 외부 이미지)
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },
};

export default nextConfig;
