import Link from "next/link";
import {
  AWARD_ROWS,
  AWARD_HISTORY,
  FOUNDER_PLAQUE,
  RELATED,
} from "@/lib/awards";

export const metadata = {
  title: "영가문화상 — 영가회 아카이브",
  description:
    "영가회가 2006년부터 드려 온 영가문화상과 영가선행상, 창립회원 공로패의 기록.",
};

// 데이터베이스를 쓰지 않는 정적 페이지 — 빌드 때 만들어 CDN 이 곧바로 내준다.

export default function AwardsPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-[var(--color-bg-soft)] pt-40 pb-20">
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-5">
            九 · 永嘉文化賞
          </div>
          <h1 className="display text-5xl sm:text-7xl mb-6 max-w-3xl">
            영가문화상
          </h1>
          <p className="text-base sm:text-lg text-[var(--color-ink-soft)] max-w-2xl leading-relaxed">
            영가회는 2006년부터 안동에 살며 고장의 문화와 이웃을 위해 남모르게
            애써 온 사람과 단체에 영가문화상을 드려 왔습니다. 2022년에는
            영가선행상을 더했습니다. 창립회원에게 드린 공로패도 이 자리에 함께
            모았습니다.
          </p>
        </div>
      </section>

      {/* 수상 기록 */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="display-md text-2xl sm:text-3xl mb-3">수상 기록</h2>
          <p className="text-sm text-[var(--color-ink-mute)] mb-10 max-w-2xl leading-relaxed">
            시상한 날을 기준으로 적었습니다. 40년사 안에서도 회차 번호가
            지면마다 달라, 회차 대신 날짜로 셉니다.
          </p>

          {/* 넓은 화면 — 표 */}
          <div className="hidden md:block">
            <table className="w-full text-sm border-t-2 border-[var(--color-ink)]">
              <thead>
                <tr className="text-left text-[var(--color-ink-mute)] border-b border-[var(--color-rule)]">
                  <th className="py-3 pr-4 font-medium w-32">시상</th>
                  <th className="py-3 pr-4 font-medium">영가문화상</th>
                  <th className="py-3 pr-4 font-medium">영가선행상</th>
                  <th className="py-3 pr-4 font-medium w-20">회장</th>
                  <th className="py-3 font-medium w-28">기록</th>
                </tr>
              </thead>
              <tbody>
                {AWARD_ROWS.map((r) => (
                  <tr
                    key={r.date}
                    className="border-b border-[var(--color-rule)] align-top"
                  >
                    <td className="py-4 pr-4">
                      <div className="font-serif text-base tabular-nums">{r.date}</div>
                      {r.selected && (
                        <div className="text-xs text-[var(--color-ink-mute)] mt-0.5">
                          {r.selected}
                        </div>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-[var(--color-ink)]">{r.culture}</td>
                    <td className="py-4 pr-4 text-[var(--color-ink)]">
                      {r.good ?? <span className="text-[var(--color-ink-mute)]">—</span>}
                    </td>
                    <td className="py-4 pr-4 text-[var(--color-ink-soft)]">
                      {r.president ?? <span className="text-[var(--color-ink-mute)]">—</span>}
                    </td>
                    <td className="py-4">
                      <Link href={r.href} className="underline underline-offset-4 hover:text-[var(--color-ink)] text-[var(--color-ink-soft)]">
                        기록 보기
                      </Link>
                      {r.more?.map((m) => (
                        <div key={m.href} className="mt-1">
                          <Link href={m.href} className="text-xs text-[var(--color-ink-mute)] hover:text-[var(--color-ink)]">
                            {m.label} →
                          </Link>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 좁은 화면 — 카드 */}
          <ul className="md:hidden space-y-4">
            {AWARD_ROWS.map((r) => (
              <li
                key={r.date}
                className="border border-[var(--color-rule)] rounded-xl p-5"
              >
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <span className="font-serif text-lg tabular-nums">{r.date}</span>
                  <span className="text-xs text-[var(--color-ink-mute)]">
                    {[r.selected, r.president && `${r.president} 회장`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <dl className="text-sm space-y-1.5">
                  <div className="flex gap-3">
                    <dt className="text-[var(--color-ink-mute)] shrink-0 w-16">문화상</dt>
                    <dd>{r.culture}</dd>
                  </div>
                  {r.good && (
                    <div className="flex gap-3">
                      <dt className="text-[var(--color-ink-mute)] shrink-0 w-16">선행상</dt>
                      <dd>{r.good}</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <Link href={r.href} className="underline underline-offset-4">
                    기록 보기
                  </Link>
                  {r.more?.map((m) => (
                    <Link key={m.href} href={m.href} className="text-[var(--color-ink-mute)]">
                      {m.label} →
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ul>

          {AWARD_ROWS.filter((r) => r.note).map((r) => (
            <p key={r.date} className="text-xs text-[var(--color-ink-mute)] mt-6 leading-relaxed">
              {r.date} — {r.note}
            </p>
          ))}
        </div>
      </section>

      {/* 상의 흐름 */}
      <section className="py-20 sm:py-24 bg-[var(--color-bg-soft)]">
        <div className="mx-auto max-w-6xl px-6 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <h2 className="display-md text-2xl sm:text-3xl mb-3">상이 걸어온 길</h2>
            <p className="text-sm text-[var(--color-ink-mute)] leading-relaxed">
              취지문에 따르면 대상은 안동지역에 살며 사회발전과 문화예술 활동에
              남모르게 이바지해 온 숨은 인물입니다.
            </p>
          </div>
          <ol className="lg:col-span-8 border-l border-[var(--color-rule)]">
            {AWARD_HISTORY.map((h) => (
              <li key={h.when} className="relative pl-6 pb-7 last:pb-0">
                <span
                  className="absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full bg-[var(--color-ink)]"
                  aria-hidden="true"
                />
                <div className="font-serif text-sm text-[var(--color-ink-mute)] tabular-nums mb-1">
                  {h.when}
                </div>
                {h.href ? (
                  <Link href={h.href} className="hover:underline underline-offset-4">
                    {h.what}
                  </Link>
                ) : (
                  <span>{h.what}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 공로패와 표창 */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <h2 className="display-md text-2xl sm:text-3xl mb-3">공로패와 표창</h2>
          </div>
          <div className="lg:col-span-8 space-y-10">
            <div>
              <div className="font-serif text-sm text-[var(--color-ink-mute)] mb-1">
                {FOUNDER_PLAQUE.date} · {FOUNDER_PLAQUE.occasion}
              </div>
              <h3 className="text-lg font-medium mb-4">
                창립 발기회원 열한 분께 공로패
              </h3>
              <ul className="flex flex-wrap gap-2 mb-4">
                {FOUNDER_PLAQUE.names.map((n) => (
                  <li
                    key={n}
                    className="px-3 py-1.5 rounded-full border border-[var(--color-rule)] text-sm"
                  >
                    {n}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-3">
                같은 자리에서 역대 회장 세 분 — 김해길·류목기·금창태 — 께는
                기념 은수저를 드렸습니다.
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {FOUNDER_PLAQUE.links.map((l) => (
                  <Link key={l.href} href={l.href} className="underline underline-offset-4">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="font-serif text-sm text-[var(--color-ink-mute)] mb-1">
                2026.1.7 · 제49차 정기총회
              </div>
              <h3 className="text-lg font-medium mb-3">유공자 표창</h3>
              <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-3">
                신년인사회 순서에 유공자 표창이 들어 있습니다. 받은 분의 이름은
                아직 기록에 없습니다.
              </p>
              <Link
                href="/archive/moim/9dae-2026-sinnyeon-chonghoe-49"
                className="text-sm underline underline-offset-4"
              >
                제49차 정기총회
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 함께 보는 자료 */}
      <section className="py-16 border-t border-[var(--color-rule)]">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="kicker text-[var(--color-ink-mute)] mb-5">함께 보는 자료</h2>
          <ul className="grid sm:grid-cols-2 gap-x-10 gap-y-3">
            {RELATED.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="hover:underline underline-offset-4">
                  {r.label} →
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--color-ink-mute)] mt-10 leading-relaxed">
            출처 — 《영가회 40년사》 108~110쪽·134쪽·533~536쪽, 《영가회보》
            8-1호·8-4호·8-5호·8-6호·8-13호, 2025·2026년 정기총회 회순
          </p>
        </div>
      </section>
    </>
  );
}
