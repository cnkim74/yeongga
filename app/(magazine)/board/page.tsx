import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { listPosts } from "@/lib/board-db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "자료실 — 영가회 아카이브",
  description: "영가회 회원 자료실.",
};

function fmtDate(s: string): string {
  // "YYYY-MM-DD HH:MM:SS" → 오늘이면 HH:MM, 아니면 YYYY-MM-DD
  const datePart = s.slice(0, 10);
  return datePart;
}

export default async function BoardPage() {
  await requireMember("/board");
  const posts = await listPosts();
  const total = posts.length;

  // 비공지 글에 번호 부여 (최신글이 큰 번호). 공지는 📌 표시.
  const nonPinnedTotal = posts.filter((p) => !p.pinned).length;
  let seenNonPinned = 0;
  const displayNo = posts.map((p) => {
    if (p.pinned) return null;
    seenNonPinned += 1;
    return nonPinnedTotal - seenNonPinned + 1;
  });

  return (
    <>
      <section className="relative pt-40 pb-16 overflow-hidden bg-[var(--color-bg-soft)]">
        <div className="mx-auto max-w-5xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-4">회원 전용 · 資料室</div>
          <h1 className="display text-5xl sm:text-7xl mb-4">자료실</h1>
          <p className="text-base text-[var(--color-ink-soft)]">
            영가회 회원들의 소식과 자료를 나누는 공간입니다.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-[var(--color-ink-mute)]">총 {total}건</div>
            <Link href="/board/new" className="btn-pill text-sm">
              ✏️ 글쓰기
            </Link>
          </div>

          {total === 0 ? (
            <div className="border border-dashed border-[var(--color-rule)] rounded-2xl p-16 text-center text-[var(--color-ink-mute)]">
              아직 등록된 글이 없습니다. 첫 글을 작성해 보세요.
            </div>
          ) : (
            <div className="border-t-2 border-[var(--color-ink)]">
              {/* 헤더 (데스크탑) */}
              <div className="hidden sm:flex items-center gap-4 px-3 py-2.5 text-xs font-semibold text-[var(--color-ink-mute)] border-b border-[var(--color-rule)]">
                <span className="w-12 text-center shrink-0">번호</span>
                <span className="flex-1">제목</span>
                <span className="w-24 text-center shrink-0">작성자</span>
                <span className="w-24 text-center shrink-0">날짜</span>
                <span className="w-14 text-center shrink-0">조회</span>
              </div>

              <ul>
                {posts.map((p, idx) => {
                  const num = displayNo[idx];
                  return (
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
                          {p.pinned ? "📌" : num}
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
                          {/* 모바일 메타 */}
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
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
