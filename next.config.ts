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
      // Vercel Blob 스토리지 (업로드된 이미지)
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Wikimedia Commons (about 페이지 배경 등 외부 이미지)
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },
};

export default nextConfig;
