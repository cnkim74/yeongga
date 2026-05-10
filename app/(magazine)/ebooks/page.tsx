import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listEbooks } from "@/lib/ebooks-db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "이북 서재 — 영가회 아카이브",
  description: "영가회의 이북 자료를 열람하세요.",
};

export default async function EbooksPage() {
  const [user, ebooks] = await Promise.all([getCurrentUser(), listEbooks()]);

  const visibleEbooks = ebooks.filter(
    (e) => e.visibility === "public" || user
  );

  return (
    <>
      {/* HERO */}
      <section className="relative pt-40 pb-24 sm:pb-32 overflow-hidden bg-[var(--color-bg-soft)]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-4">서재 · e-Book</div>
          <h1 className="display text-5xl sm:text-7xl mb-6">이북 서재</h1>
          <p className="text-base sm:text-lg text-[var(--color-ink-soft)] leading-relaxed max-w-xl">
            영가회의 자료를 이북으로 열람하세요.
            {!user && (
              <span className="block mt-2 text-sm text-[var(--color-ink-mute)]">
                🔒 회원 전용 자료는{" "}
                <Link
                  href="/login?next=/ebooks"
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

      {/* 카드 그리드 */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          {visibleEbooks.length === 0 ? (
            <div className="border border-dashed border-[var(--color-rule)] rounded-2xl p-16 text-center text-[var(--color-ink-mute)]">
              아직 등록된 이북이 없습니다.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleEbooks.map((eb) => (
                <EbookCard key={eb.id} ebook={eb} isLoggedIn={Boolean(user)} />
              ))}
            </div>
          )}

          {/* 비로그인 + 잠긴 항목 안내 */}
          {!user && ebooks.some((e) => e.visibility === "members-only") && (
            <div className="mt-12 rounded-2xl border border-[var(--color-rule)] p-8 text-center">
              <div className="text-3xl mb-3">🔒</div>
              <p className="text-[var(--color-ink-soft)] text-sm">
                회원 전용 이북이 있습니다.{" "}
                <Link
                  href="/login?next=/ebooks"
                  className="text-[var(--color-accent)] underline"
                >
                  로그인
                </Link>
                하시면 모두 볼 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function EbookCard({
  ebook,
  isLoggedIn,
}: {
  ebook: {
    id: number;
    title: string;
    description: string | null;
    cover_url: string | null;
    visibility: "public" | "members-only";
  };
  isLoggedIn: boolean;
}) {
  const locked = ebook.visibility === "members-only" && !isLoggedIn;

  return (
    <div className="group flex flex-col rounded-2xl border border-[var(--color-rule)] overflow-hidden hover:shadow-lg transition-shadow bg-white">
      {/* 표지 */}
      <div className="relative aspect-[3/4] bg-[var(--color-bg-soft)] overflow-hidden">
        {ebook.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ebook.cover_url}
            alt={ebook.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="text-5xl" aria-hidden="true">📖</span>
            <span className="text-sm font-medium text-[var(--color-ink-soft)] line-clamp-3">
              {ebook.title}
            </span>
          </div>
        )}
        {ebook.visibility === "members-only" && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs">
            🔒 회원 전용
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="flex flex-col flex-1 p-4">
        <h2 className="display-md text-base mb-1 line-clamp-2">{ebook.title}</h2>
        {ebook.description && (
          <p className="text-sm text-[var(--color-ink-mute)] line-clamp-2 mb-3 flex-1">
            {ebook.description}
          </p>
        )}
        <div className="mt-auto pt-3">
          {locked ? (
            <Link
              href={`/login?next=/ebooks/${ebook.id}`}
              className="block w-full text-center text-sm py-2 px-4 rounded-full border border-[var(--color-rule)] text-[var(--color-ink-mute)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition"
            >
              로그인 후 읽기
            </Link>
          ) : (
            <Link
              href={`/ebooks/${ebook.id}`}
              className="block w-full text-center btn-pill text-sm"
            >
              읽기 →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
