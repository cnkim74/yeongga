import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listPosts } from "@/lib/board-db";
import { BoardList } from "@/components/BoardList";
import { NewsTabs } from "@/components/NewsTabs";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "공지사항 — 영가회 아카이브",
  description: "영가회가 회원들께 알리는 소식입니다.",
};

export default async function NoticePage() {
  const [user, all] = await Promise.all([getCurrentUser(), listPosts()]);
  const posts = all.filter((p) => p.pinned);

  return (
    <>
      <section className="relative pt-40 pb-16 overflow-hidden bg-[var(--color-bg-soft)]">
        <div className="mx-auto max-w-5xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-4">소식 · 公知</div>
          <h1 className="display text-5xl sm:text-7xl mb-4">공지사항</h1>
          <p className="text-base text-[var(--color-ink-soft)]">
            회에서 회원들께 알려 드리는 소식입니다.
          </p>
        </div>
      </section>

      <NewsTabs current="notice" />

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-[var(--color-ink-mute)]">총 {posts.length}건</div>
            {user && (
              <Link href="/board/new" className="btn-pill text-sm">
                ✏️ 글쓰기
              </Link>
            )}
          </div>

          <BoardList
            posts={posts}
            emptyText="아직 등록된 공지사항이 없습니다."
          />
        </div>
      </section>
    </>
  );
}
