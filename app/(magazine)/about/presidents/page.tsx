import Image from "next/image";
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
        <div className="mx-auto max-w-5xl px-6">
          <ul className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 sm:gap-x-10 sm:gap-y-16">
            {presidents.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/search?president=${p.id}`}
                  className="group block focus-visible:outline-none"
                >
                  {/* 액자 — 짙은 나무 틀 + 미색 매트 + 사진 */}
                  <div className="rounded-[3px] bg-[linear-gradient(145deg,#4a3a24_0%,#7a6238_38%,#3b2d1a_70%,#5c4729_100%)] p-[7px] shadow-[0_22px_34px_-20px_rgba(0,0,0,0.55),0_2px_4px_rgba(0,0,0,0.18)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_30px_40px_-20px_rgba(0,0,0,0.6),0_2px_4px_rgba(0,0,0,0.18)] group-focus-visible:ring-2 group-focus-visible:ring-[var(--color-accent)] sm:p-[10px]">
                    <div className="bg-[#F6F1E6] p-3 shadow-[inset_0_1px_4px_rgba(0,0,0,0.28)] sm:p-5">
                      <div className="relative aspect-[3/4] overflow-hidden bg-[#E9E3D6] shadow-[0_0_0_1px_rgba(120,100,60,0.35)]">
                        {p.photo ? (
                          <Image
                            src={p.photo}
                            alt={`제${p.dae}대 회장 ${p.name}`}
                            fill
                            sizes="(min-width: 1024px) 280px, (min-width: 640px) 30vw, 45vw"
                            className="object-cover object-top"
                          />
                        ) : (
                          // 사진이 없는 회장은 이름 한 글자로 대신한다.
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 flex items-center justify-center text-5xl text-[#9A8E78]"
                          >
                            {p.hanja ? p.hanja.slice(0, 1) : p.name.slice(0, 1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 text-center">
                    <div className="mb-1.5 text-sm text-[var(--color-ink-mute)]">
                      제{p.dae}대 회장
                      {p.current && (
                        <span className="ml-2 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[11px] font-semibold text-white">
                          현 회장
                        </span>
                      )}
                    </div>
                    <h2 className="display-md text-2xl transition group-hover:text-[var(--color-accent)] sm:text-[1.75rem]">
                      {p.name}
                      {p.hanja && (
                        <span className="ml-2 align-middle text-base text-[var(--color-ink-mute)]">
                          {p.hanja}
                        </span>
                      )}
                    </h2>
                    <div className="mt-1.5 font-mono text-sm tabular-nums text-[var(--color-ink-mute)]">
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

          <p className="mt-16 text-sm text-[var(--color-ink-mute)]">
            1~8대 회장 사진은 《영가회 회원수첩》 역대회장 면에서 옮겼습니다.
            사진이나 이름을 누르시면 그 시기의 기록을 모아 보실 수 있습니다.
            역대 회장 약사(略史)는{" "}
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
