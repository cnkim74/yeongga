// 이북 카드 그리드 — 《40년사 책자》·《영가회보》 두 페이지가 함께 쓴다.
import Link from "next/link";
import Image from "next/image";

export type EbookCardData = {
  id: number;
  title: string;
  description: string | null;
  cover_url: string | null;
  visibility: "public" | "members-only";
};

export function EbookGrid({
  ebooks,
  isLoggedIn,
  loginNext,
  emptyText = "아직 등록된 이북이 없습니다.",
}: {
  ebooks: EbookCardData[];
  isLoggedIn: boolean;
  loginNext: string;
  emptyText?: string;
}) {
  if (ebooks.length === 0) {
    return (
      <div className="border border-dashed border-[var(--color-rule)] rounded-2xl p-16 text-center text-[var(--color-ink-mute)]">
        {emptyText}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ebooks.map((eb) => (
          <EbookCard key={eb.id} ebook={eb} isLoggedIn={isLoggedIn} />
        ))}
      </div>

      {!isLoggedIn && ebooks.some((e) => e.visibility === "members-only") && (
        <div className="mt-12 rounded-2xl border border-[var(--color-rule)] p-8 text-center">
          <div className="text-3xl mb-3">🔒</div>
          <p className="text-[var(--color-ink-soft)] text-sm">
            회원 전용 이북이 있습니다.{" "}
            <Link
              href={`/login?next=${loginNext}`}
              className="text-[var(--color-accent)] underline"
            >
              로그인
            </Link>
            하시면 모두 볼 수 있습니다.
          </p>
        </div>
      )}
    </>
  );
}

function EbookCard({
  ebook,
  isLoggedIn,
}: {
  ebook: EbookCardData;
  isLoggedIn: boolean;
}) {
  const locked = ebook.visibility === "members-only" && !isLoggedIn;

  return (
    <div className="group flex flex-col rounded-2xl border border-[var(--color-rule)] overflow-hidden hover:shadow-lg transition-shadow bg-white">
      <div className="relative aspect-[3/4] bg-[var(--color-bg-soft)] overflow-hidden">
        {ebook.cover_url ? (
          <Image
            src={ebook.cover_url}
            alt={ebook.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
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
