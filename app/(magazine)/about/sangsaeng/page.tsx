import Link from "next/link";
import { PageHeroBg } from "@/components/PageHeroBg";
import { AboutTabs } from "@/components/AboutTabs";
import { requireMember } from "@/lib/auth";
import { getArticleBySlug } from "@/lib/articles-db";
import {
  SANGSAENG_BASE_DATE,
  SANGSAENG_GROUPS,
  SANGSAENG_METHOD,
  SANGSAENG_OFFICERS,
  SANGSAENG_ORGANIZE,
  SANGSAENG_PURPOSE,
  SANGSAENG_ROSTER,
  SANGSAENG_TOTAL,
} from "@/lib/sangsaeng";

/** 회원 전용 — 쿠키를 읽으므로 정적 생성하지 않는다 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "상생지원위원회 — 영가회",
  description:
    "회원과 회원 기업의 애로사항을 돕기 위해 둔 상생지원위원회입니다. 회원 전용입니다.",
  robots: { index: false, follow: false },
};

export default async function SangsaengPage() {
  await requireMember("/about/sangsaeng");
  const roster = await getArticleBySlug(
    SANGSAENG_ROSTER.chapter,
    SANGSAENG_ROSTER.slug,
  );

  return (
    <>
      <section className="relative overflow-hidden bg-[var(--color-bg-soft)] pt-40 pb-16 sm:pb-20">
        <PageHeroBg page="about" />
        <div className="relative mx-auto max-w-4xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-5">
            ABOUT · 相生支援委員會
          </div>
          <h1 className="display text-5xl sm:text-7xl mb-6">상생지원위원회</h1>
          <p className="text-xl sm:text-2xl text-[var(--color-ink-soft)] max-w-2xl leading-relaxed">
            회원과 회원 기업이 겪는 어려움을 회 차원에서 돕기 위해 둔
            기구입니다. 2026년 3월 4일 1차 정기 이사회에서 구성을 의결했습니다.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 py-2 text-sm text-[var(--color-ink-soft)]">
            <span aria-hidden="true">🔒</span> 회원 전용 — 위원 명단은 회원
            명부에 해당해 외부에 공개하지 않습니다
          </p>
        </div>
      </section>

      <AboutTabs current="sangsaeng" />

      <section className="bg-[var(--color-paper)] py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          {/* 취지 */}
          <h2 className="display-md text-2xl sm:text-3xl mb-6">취지</h2>
          <p className="mb-12 text-lg leading-relaxed text-[var(--color-ink-soft)]">
            {SANGSAENG_PURPOSE}
          </p>

          {/* 운영 */}
          <h2 className="display-md text-2xl sm:text-3xl mb-6">운영</h2>
          <ul className="mb-12 border-t border-[var(--color-rule)]">
            {SANGSAENG_OFFICERS.map((o) => (
              <li
                key={o.role}
                className="border-b border-[var(--color-rule)] px-1 py-4"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="min-w-[3.5rem] text-sm font-semibold text-[var(--color-ink-mute)]">
                    {o.role}
                  </span>
                  <span className="text-lg font-semibold text-[var(--color-ink)]">
                    {o.name}
                  </span>
                  <span className="text-[var(--color-ink-soft)]">{o.title}</span>
                </div>
                {o.note && (
                  <p className="mt-1 pl-[4.25rem] text-sm text-[var(--color-ink-mute)]">
                    {o.note}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {/* 편성 기준 */}
          <h2 className="display-md text-2xl sm:text-3xl mb-6">편성 기준</h2>
          <ul className="mb-12 space-y-2 text-lg leading-relaxed text-[var(--color-ink-soft)]">
            {SANGSAENG_ORGANIZE.map((s) => (
              <li key={s} className="flex gap-3">
                <span aria-hidden="true" className="text-[var(--color-accent)]">
                  ·
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>

          {/* 이용 방법 */}
          <h2 className="display-md text-2xl sm:text-3xl mb-6">이용 방법</h2>
          <ol className="mb-12 space-y-3 text-lg leading-relaxed text-[var(--color-ink-soft)]">
            {SANGSAENG_METHOD.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="mt-1 font-mono text-sm text-[var(--color-ink-mute)]">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>

          {/* 분야 편성 */}
          <h2 className="display-md text-2xl sm:text-3xl mb-3">분야 편성</h2>
          <p className="mb-8 text-sm leading-relaxed text-[var(--color-ink-mute)]">
            {SANGSAENG_BASE_DATE} 편성표 기준. 모두 {SANGSAENG_GROUPS.reduce(
              (n, g) => n + g.fields.length,
              0,
            )}
            개 분야 {SANGSAENG_TOTAL}항목입니다. 한 사람이 둘 이상의 분야에 오른
            경우가 있어 실제 인원과는 다릅니다.
          </p>

          {SANGSAENG_GROUPS.map((g) => (
            <div key={g.title} className="mb-10">
              <h3 className="mb-4 text-lg font-semibold text-[var(--color-ink)]">
                {g.title}
              </h3>
              <div className="overflow-hidden rounded-lg border border-[var(--color-rule)]">
                <table className="w-full text-left">
                  <thead className="bg-[var(--color-bg-soft)]">
                    <tr>
                      <th className="px-4 py-3 text-sm font-semibold text-[var(--color-ink-mute)]">
                        분야
                      </th>
                      <th className="w-24 px-4 py-3 text-right text-sm font-semibold text-[var(--color-ink-mute)]">
                        위원
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.fields.map((f) => (
                      <tr
                        key={f.label}
                        className="border-t border-[var(--color-rule)]"
                      >
                        <td className="px-4 py-3 text-[var(--color-ink)]">
                          {f.label}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-[var(--color-ink-soft)]">
                          {f.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* 위원 명단 */}
          <h2 className="display-md text-2xl sm:text-3xl mb-6">위원 편성표</h2>
          {roster ? (
            <p className="mb-12 text-lg leading-relaxed text-[var(--color-ink-soft)]">
              분야별 위원 명단은{" "}
              <Link
                href={`/archive/${SANGSAENG_ROSTER.chapter}/${SANGSAENG_ROSTER.slug}`}
                className="underline hover:text-[var(--color-ink)]"
              >
                위원 편성표
              </Link>{" "}
              에서 볼 수 있습니다.
            </p>
          ) : (
            <p className="mb-12 rounded-lg border border-[var(--color-rule)] bg-[var(--color-bg-soft)] px-5 py-4 text-base leading-relaxed text-[var(--color-ink-soft)]">
              분야별 위원 명단은 회원수첩과 영가회보로 제공합니다. 온라인 열람은
              준비 중입니다.
            </p>
          )}

          <p className="text-sm leading-relaxed text-[var(--color-ink-mute)]">
            편집 메모 — 편성표 원문의 &lsquo;화혜&rsquo;는 화훼로,
            &lsquo;개스&rsquo;는 가스로 읽었습니다. 위원의 성명·직장·직위는 회원
            명부에 해당해 공개 페이지에 싣지 않습니다.
          </p>
        </div>
      </section>
    </>
  );
}
