import Link from "next/link";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { listAllArticlesAdmin } from "@/lib/articles-db";
import { allChapters as chapters, getAnyChapter as getChapter } from "@/lib/chapters";
import { cookies } from "next/headers";
import {
  deleteArticleAction,
  setAdminHideHiddenAction,
  setArticleHiddenAction,
} from "./actions";
import { BulkActionBar, ChapterSelectAll, SelectBox } from "./BulkSelect";
import { CoverCell } from "./CoverCell";

export const dynamic = "force-dynamic";

export default async function AdminArticles() {
  const articles = await listAllArticlesAdmin();
  // '비공개 글 숨기기' 설정 — actions.ts 의 setAdminHideHiddenAction 이 쿠키로 기억한다.
  const hideHidden = (await cookies()).get("admin_hide_hidden")?.value === "1";
  const hiddenCount = articles.filter((a) => a.hidden).length;
  const shown = hideHidden ? articles.filter((a) => !a.hidden) : articles;
  const byChapter = chapters.map((c) => ({
    chapter: c,
    items: shown.filter((a) => a.chapter === c.slug),
  }));

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "집무실 홈", href: "/admin" },
          { label: "📝 글 관리" },
        ]}
        right={
          <Link
            href="/admin/articles/new"
            className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf]"
          >
            + 새 글
          </Link>
        }
      />

      <div className="px-12 pt-12 pb-24 max-w-[1080px] mx-auto">
        <div className="text-7xl mb-3 leading-none select-none">📝</div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">글 관리</h1>
        <p className="text-[var(--color-notion-mute)] text-base mb-6 max-w-2xl">
          공개 사이트 아카이브에 노출되는 글입니다. 다섯 장(章)으로 분류됩니다.
        </p>

        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-6">
          <Prop k="총" v={`${articles.length}편`} />
          <Prop
            k="공개"
            v={`${articles.filter((a) => a.visibility === "public" && !a.hidden).length}편`}
          />
          <Prop
            k="🔒 회원 전용"
            v={`${
              articles.filter((a) => a.visibility === "members-only" && !a.hidden).length
            }편`}
          />
          <Prop k="🚫 비공개" v={`${hiddenCount}편`} />
          <Prop
            k="🖼 대표 이미지 없음"
            v={`${articles.filter((a) => !a.cover?.trim()).length}편`}
          />
          <form action={setAdminHideHiddenAction} className="ml-auto">
            <input type="hidden" name="on" value={hideHidden ? "0" : "1"} />
            <button
              type="submit"
              className={`notion-icon-btn text-xs border ${
                hideHidden
                  ? "border-[var(--color-notion-accent)] text-[var(--color-notion-accent)]"
                  : "border-[var(--color-notion-rule)]"
              }`}
              title={
                hideHidden
                  ? "숨긴 비공개 글을 목록에 다시 보입니다"
                  : "비공개 글을 이 목록에서 빼고 봅니다(글은 그대로 남습니다)"
              }
            >
              {hideHidden ? `🚫 비공개 글 숨김 중 · ${hiddenCount}편 보이기` : "🚫 비공개 글 숨기기"}
            </button>
          </form>
        </div>

        {/* 챕터별 카드 그리드 — 한눈에 들어오는 분포 + 섹션 점프 앵커 */}
        {articles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-10">
            {byChapter.map(({ chapter: c, items }) => {
              const empty = items.length === 0;
              return (
                <a
                  key={c.slug}
                  href={`#chapter-${c.slug}`}
                  className={`group rounded-lg border px-3 py-3 transition ${
                    empty
                      ? "border-[var(--color-notion-rule)] bg-transparent opacity-60 hover:opacity-100"
                      : "border-[var(--color-notion-rule)] bg-[var(--color-notion-surface)] hover:border-[var(--color-notion-accent)] hover:shadow-sm"
                  }`}
                  title={c.subtitle}
                >
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="font-serif text-base text-[var(--color-notion-mute)] group-hover:text-[var(--color-notion-accent)]">
                      {c.number}
                    </span>
                    <span className="text-sm font-medium truncate">
                      {c.title}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-semibold tabular-nums">
                      {items.length}
                    </span>
                    <span className="text-xs text-[var(--color-notion-mute)]">편</span>
                  </div>
                  {c.blinded && (
                    <div
                      className="text-[10px] text-[#b04a40] mt-1"
                      title="공개 사이트 전체에서 가려진 장입니다. 이 장의 글은 '공개'여도 사이트에 보이지 않습니다."
                    >
                      🙈 공개 화면 숨김
                    </div>
                  )}
                  {c.comingSoon && (
                    <div className="text-[10px] text-[var(--color-notion-mute)] mt-1">
                      준비 중
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        )}

        {articles.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-12">
            {byChapter.map(({ chapter: c, items }) => (
              <section
                key={c.slug}
                id={`chapter-${c.slug}`}
                className="scroll-mt-24"
              >
                <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--color-notion-mute)] mb-3 flex items-center gap-4">
                  <span>
                    {c.number}. {c.title} · {items.length}편
                  </span>
                  {c.blinded && (
                    <span className="normal-case tracking-normal font-sans text-[11px] rounded px-1.5 py-0.5 border border-[#e3b9b4] bg-[#fdf0ee] text-[#b04a40]">
                      🙈 장 전체가 공개 화면에서 숨겨져 있습니다 — 아래 글은 &lsquo;공개&rsquo;로 표시돼도 사이트에 보이지 않습니다
                    </span>
                  )}
                  {items.length > 0 && <ChapterSelectAll chapter={c.slug} />}
                </h2>
                {items.length === 0 ? (
                  <div className="text-sm text-[var(--color-notion-mute)] border border-dashed border-[var(--color-notion-rule)] rounded-md px-4 py-6">
                    {hideHidden && articles.some((a) => a.chapter === c.slug)
                      ? "이 장의 글은 모두 비공개라 숨겨져 있습니다."
                      : "이 장에는 아직 글이 없습니다."}
                  </div>
                ) : (
                  <ul className="border border-[var(--color-notion-rule)] rounded-lg divide-y divide-[var(--color-notion-rule)]">
                    {items.map((a) => (
                      <li
                        key={a.id}
                        className={`flex items-center gap-4 px-4 py-3 hover:bg-[var(--color-notion-hover)] transition ${
                          a.hidden ? "bg-[var(--color-notion-hover)]" : ""
                        }`}
                      >
                        <SelectBox id={a.id} chapter={a.chapter} title={a.title} />
                        <CoverCell id={a.id} chapter={a.chapter} slug={a.slug} cover={a.cover} />
                        <div className="flex-1 min-w-0">
                          <div className={`flex items-center gap-2 mb-1 ${a.hidden ? "opacity-60" : ""}`}>
                            {a.hidden && (
                              <span
                                className="text-[11px] rounded px-1.5 py-0.5 border border-[var(--color-notion-rule)] bg-white text-[var(--color-notion-mute)] shrink-0"
                                title="사이트에 보이지 않습니다. 집무실에서만 볼 수 있습니다."
                              >
                                🚫 비공개
                              </span>
                            )}
                            {a.visibility === "members-only" && (
                              <span
                                className="text-xs"
                                title="회원 전용"
                                aria-label="회원 전용"
                              >
                                🔒
                              </span>
                            )}
                            <Link
                              href={`/admin/articles/${a.id}/edit`}
                              className="text-base font-medium hover:underline truncate"
                            >
                              {a.title}
                            </Link>
                          </div>
                          {a.excerpt && (
                            <p className="text-sm text-[var(--color-notion-mute)] line-clamp-1">
                              {a.excerpt}
                            </p>
                          )}
                          <div className="text-xs text-[var(--color-notion-mute)] mt-1 font-mono">
                            /{a.chapter}/{a.slug} · {a.date}
                            {a.author ? ` · ${a.author}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!a.hidden && !c.blinded && (
                            <Link
                              href={`/archive/${a.chapter}/${a.slug}`}
                              target="_blank"
                              className="notion-icon-btn text-xs"
                              title="공개 페이지 미리보기"
                            >
                              보기 ↗
                            </Link>
                          )}
                          <Link
                            href={`/admin/articles/${a.id}/edit`}
                            className="notion-icon-btn text-xs"
                          >
                            편집
                          </Link>
                          <ConfirmDelete
                            action={setArticleHiddenAction}
                            hidden={{ id: a.id, chapter: a.chapter, slug: a.slug, hide: a.hidden ? 0 : 1 }}
                            message={
                              a.hidden
                                ? `"${a.title}" 글을 다시 공개할까요? (원래 공개 범위로 돌아갑니다)`
                                : `"${a.title}" 글을 비공개로 돌릴까요?\n사이트 목록·검색·태그·주소 모두에서 사라지고, 집무실에서만 보입니다. 언제든 다시 공개할 수 있습니다.`
                            }
                            className="notion-icon-btn text-xs"
                          >
                            {a.hidden ? "다시 공개" : "비공개"}
                          </ConfirmDelete>
                          <ConfirmDelete
                            action={deleteArticleAction}
                            hidden={{ id: a.id, chapter: a.chapter }}
                            message={`"${a.title}" 글을 삭제할까요? 되돌릴 수 없습니다.`}
                            className="notion-icon-btn text-xs text-[#c4554d] hover:bg-[#ffe2dd]"
                          >
                            삭제
                          </ConfirmDelete>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
      <BulkActionBar />
    </>
  );
}

function Prop({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--color-notion-mute)]">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function Empty() {
  return (
    <div className="border border-dashed border-[var(--color-notion-rule)] rounded-md p-12 text-center">
      <div className="text-5xl mb-3">📝</div>
      <div className="text-base font-medium mb-1">아직 글이 없습니다</div>
      <div className="text-sm text-[var(--color-notion-mute)] mb-4">
        새 글을 추가하면 공개 사이트 아카이브에 즉시 반영됩니다.
      </div>
      <Link
        href="/admin/articles/new"
        className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf]"
      >
        + 새 글
      </Link>
    </div>
  );
}
