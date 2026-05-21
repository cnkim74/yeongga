"use client";

// GAUserIdentify — 클라이언트에서 /api/me 조회 후 GA4 user_properties.membership 설정.
//
// app/layout.tsx 에 한 번 마운트하면, 모든 페이지에서 회원/비회원/관리자 그룹이
// GA4 보고서에 구분되어 보인다.
//
// - SSR 에 영향이 없도록 useEffect 안에서만 호출
// - /api/me 는 캐시 의존이 없으므로 layout 캐싱에 간섭하지 않음

import { useEffect } from "react";
import { identifyMembership } from "@/lib/analytics";

export function GAUserIdentify() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) {
          identifyMembership("visitor");
          return;
        }
        const data = (await res.json()) as {
          loggedIn?: boolean;
          isAdmin?: boolean;
        };
        if (cancelled) return;
        if (data.isAdmin) identifyMembership("admin");
        else if (data.loggedIn) identifyMembership("member");
        else identifyMembership("visitor");
      } catch {
        if (!cancelled) identifyMembership("visitor");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
