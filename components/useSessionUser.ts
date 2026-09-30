"use client";

import { useEffect, useState } from "react";
import type { SessionUser } from "@/lib/session";

/**
 * 머리글에서 쓰는 로그인 상태.
 *
 * 예전에는 서버에서 쿠키를 읽어 내려보냈는데, 그러면 모든 페이지가
 * '방문할 때마다 새로 만드는 페이지'가 되어 CDN 이 못 맡아 준다.
 * 로그인 상태만 화면에서 따로 물어보면, 나머지 페이지는 미리 만들어 두고
 * CDN 이 곧바로 내줄 수 있다.
 *
 * 아직 모르는 동안(`loading`)은 로그인/회원 단추를 그리지 않아
 * 글자가 바뀌며 깜빡이는 일이 없게 한다.
 */
export function useSessionUser(): { user: SessionUser | null; loading: boolean } {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/me", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setUser(d?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { user, loading };
}
