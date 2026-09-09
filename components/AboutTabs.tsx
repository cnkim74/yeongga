// 소개 두 갈래 전환 탭 — 영가회 소개와 회장 인사말 | 역대 회장 소개
import Link from "next/link";

const TABS = [
  { key: "about", href: "/about", label: "영가회 소개와 회장 인사말" },
  { key: "presidents", href: "/about/presidents", label: "역대 회장 소개" },
] as const;

export function AboutTabs({ current }: { current: "about" | "presidents" }) {
  return (
    <nav
      aria-label="소개 분류"
      className="border-y border-[var(--color-rule)] bg-[var(--color-bg-soft)]"
    >
      <div className="mx-auto max-w-4xl px-6 flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map((t) => {
          const active = t.key === current;
          return (
            <Link
              key={t.key}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`relative whitespace-nowrap px-5 py-4 text-base font-medium transition ${
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
