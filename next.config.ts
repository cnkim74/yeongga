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
  // pdfjs-dist 는 서버에서 번들하지 않고 그대로 둔다.
  // 번들하면 워커 파일 경로가 깨져 "Setting up fake worker failed" 가 난다.
  serverExternalPackages: ["pdfjs-dist"],
  // 배포 때 pdfjs 워커 파일이 잘려 나가지 않도록 포함시킨다
  outputFileTracingIncludes: {
    "/admin/directory": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
  // 인물(四) 장을 기고(三) 로 합쳤다 — 옛 주소는 새 주소로 넘긴다
  async redirects() {
    return [
      {
        source: "/archive/saram/:slug",
        destination: "/archive/geul/:slug",
        permanent: true,
      },
      { source: "/archive/saram", destination: "/archive/geul", permanent: true },
      // 같은 기고문(40년사 404~407쪽)이 향 장에 중복돼 있어 기고 장으로 모았다
      {
        source: "/archive/hyang/andong-im-nak-yun-sison",
        destination: "/archive/geul/geul-andong-hyanggi",
        permanent: true,
      },
      // 2024년이 아니라 2021.9.30 서면 임시총회의 회칙 전면개정이었다
      {
        source: "/archive/yeongi/hoechik-gaejeong-2024",
        destination: "/archive/moim/2021-imsi-chonghoe",
        permanent: true,
      },
      {
        source: "/archive/moim/2024-imsi-chonghoe",
        destination: "/archive/moim/2021-imsi-chonghoe",
        permanent: true,
      },
      // 40년사 346쪽 원문은 '김영길'(한동대 총장) — 잘못 적힌 이름으로 만든 옛 주소
      {
        source: "/archive/geul/myungsa-kim-hogil-myeongil",
        destination: "/archive/geul/myungsa-kim-hogil-yeonggil",
        permanent: true,
      },
    ];
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
