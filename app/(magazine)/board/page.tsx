import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listPosts } from "@/lib/board-db";
import { BoardList } from "@/components/BoardList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "자료실 — 영가회 아카이브",
  description: "영가회의 회의 자료와 행사 자료를 모아 둔 자리입니다.",
};

export default async function BoardPage() {
  // 자료실은 로그인 없이 열람 가능 — 글쓰기만 회원 전용.
  // 제목(자료 날짜) 기준 최근 것부터. 쓴 날짜·조회수는 보이지 않는다.
  const [user, posts] = await Promise.all([
    getCurrentUser(),
    listPosts("material"),
  ]);

  return (
    <>
      <section className="relative pt-40 pb-16 overflow-hidden bg-[var(--color-bg-soft)]">
        <div className="mx-auto max-w-5xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-4">資料室</div>
          <h1 className="display text-5xl sm:text-7xl mb-4">자료실</h1>
          <p className="text-base text-[var(--color-ink-soft)]">
            총회·이사회·행사 자료를 모아 둔 자리입니다.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-[var(--color-ink-mute)]">총 {posts.length}건</div>
            {user ? (
              <Link href="/board/new" className="btn-pill text-sm">
                ✏️ 글쓰기
              </Link>
            ) : (
              <Link
                href="/login?next=/board"
                className="text-sm text-[var(--color-ink-mute)] underline underline-offset-4 hover:text-[var(--color-ink)]"
              >
                로그인하고 글쓰기
              </Link>
            )}
          </div>

          <BoardList posts={posts} emptyText="아직 등록된 자료가 없습니다." />
        </div>
      </section>
    </>
  );
}
