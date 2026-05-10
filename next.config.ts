import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  experimental: {
    // 모바일 사진(5~10MB) 업로드를 받기 위한 서버 액션 body 한도 상향.
    // 슬라이드 등 form 기반 업로드 안전망 — 이미지 업로드는 /api/upload/* 로
    // 옮겨가는 중이라 점진적으로 줄여도 됨.
    serverActions: { bodySizeLimit: "15mb" },
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
