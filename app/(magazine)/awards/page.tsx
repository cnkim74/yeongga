import Link from "next/link";
import Image from "next/image";
import { getChapterMeta } from "@/lib/chapter-meta-db";
import {
  CULTURE_ROWS,
  GOOD_ROWS,
  MERIT_ROWS,
  AWARD_HISTORY,
  RELATED,
  type AwardRow,
} from "@/lib/awards";
import { getChapter, isBlindedHref } from "@/lib/chapters";

export const metadata = {
  title: "영가상 — 영가회 아카이브",
  description:
    "영가회가 드려 온 상의 기록 — 영가문화상, 영가선행상, 공로상(공로패·감사패).",
};

// 미리 만들어 CDN 이 곧바로 내준다. 데이터베이스에서는 집무실 '챕터 표지'에 등록한
// 영가상 장의 hero 이미지만 읽는다(못 읽으면 이미지 없이). 저장하면 곧바로 새로 만든다.
export const revalidate = 600;

// 가린 장(자취·향)의 글로 가는 링크는 보이지 않게 한다
const open = (href: string) => !isBlindedHref(href);

const SECTIONS = [
  { id: "munhwa", label: "영가문화상", count: CULTURE_ROWS.length },
  { id: "seonhaeng", label: "영가선행상", count: GOOD_ROWS.length },
  { id: "gongro", label: "공로상", count: MERIT_ROWS.length },
];

function SectionHead({
  id,
  hanja,
  title,
  children,
}: {
  id: string;
  hanja: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-28 mb-8 border-b-2 border-[var(--color-ink)] pb-4">
      <div className="kicker text-[var(--color-ink-mute)] mb-2">{hanja}</div>
      <h2 className="display-md text-2xl sm:text-3xl mb-3">{title}</h2>
      <p className="text-sm text-[var(--color-ink-mute)] max-w-2xl leading-relaxed">
        {children}
      </p>
    </div>
  );
}

function AwardTable({ rows }: { rows: AwardRow[] }) {
  return (
    <>
      {/* 넓은 화면 — 표 */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--color-ink-mute)] border-b border-[var(--color-rule)]">
              <th className="py-3 pr-4 font-medium w-32">시상</th>
              <th className="py-3 pr-4 font-medium">받은 분</th>
              <th className="py-3 pr-4 font-medium w-20">회장</th>
              <th className="py-3 pr-4 font-medium w-48">출처</th>
              <th className="py-3 font-medium w-28">기록</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date} className="border-b border-[var(--color-rule)] align-top">
                <td className="py-4 pr-4">
                  <div className="font-serif text-base tabular-nums">{r.date}</div>
                  {r.selected && (
                    <div className="text-xs text-[var(--color-ink-mute)] mt-0.5">{r.selected}</div>
                  )}
                </td>
                <td className="py-4 pr-4 text-[var(--color-ink)]">
                  {r.who}
                  {r.note && (
                    <div className="text-xs text-[var(--color-ink-mute)] mt-1">{r.note}</div>
                  )}
                </td>
                <td className="py-4 pr-4 text-[var(--color-ink-soft)]">
                  {r.president ?? <span className="text-[var(--color-ink-mute)]">—</span>}
                </td>
                <td className="py-4 pr-4 text-xs text-[var(--color-ink-mute)]">{r.source}</td>
                <td className="py-4">
                  {open(r.href) && (
                    <Link href={r.href} className="underline underline-offset-4 hover:text-[var(--color-ink)] text-[var(--color-ink-soft)]">
                      기록 보기
                    </Link>
                  )}
                  {r.more?.filter((m) => open(m.href)).map((m) => (
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
        {rows.map((r) => (
          <li key={r.date} className="border border-[var(--color-rule)] rounded-xl p-5">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="font-serif text-lg tabular-nums">{r.date}</span>
              <span className="text-xs text-[var(--color-ink-mute)]">
                {[r.selected, r.president && `${r.president} 회장`].filter(Boolean).join(" · ")}
              </span>
            </div>
            <div className="text-[var(--color-ink)]">{r.who}</div>
            {r.note && <div className="text-xs text-[var(--color-ink-mute)] mt-1">{r.note}</div>}
            <div className="text-xs text-[var(--color-ink-mute)] mt-2">출처 · {r.source}</div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {open(r.href) && (
                <Link href={r.href} className="underline underline-offset-4">기록 보기</Link>
              )}
              {r.more?.filter((m) => open(m.href)).map((m) => (
                <Link key={m.href} href={m.href} className="text-[var(--color-ink-mute)]">
                  {m.label} →
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default async function AwardsPage() {
  // 챕터 표지의 hero 이미지(없으면 메인 쇼케이스 이미지)를 머리 배경으로
  const chapterMeta = await getChapterMeta("munhwasang").catch(() => null);
  const heroImage = chapterMeta?.hero_image ?? chapterMeta?.cover_image ?? null;

  return (
    <>
      <section
        className={`relative overflow-hidden pt-40 pb-20 ${
          heroImage ? "text-white" : "bg-[var(--color-bg-soft)]"
        }`}
      >
        {heroImage && (
          <div className="absolute inset-0 z-0" aria-hidden="true">
            <Image src={heroImage} alt="" fill sizes="100vw" priority className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/75" />
          </div>
        )}
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className={`kicker mb-5 ${heroImage ? "text-white/70" : "text-[var(--color-ink-mute)]"}`}>
            {getChapter("munhwasang")?.number ?? "九"} · 永嘉賞
          </div>
          <h1 className="display text-5xl sm:text-7xl mb-6 max-w-3xl">영가상</h1>
          <p className={`text-base sm:text-lg max-w-2xl leading-relaxed ${heroImage ? "text-white/85" : "text-[var(--color-ink-soft)]"}`}>
            영가회가 드려 온 상의 기록입니다. 2006년부터 고장의 문화를 지켜 온
            사람과 단체에 영가문화상을, 2022년부터 이웃을 위해 애써 온 분께
            영가선행상을 드렸습니다. 회에 공을 세운 분께 드린 공로패와 감사패는
            공로상으로 모았습니다.
          </p>

          <nav aria-label="영가상 갈래" className="mt-10">
            <ul className="flex flex-wrap gap-2">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="inline-flex items-baseline gap-1.5 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 py-2 text-base text-[var(--color-ink-soft)] transition hover:border-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                  >
                    <span className="font-semibold">{s.label}</span>
                    <span className="text-sm text-[var(--color-ink-mute)]">{s.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      {/* 영가문화상 */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHead id="munhwa" hanja="永嘉文化賞" title="영가문화상">
            안동에 살며 사회발전과 문화예술 활동에 남모르게 이바지해 온 사람과
            단체에 드립니다. 40년사 안에서도 회차 번호가 지면마다 달라, 시상한
            날짜로 적었습니다.
          </SectionHead>
          <AwardTable rows={CULTURE_ROWS} />
        </div>
      </section>

      {/* 영가선행상 */}
      <section className="py-20 sm:py-24 border-t border-[var(--color-rule)]">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHead id="seonhaeng" hanja="永嘉善行賞" title="영가선행상">
            2022년 11월 11일 이사회에서 처음 두었습니다. 봉사 부문은 안동시의
            추천을 받아 영가문화상과 함께 정기총회에서 시상합니다.
          </SectionHead>
          <AwardTable rows={GOOD_ROWS} />
        </div>
      </section>

      {/* 공로상 */}
      <section className="py-20 sm:py-24 border-t border-[var(--color-rule)]">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHead id="gongro" hanja="功勞賞" title="공로상">
            영가회에 공을 세운 분께 드린 공로패와 감사패, 회원의 영예를 함께
            기린 축하패입니다.
          </SectionHead>
          <ul className="divide-y divide-[var(--color-rule)]">
            {MERIT_ROWS.map((m) => (
              <li key={m.date} className="py-6 grid md:grid-cols-12 gap-3 md:gap-6">
                <div className="md:col-span-3">
                  <div className="font-serif text-base tabular-nums">{m.date}</div>
                  <div className="text-xs text-[var(--color-ink-mute)] mt-0.5">{m.occasion}</div>
                </div>
                <div className="md:col-span-7">
                  <span className="inline-block text-xs font-semibold text-[var(--color-accent)] border border-[var(--color-rule)] rounded-full px-2.5 py-0.5 mb-2">
                    {m.kind}
                  </span>
                  <ul className="flex flex-wrap gap-2">
                    {m.who.map((n) => (
                      <li key={n} className="px-3 py-1.5 rounded-full border border-[var(--color-rule)] text-sm">
                        {n}
                      </li>
                    ))}
                  </ul>
                  {m.note && (
                    <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mt-3">{m.note}</p>
                  )}
                  <div className="text-xs text-[var(--color-ink-mute)] mt-2">출처 · {m.source}</div>
                </div>
                <div className="md:col-span-2 text-sm">
                  {open(m.href) && (
                    <Link href={m.href} className="underline underline-offset-4 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
                      기록 보기
                    </Link>
                  )}
                  {m.more?.filter((l) => open(l.href)).map((l) => (
                    <div key={l.href} className="mt-1">
                      <Link href={l.href} className="text-xs text-[var(--color-ink-mute)] hover:text-[var(--color-ink)]">
                        {l.label} →
                      </Link>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 상의 흐름 */}
      <section className="py-20 sm:py-24 bg-[var(--color-bg-soft)]">
        <div className="mx-auto max-w-6xl px-6 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <h2 className="display-md text-2xl sm:text-3xl mb-3">상이 걸어온 길</h2>
            <p className="text-sm text-[var(--color-ink-mute)] leading-relaxed">
              취지문에 따르면 영가문화상의 대상은 안동지역에 살며 사회발전과
              문화예술 활동에 남모르게 이바지해 온 숨은 인물입니다.
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
                {h.href && open(h.href) ? (
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

      {/* 함께 보는 자료 */}
      <section className="py-16 border-t border-[var(--color-rule)]">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="kicker text-[var(--color-ink-mute)] mb-5">함께 보는 자료</h2>
          <ul className="grid sm:grid-cols-2 gap-x-10 gap-y-3">
            {RELATED.filter((r) => open(r.href)).map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="hover:underline underline-offset-4">
                  {r.label} →
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--color-ink-mute)] mt-10 leading-relaxed">
            출처 — 《영가회 40년사》 108~110쪽·124~137쪽·165쪽·184쪽·197~224쪽·256~260쪽·316쪽·533~536쪽,
            《영가회보》 8-1호·8-4호·8-5호·8-6호·8-13호·9-1호, 2026 신년인사회 상패 사진
          </p>
        </div>
      </section>
    </>
  );
}
