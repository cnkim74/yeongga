import { redirect } from "next/navigation";

// 공지사항은 2026-11-16 없앴다 — 옛 주소는 자료실로 보낸다.
export default function NoticePage() {
  redirect("/board");
}
