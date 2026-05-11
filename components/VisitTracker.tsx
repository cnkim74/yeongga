"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * 페이지 이동 시 /api/visit 로 방문 기록을 보냄.
 * 봇은 JS 미실행이라 자동으로 필터링됨.
 * 같은 path 의 연속 호출은 중복 방지.
 */
export function VisitTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    // 어드민·로그인 경로는 클라이언트에서도 건너뜀 (서버에서도 한 번 더 필터)
    if (pathname.startsWith("/admin") || pathname.startsWith("/login")) return;

    // beacon API 가능하면 사용 (페이지 이동 중에도 안전 전송)
    const payload = JSON.stringify({ path: pathname });
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/visit", blob);
        return;
      }
    } catch {}

    // 폴백: fetch keepalive
    fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
