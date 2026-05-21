"use client";

// 마운트 시 GA4 이벤트 한 번 전송하는 작은 트래커.
// server component 안에서도 한 줄로 이벤트를 보낼 수 있게 해 준다.
//
//   <GAEventOnMount event="member_gate_view" params={{ chapter, slug }} />

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function GAEventOnMount({
  event,
  params,
}: {
  event: string;
  params?: Record<string, string | number | boolean | null | undefined>;
}) {
  useEffect(() => {
    trackEvent(event, params ?? {});
    // params 객체 새로 만들 때마다 다시 보내지 않도록 deps 비움.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  return null;
}
