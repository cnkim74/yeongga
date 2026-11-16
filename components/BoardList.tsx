// 자료실 목록 표 — 제목(자료 날짜) 기준으로 놓인 순서 그대로 번호를 붙인다.
// 쓴 날짜·조회수·작성자는 보이지 않는다 (2026-11-16 요청). 제목을 크게.
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
      </div>

      <ul>
        {posts.map((p, idx) => (
          <li key={p.id} className="border-b border-[var(--color-rule)]">
            <Link
              href={`/board/${p.id}`}
              className="flex items-center gap-4 px-3 py-4 sm:py-5 hover:bg-[var(--color-bg-soft)] transition"
            >
              <span className="w-8 sm:w-12 text-center shrink-0 text-sm text-[var(--color-ink-mute)] tabular-nums">
                {posts.length - idx}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-medium text-[var(--color-ink)] leading-snug">
                    {p.title}
                  </span>
                  {p.attachment_count > 0 && (
                    <span className="text-sm text-[var(--color-ink-mute)] shrink-0">
                      📎{p.attachment_count}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
