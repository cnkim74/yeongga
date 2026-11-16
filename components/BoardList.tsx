// 자료실 목록 표 — 제목(자료 날짜) 기준으로 놓인 순서 그대로 번호를 붙인다.
// 쓴 날짜와 조회수는 보이지 않는다 (2026-11-16 요청).
import Link from "next/link";
import type { PostWithMeta } from "@/lib/board-db";

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

  return (
    <div className="border-t-2 border-[var(--color-ink)]">
      <div className="hidden sm:flex items-center gap-4 px-3 py-2.5 text-xs font-semibold text-[var(--color-ink-mute)] border-b border-[var(--color-rule)]">
        <span className="w-12 text-center shrink-0">번호</span>
        <span className="flex-1">제목</span>
        <span className="w-24 text-center shrink-0">작성자</span>
      </div>

      <ul>
        {posts.map((p, idx) => (
          <li key={p.id} className="border-b border-[var(--color-rule)]">
            <Link
              href={`/board/${p.id}`}
              className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-3 py-3 hover:bg-[var(--color-bg-soft)] transition"
            >
              <span className="hidden sm:block w-12 text-center shrink-0 text-sm text-[var(--color-ink-mute)]">
                {posts.length - idx}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
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
                  {p.author_name}
                </span>
              </span>
              <span className="hidden sm:block w-24 text-center shrink-0 text-sm text-[var(--color-ink-soft)] truncate">
                {p.author_name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
