import Link from "next/link";
import { presidents } from "@/lib/presidents";
import { PageHeroBg } from "@/components/PageHeroBg";
import { AboutTabs } from "@/components/AboutTabs";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "역대회장 — 영가회",
  description: "영가회를 이끌어 온 역대 회장들을 소개합니다.",
};

export default async function PresidentsPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-[var(--color-bg-soft)] pt-40 pb-16 sm:pb-20">
        <PageHeroBg page="about" />
        <div className="relative mx-auto max-w-4xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-5">
            ABOUT · 歷代 會長
          </div>
          <h1 className="display text-5xl sm:text-7xl mb-6">역대회장</h1>
          <p className="text-xl sm:text-2xl text-[var(--color-ink-soft)] max-w-2xl leading-relaxed">
            회를 이끌어 온 분들의 자리.
          </p>
        </div>
      </section>

      <AboutTabs current="presidents" />

      <section className="bg-[var(--color-paper)] py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-6">
          <ul className="divide-y divide-[var(--color-rule)] border-t border-b border-[var(--color-rule)]">
            {presidents.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/search?president=${p.id}`}
                  className="group flex items-baseline justify-between gap-6 px-2 py-6 transition hover:bg-[var(--color-bg-soft)]"
                >
                  <div>
                    <div className="mb-1 text-sm text-[var(--color-ink-mute)]">
                      제{p.dae}대
                      {p.current && (
                        <span className="ml-2 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[11px] font-semibold text-white">
                          현 회장
                        </span>
                      )}
                    </div>
                    <h2 className="display-md text-2xl sm:text-3xl transition group-hover:text-[var(--color-accent)]">
                      {p.name}
                      {p.hanja && (
                        <span className="ml-2 text-lg text-[var(--color-ink-mute)]">
                          {p.hanja}
                        </span>
                      )}
                    </h2>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm text-[var(--color-ink-mute)] tabular-nums">
                      {p.term}
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-ink-mute)] opacity-0 transition group-hover:opacity-100">
                      재임 기록 보기 →
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-sm text-[var(--color-ink-mute)]">
            회장 이름을 누르시면 그 시기의 기록을 모아 보실 수 있습니다. 역대
            회장 약사(略史)는{" "}
            <Link href="/ebooks" className="underline hover:text-[var(--color-ink)]">
              40년사 책자
            </Link>
            에서도 보실 수 있습니다.
          </p>

          <div className="mt-12 flex flex-wrap gap-3">
            <Link href="/about/greeting" className="btn-pill ghost">
              ← 회장 인사말
            </Link>
            <Link href="/archive" className="btn-pill">
              아카이브 펼치기 →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
