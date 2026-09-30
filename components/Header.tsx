import { HeaderClient } from "./HeaderClient";

// 로그인 상태는 화면에서 /api/me 로 따로 물어본다.
// 여기서 쿠키를 읽으면 모든 페이지가 '방문할 때마다 새로 만드는 페이지'가
// 되어 CDN 이 맡아 주지 못한다.
export function Header() {
  return <HeaderClient />;
}
