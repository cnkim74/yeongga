import Link from "next/link";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { listAllArticles } from "@/lib/articles-db";
import { chapters, getChapter } from "@/lib/chapters";
import { deleteArticleAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminArticles() {
  const articles = await listAllArticles();
  const byChapter = chapters.map((c) => ({
    chapter: c,
    items: articles.filter((a) => a.chapter === c.slug),
  }));

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "🗂️ 관리실 홈", href: "/admin" },
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

        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-10">
          <Prop k="총" v={`${articles.length}편`} />
          <Prop
            k="공개"
            v={`${articles.filter((a) => a.visibility === "public").length}편`}
          />
          <Prop
            k="🔒 회원 전용"
            v={`${
              articles.filter((a) => a.visibility === "members-only").length
            }편`}
          />
        </div>

        {articles.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-12">
            {byChapter.map(({ chapter: c, items }) => (
              <section key={c.slug}>
                <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--color-notion-mute)] mb-3">
                  {c.number}. {c.title} · {items.length}편
                </h2>
                {items.length === 0 ? (
                  <div className="text-sm text-[var(--color-notion-mute)] border border-dashed border-[var(--color-notion-rule)] rounded-md px-4 py-6">
                    이 장에는 아직 글이 없습니다.
                  </div>
                ) : (
                  <ul className="border border-[var(--color-notion-rule)] rounded-lg divide-y divide-[var(--color-notion-rule)]">
                    {items.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--color-notion-hover)] transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
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
                          <Link
                            href={`/archive/${a.chapter}/${a.slug}`}
                            target="_blank"
                            className="notion-icon-btn text-xs"
                            title="공개 페이지 미리보기"
                          >
                            보기 ↗
                          </Link>
                          <Link
                            href={`/admin/articles/${a.id}/edit`}
                            className="notion-icon-btn text-xs"
                          >
                            편집
                          </Link>
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
