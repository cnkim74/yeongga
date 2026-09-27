import fs from "fs";
import path from "path";
import Image from "next/image";
import Link from "next/link";
import { getArticleBySlug } from "@/lib/articles-db";
import { PageHeroBg } from "@/components/PageHeroBg";
import { AboutTabs } from "@/components/AboutTabs";

export const dynamic = "force-dynamic";

// 현직 회장 사진 — public/brand/president-9dae.jpg 가 있을 때만 노출한다.
const PORTRAIT_FILE = "president-9dae.jpg";
const PORTRAIT_SRC = `/brand/${PORTRAIT_FILE}`;

export const metadata = {
  title: "회장 인사말 — 영가회",
  description: "영가회 회장의 인사말입니다.",
};

export default async function GreetingPage() {
  // 아카이브에 실린 〈회장의 인사〉 글을 그대로 보여 준다.
  const greeting = await getArticleBySlug("yeongi", "hoejang-insa").catch(
    () => null
  );

  const hasPortrait = fs.existsSync(
    path.join(process.cwd(), "public", "brand", PORTRAIT_FILE)
  );

  return (
    <>
      <section className="relative overflow-hidden bg-[var(--color-bg-soft)] pt-40 pb-16 sm:pb-20">
        <PageHeroBg page="about" />
        <div className="relative mx-auto max-w-4xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-5">
            ABOUT · 卷頭言
          </div>
          <h1 className="display text-5xl sm:text-7xl mb-6">회장 인사말</h1>
          {greeting?.subtitle && (
            <p className="text-xl sm:text-2xl text-[var(--color-ink-soft)] max-w-2xl leading-relaxed">
              {greeting.subtitle}
            </p>
          )}
        </div>
      </section>

      <AboutTabs current="greeting" />

      <section className="bg-[var(--color-paper)] py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          {greeting ? (
            <>
              {hasPortrait && (
                <figure className="mb-10 text-center sm:float-right sm:mb-6 sm:ml-10 sm:text-center">
                  <Image
                    src={PORTRAIT_SRC}
                    alt={`영가회 ${greeting.author ?? "회장"}`}
                    width={240}
                    height={240}
                    priority
                    className="mx-auto h-48 w-48 rounded-full border border-[var(--color-rule)] object-cover object-top shadow-sm sm:h-56 sm:w-56"
                  />
                  {greeting.author && (
                    <figcaption className="mt-3 text-sm text-[var(--color-ink-mute)]">
                      {greeting.author}
                    </figcaption>
                  )}
                </figure>
              )}
              <div
                className="prose-body"
                dangerouslySetInnerHTML={{ __html: greeting.html }}
              />
              {greeting.author && (
                <p className="mt-12 clear-both text-right text-[var(--color-ink-soft)]">
                  {greeting.author}
                </p>
              )}
            </>
          ) : (
            <div className="border border-dashed border-[var(--color-rule)] rounded-2xl p-16 text-center text-[var(--color-ink-mute)]">
              아직 등록된 인사말이 없습니다.
            </div>
          )}

          <div className="mt-16 flex flex-wrap gap-3">
            <Link href="/about" className="btn-pill ghost">
              ← 영가회 소개
            </Link>
            <Link href="/about/presidents" className="btn-pill">
              역대회장 →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
