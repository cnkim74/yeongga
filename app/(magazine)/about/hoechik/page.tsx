import Link from "next/link";
import { PageHeroBg } from "@/components/PageHeroBg";
import { AboutTabs } from "@/components/AboutTabs";
import {
  HOECHIK,
  HOECHIK_HISTORY,
  HOECHIK_ENFORCED,
  HOECHIK_PDF,
} from "@/lib/hoechik";

export const dynamic = "force-static";

export const metadata = {
  title: "회칙 — 영가회",
  description:
    "영가회 회칙 전문. 1977년 제정 이후의 개정 이력과 2025년 7월 1일 시행본을 담았습니다.",
};

export default function HoechikPage() {
  const current = HOECHIK_HISTORY[HOECHIK_HISTORY.length - 1];

  return (
    <>
      <section className="relative overflow-hidden bg-[var(--color-bg-soft)] pt-40 pb-16 sm:pb-20">
        <PageHeroBg page="about" />
        <div className="relative mx-auto max-w-4xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-5">
            ABOUT · 會則
          </div>
          <h1 className="display text-5xl sm:text-7xl mb-6">회칙</h1>
          <p className="text-xl sm:text-2xl text-[var(--color-ink-soft)] max-w-2xl leading-relaxed">
            1977년 창립과 함께 정한 회칙입니다. 지금 시행되는 것은{" "}
            {current.date} 개정본입니다.
          </p>
        </div>
      </section>

      <AboutTabs current="hoechik" />

      <section className="bg-[var(--color-paper)] py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          {/* 개정 이력 */}
          <h2 className="display-md text-2xl sm:text-3xl mb-6">개정 이력</h2>
          <ul className="mb-6 border-t border-[var(--color-rule)]">
            {HOECHIK_HISTORY.map((h) => (
              <li
                key={h.date}
                className="flex items-center justify-between gap-4 border-b border-[var(--color-rule)] px-1 py-3"
              >
                <span
                  className={
                    "current" in h && h.current
                      ? "font-semibold text-[var(--color-ink)]"
                      : "text-[var(--color-ink-soft)]"
                  }
                >
                  {h.kind}
                </span>
                <span className="font-mono tabular-nums text-[var(--color-ink-soft)]">
                  {h.date}
                  {"current" in h && h.current && (
                    <span className="ml-3 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[11px] font-semibold text-white">
                      현행
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <p className="mb-12 text-sm leading-relaxed text-[var(--color-ink-mute)]">
            아래 본문에서 조문 옆의 표시는 그 조문이 바뀐 날입니다. 원문에는
            장 번호가 제5장으로 두 번(특별기구 등·사무처), 조 번호가 제21조로 두 번
            (지출·시행세칙) 매겨져 있는데, 원문 그대로 두었습니다.{" "}
            <Link
              href={HOECHIK_PDF}
              className="underline hover:text-[var(--color-ink)]"
            >
              원문 PDF 내려받기
            </Link>
          </p>

          {/* 본문 */}
          {HOECHIK.map((ch, i) => (
            <div key={`${ch.no}-${i}`} className="mb-12">
              <h2 className="display-md text-2xl sm:text-3xl mb-1">
                {ch.no} {ch.title}
              </h2>
              {ch.amended && (
                <p className="mb-5 text-sm text-[var(--color-ink-mute)]">
                  {ch.amended} 개정
                </p>
              )}
              {!ch.amended && <div className="mb-5" />}

              <div className="space-y-7">
                {ch.articles.map((a) => (
                  <div key={`${ch.no}-${a.no}-${a.title}`}>
                    <h3 className="mb-2 text-lg font-semibold">
                      {a.no}【{a.title}】
                      {a.amended && (
                        <span className="ml-2 align-middle rounded-full border border-[var(--color-rule)] px-2 py-0.5 text-[11px] font-normal text-[var(--color-ink-mute)]">
                          {a.amended} 개정
                        </span>
                      )}
                    </h3>
                    <div className="space-y-1.5 text-[var(--color-ink-soft)] leading-relaxed">
                      {a.body.map((line) => (
                        <p
                          key={line}
                          className={
                            /^\d+\./.test(line.trim()) ? "pl-5" : undefined
                          }
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 부칙 */}
          <div className="mb-12">
            <h2 className="display-md text-2xl sm:text-3xl mb-5">부칙</h2>
            <div className="space-y-1.5 text-[var(--color-ink-soft)] leading-relaxed">
              {HOECHIK_ENFORCED.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/about/presidents" className="btn-pill ghost">
              ← 역대회장
            </Link>
            <Link href="/archive/yeongi" className="btn-pill">
              회칙이 바뀌어 온 기록 보기 →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
