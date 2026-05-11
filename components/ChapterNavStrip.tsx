import Link from "next/link";
import { chapters } from "@/lib/chapters";

/**
 * 챕터 페이지 상단(hero 아래)에 표시되는 가로 챕터 네비 스트립.
 * 현재 챕터는 강조, comingSoon 챕터는 비활성.
 */
export function ChapterNavStrip({ current }: { current: string }) {
  return (
    <nav
      aria-label="장(章) 이동"
      className="border-y border-[var(--color-rule)] bg-[var(--color-bg-soft)]"
    >
      <div className="mx-auto max-w-6xl">
        {/* 가로 스크롤 가능 — 모바일에선 좌우로 밀어서 */}
        <ul className="flex items-stretch overflow-x-auto no-scrollbar">
          {chapters.map((c) => {
            const active = c.slug === current;
            const disabled = c.comingSoon;
            const content = (
              <div
                className={[
                  "flex flex-col items-center justify-center min-w-[112px] sm:min-w-[140px] px-5 py-4 transition relative",
                  active
                    ? "text-[var(--color-ink)] bg-white"
                    : disabled
                    ? "text-[var(--color-ink-mute)] opacity-50 cursor-not-allowed"
                    : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-white/60",
                ].join(" ")}
              >
                <span className="font-serif text-base sm:text-lg leading-none mb-1.5 opacity-80">
                  {c.number}
                </span>
                <span className="text-sm font-medium leading-none">
                  {c.title}
                </span>
                {disabled && (
                  <span className="text-[10px] mt-1 opacity-70">準備中</span>
                )}
                {active && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2px] bg-[var(--color-ink)]"
                    aria-hidden="true"
                  />
                )}
              </div>
            );
            return (
              <li key={c.slug} className="shrink-0">
                {disabled ? (
                  <span aria-disabled="true">{content}</span>
                ) : (
                  <Link
                    href={`/archive/${c.slug}`}
                    aria-current={active ? "page" : undefined}
                    className="block"
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
