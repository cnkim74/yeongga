// 소식 목록 표 — 공지사항 / 자료실 두 페이지가 함께 쓴다.
import Link from "next/link";
import type { PostWithMeta } from "@/lib/board-db";

function fmtDate(s: string): string {
  return s.slice(0, 10);
}

export function BoardList({
  posts,
  emptyText = "아직 등록된 글이 없습니다.",
}: {
  posts: PostWithMeta[];
  emptyText?: string;
}) {
  if (posts.length === 0) {
    return (
      <div className="border border-dashed border-[var(--color-rule)] rounded-2xl p-16 text-center text-[var(--color-ink-mute)]">
        {emptyText}
      </div>
    );
  }

  // 최신글이 큰 번호. 공지는 번호 대신 📌.
  const nonPinnedTotal = posts.filter((p) => !p.pinned).length;
  let seen = 0;
  const displayNo = posts.map((p) => {
    if (p.pinned) return null;
    seen += 1;
    return nonPinnedTotal - seen + 1;
  });

  return (
    <div className="border-t-2 border-[var(--color-ink)]">
      <div className="hidden sm:flex items-center gap-4 px-3 py-2.5 text-xs font-semibold text-[var(--color-ink-mute)] border-b border-[var(--color-rule)]">
        <span className="w-12 text-center shrink-0">번호</span>
        <span className="flex-1">제목</span>
        <span className="w-24 text-center shrink-0">작성자</span>
        <span className="w-24 text-center shrink-0">날짜</span>
        <span className="w-14 text-center shrink-0">조회</span>
      </div>

      <ul>
        {posts.map((p, idx) => (
          <li
            key={p.id}
            className={`border-b border-[var(--color-rule)] ${
              p.pinned ? "bg-[var(--color-bg-soft)]" : ""
            }`}
          >
            <Link
              href={`/board/${p.id}`}
              className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-3 py-3 hover:bg-[var(--color-bg-soft)] transition"
            >
              <span className="hidden sm:block w-12 text-center shrink-0 text-sm text-[var(--color-ink-mute)]">
                {p.pinned ? "📌" : displayNo[idx]}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  {p.pinned && (
                    <span className="text-[11px] font-semibold text-[var(--color-accent)] shrink-0">
                      공지
                    </span>
                  )}
                  <span className="font-medium text-[var(--color-ink)] truncate">
                    {p.title}
                  </span>
                  {p.attachment_count > 0 && (
                    <span className="text-xs text-[var(--color-ink-mute)] shrink-0">
                      📎{p.attachment_count}
                    </span>
                  )}
                </span>
                <span className="sm:hidden block text-xs text-[var(--color-ink-mute)] mt-1">
                  {p.author_name} · {fmtDate(p.created_at)} · 조회 {p.views}
                </span>
              </span>
              <span className="hidden sm:block w-24 text-center shrink-0 text-sm text-[var(--color-ink-soft)] truncate">
                {p.author_name}
              </span>
              <span className="hidden sm:block w-24 text-center shrink-0 text-sm text-[var(--color-ink-mute)]">
                {fmtDate(p.created_at)}
              </span>
              <span className="hidden sm:block w-14 text-center shrink-0 text-sm text-[var(--color-ink-mute)]">
                {p.views}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
