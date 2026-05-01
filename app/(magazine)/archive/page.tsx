import Link from "next/link";
import { ChapterIcon } from "@/components/ChapterIcon";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { chapters } from "@/lib/chapters";
import { listChapterArticles } from "@/lib/articles-db";
import { listUsers } from "@/lib/users-db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "아카이브 — 영가회",
};

export default async function ArchiveIndex() {
  const [sections, users] = await Promise.all([
    Promise.all(
      chapters.map(async (c) => ({
        chapter: c,
        articles: await listChapterArticles(c.slug),
      }))
    ),
    listUsers(),
  ]);
  const avatarByName = new Map(users.map((u) => [u.name, u.avatar_url]));

  return (
    <>
      <section className="bg-[var(--color-bg-soft)] pt-40 pb-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-5">
            ARCHIVE · 全卷
          </div>
          <h1 className="display text-5xl sm:text-7xl mb-6 max-w-3xl">
            장(章)으로 읽는<br />영가회
          </h1>
          <p className="text-base sm:text-lg text-[var(--color-ink-soft)] max-w-2xl leading-relaxed">
            글들은 다섯 개의 장으로 나누어 갈무리해 두었습니다. 장을
            골라 들어가시면 해당 장에 모인 글들을 한눈에 보실 수 있습니다.
          </p>
        </div>
      </section>

      <div className="divide-y divide-[var(--color-rule)]">
        {sections.map(({ chapter: c, articles }) => (
          <section key={c.slug} className="py-16 sm:py-24">
            <div className="mx-auto max-w-6xl px-6 grid lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4">
                <div className="flex items-start gap-4 mb-5">
                  <ChapterIcon
                    slug={c.slug}
                    className="w-12 h-12 text-[var(--color-ink-soft)] shrink-0"
                  />
                  <div>
                    <div className="kicker text-[var(--color-ink-mute)] mb-2">
                      {c.number} · {c.subtitle}
                    </div>
                    <Link
                      href={`/archive/${c.slug}`}
                      className="display-md text-3xl sm:text-4xl hover:text-[var(--color-accent)] transition"
                    >
                      {c.title}
                    </Link>
                  </div>
                </div>
                <p className="text-[var(--color-ink-soft)] leading-relaxed mb-6">
                  {c.description}
                </p>
                <Link
                  href={`/archive/${c.slug}`}
                  className="text-sm underline underline-offset-4 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                >
                  이 장 전체 보기 ({articles.length}편) →
                </Link>
              </div>

              <div className="lg:col-span-8">
                {articles.length === 0 ? (
                  <div className="border border-dashed border-[var(--color-rule)] rounded-2xl p-12 text-center text-[var(--color-ink-mute)]">
                    아직 등재된 글이 없습니다.
                  </div>
                ) : (
                  <ul className="divide-y divide-[var(--color-rule)] border-t border-b border-[var(--color-rule)]">
                    {articles.map((a) => (
                      <li key={a.slug}>
                        <Link
                          href={`/archive/${c.slug}/${a.slug}`}
                          className="flex items-baseline justify-between gap-6 py-5 px-2 hover:bg-[var(--color-bg-soft)] transition group"
                        >
                          <div>
                            <h3 className="display-md text-xl sm:text-2xl group-hover:text-[var(--color-accent)] transition">
                              {a.visibility === "members-only" && (
                                <span
                                  className="inline-block mr-2 text-xs align-middle text-[var(--color-ink-mute)]"
                                  aria-label="회원 전용"
                                  title="회원 전용"
                                >
                                  🔒
                                </span>
                              )}
                              {a.title}
                            </h3>
                            {a.excerpt && (
                              <p className="text-[var(--color-ink-soft)] mt-1 line-clamp-2 text-sm sm:text-base">
                                {a.excerpt}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right text-xs sm:text-sm text-[var(--color-ink-mute)]">
                            <div className="font-mono tabular-nums">
                              {formatDate(a.date)}
                            </div>
                            {a.author && (
                              <div className="mt-1 inline-flex items-center gap-1.5">
                                <AuthorAvatar
                                  src={avatarByName.get(a.author)}
                                  name={a.author}
                                  size={20}
                                />
                                <span>{a.author}</span>
                              </div>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
