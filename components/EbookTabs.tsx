// 이북 서재 두 갈래 전환 탭 — 40년사 책자 | 영가회보
import Link from "next/link";

const TABS = [
  { key: "book", href: "/ebooks", label: "40년사 책자" },
  { key: "hoebo", href: "/ebooks/hoebo", label: "영가회보" },
] as const;

export function EbookTabs({ current }: { current: "book" | "hoebo" }) {
  return (
    <nav
      aria-label="이북 분류"
      className="border-y border-[var(--color-rule)] bg-[var(--color-bg-soft)]"
    >
      <div className="mx-auto max-w-6xl px-6 flex gap-2">
        {TABS.map((t) => {
          const active = t.key === current;
          return (
            <Link
              key={t.key}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`relative px-5 py-4 text-base font-medium transition ${
                active
                  ? "text-[var(--color-ink)]"
                  : "text-[var(--color-ink-mute)] hover:text-[var(--color-ink)]"
              }`}
            >
              {t.label}
              {active && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-10 bg-[var(--color-ink)]"
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
