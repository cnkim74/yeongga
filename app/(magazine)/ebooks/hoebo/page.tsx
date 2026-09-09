import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listEbooks } from "@/lib/ebooks-db";
import { isHoebo } from "@/lib/ebook-groups";
import { EbookGrid } from "@/components/EbookGrid";
import { PageHeroBg } from "@/components/PageHeroBg";
import { EbookTabs } from "@/components/EbookTabs";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "영가회보 — 영가회 이북",
  description: "《영가회보》 지난 호를 이북으로 열람하세요.",
};

export default async function HoeboPage() {
  const [user, ebooks] = await Promise.all([getCurrentUser(), listEbooks()]);

  const visible = ebooks.filter(
    (e) => isHoebo(e.title) && (e.visibility === "public" || user)
  );

  return (
    <>
      <section className="relative pt-40 pb-16 sm:pb-20 overflow-hidden bg-[var(--color-bg-soft)]">
        <PageHeroBg page="ebooks" />
        <div className="mx-auto max-w-6xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-4">서재 · 永嘉會報</div>
          <h1 className="display text-5xl sm:text-7xl mb-6">영가회보</h1>
          <p className="text-base sm:text-lg text-[var(--color-ink-soft)] leading-relaxed max-w-xl">
            회원 동정과 고향 소식을 담아 연 4회 펴내는 《영가회보》의 지난 호입니다.
            {!user && (
              <span className="block mt-2 text-sm text-[var(--color-ink-mute)]">
                🔒 회원 전용 자료는{" "}
                <Link
                  href="/login?next=/ebooks/hoebo"
                  className="underline hover:text-[var(--color-accent)]"
                >
                  로그인
                </Link>
                이 필요합니다.
              </span>
            )}
          </p>
        </div>
      </section>

      <EbookTabs current="hoebo" />

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <EbookGrid
            ebooks={visible}
            isLoggedIn={Boolean(user)}
            loginNext="/ebooks/hoebo"
            emptyText="아직 등록된 회보가 없습니다."
          />
        </div>
      </section>
    </>
  );
}
