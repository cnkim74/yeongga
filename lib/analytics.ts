// Google Analytics 4 (GA4) 헬퍼
//
// — 측정 ID 는 환경변수 NEXT_PUBLIC_GA_ID 로 주입.
// — 로드 자체는 app/layout.tsx 의 <GoogleAnalytics> 가 담당하므로,
//   여기서는 클라이언트에서 호출하는 gtag 래퍼만 정의한다.
//
// 영가회 사이트에 보내는 이벤트 일람:
//   member_gate_view  — 회원 전용 글 잠금 화면 도달
//   login_attempt     — 로그인 시도
//   login_success     — 로그인 성공
//   share_click       — 공유 버튼 클릭 (kakao/twitter/copy 등)
//   site_search       — 사이트 내 검색 (GA4 표준 search 와 유사)
//   ebook_open        — 이북 열기
//   ebook_page_change — 이북 페이지 넘김
//   ebook_close       — 이북 닫기
//
// user_properties:
//   membership — 'admin' | 'member' | 'visitor'

declare global {
  interface Window {
    // GA4 의 전역 gtag 함수. @next/third-parties 가 주입.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/** GA4 이벤트 전송 — 클라이언트에서만 호출. */
export function trackEvent(
  name: string,
  params: Record<string, string | number | boolean | null | undefined> = {}
) {
  if (typeof window === "undefined" || !window.gtag) return;
  // null/undefined 값은 GA 가 거르도록 제거
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    clean[k] = v;
  }
  window.gtag("event", name, clean);
}

/**
 * 사용자 구분 설정 — 로그인 상태와 권한을 user_properties 로 전달.
 *
 * 영가회는 작은 모임이라 user_id(이름/이메일) 는 의도적으로 보내지 않는다.
 * 'visitor / member / admin' 세 그룹의 행동 차이만 알면 충분.
 */
export type Membership = "admin" | "member" | "visitor";

export function identifyMembership(membership: Membership) {
  if (typeof window === "undefined" || !window.gtag || !GA_ID) return;
  window.gtag("set", "user_properties", { membership });
}
