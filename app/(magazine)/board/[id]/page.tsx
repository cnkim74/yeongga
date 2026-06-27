import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, requireMember } from "@/lib/auth";
import { getPost, incrementViews } from "@/lib/board-db";
import { PostActions } from "../PostActions";

export const dynamic = "force-dynamic";

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function extLabel(name: string): string {
  const m = name.match(/\.([A-Za-z0-9]+)$/);
  return (m ? m[1] : "FILE").toUpperCase();
}

function isImageAttachment(a: { mime: string | null; file_name: string }): boolean {
  if (a.mime && a.mime.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif)$/i.test(a.file_name);
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = Number(id);
  await requireMember(`/board/${postId}`);

  const [user, post] = await Promise.all([getCurrentUser(), getPost(postId)]);
  if (!post) notFound();

  await incrementViews(postId);

  const isAdmin = user?.role === "admin";
  const isOwner = post.author_id != null && user?.id === post.author_id;
  const canEdit = Boolean(isOwner || isAdmin);

  const imageAttachments = post.attachments.filter(isImageAttachment);

  return (
    <article className="pt-32 sm:pt-40 pb-24">
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href="/board"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] mb-6"
        >
          ← 목록
        </Link>

        {/* 헤더 */}
        <header className="border-b border-[var(--color-rule)] pb-5 mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h1 className="display-md text-2xl sm:text-3xl leading-snug">
              {post.pinned && (
                <span className="text-[var(--color-accent)] mr-2">📌</span>
              )}
              {post.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-ink-mute)]">
            <span>{post.author_name}</span>
            <span>{post.created_at.slice(0, 16)}</span>
            <span>조회 {post.views + 1}</span>
          </div>
        </header>

        {/* 본문 */}
        <div className="min-h-[120px] text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap break-words text-[15px]">
          {post.body || (
            <span className="text-[var(--color-ink-mute)]">(내용 없음)</span>
          )}
        </div>

        {/* 이미지 첨부 — 내용 안에 표시 */}
        {imageAttachments.length > 0 && (
          <div className="mt-6 space-y-4">
            {imageAttachments.map((a) => (
              <figure key={a.id} className="m-0">
                <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.file_url}
                    alt={a.file_name}
                    loading="lazy"
                    className="w-full h-auto rounded-lg border border-[var(--color-rule)]"
                  />
                </a>
                <figcaption className="mt-1 text-xs text-[var(--color-ink-mute)] text-center">
                  {a.file_name}
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        {/* 첨부파일 — 이미지 포함 전체 (다운로드) */}
        {post.attachments.length > 0 && (
          <div className="mt-8 rounded-xl border border-[var(--color-rule)] p-4">
            <div className="text-sm font-semibold text-[var(--color-ink)] mb-3">
              첨부파일 {post.attachments.length}개
            </div>
            <ul className="space-y-2">
              {post.attachments.map((a) => (
                <li key={a.id}>
                  <a
                    href={`/api/board/download/${a.id}`}
                    className="group flex items-center gap-3 hover:bg-[var(--color-bg-soft)] rounded-lg px-2 py-1.5 -mx-2 transition"
                  >
                    <span className="shrink-0 w-9 h-9 rounded bg-[var(--color-bg-soft)] border border-[var(--color-rule)] flex items-center justify-center text-[9px] font-bold text-[var(--color-ink-mute)] font-mono">
                      {extLabel(a.file_name)}
                    </span>
                    <span className="flex-1 min-w-0 text-sm text-[var(--color-ink)] truncate group-hover:text-[var(--color-accent)]">
                      {a.file_name}
                    </span>
                    {a.file_size > 0 && (
                      <span className="text-xs text-[var(--color-ink-mute)] shrink-0">
                        {formatSize(a.file_size)}
                      </span>
                    )}
                    <span className="text-xs text-[var(--color-ink-mute)] shrink-0">↓</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 관리 버튼 */}
        <div className="mt-8 flex items-center justify-end">
          <PostActions
            postId={post.id}
            pinned={post.pinned}
            canEdit={canEdit}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </article>
  );
}
