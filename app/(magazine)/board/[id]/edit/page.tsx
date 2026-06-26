import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, requireMember } from "@/lib/auth";
import { getPost } from "@/lib/board-db";
import { PostForm } from "../../PostForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "글 수정 — 게시판 · 영가회 아카이브",
};

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = Number(id);
  await requireMember(`/board/${postId}/edit`);

  const [user, post] = await Promise.all([getCurrentUser(), getPost(postId)]);
  if (!post) notFound();

  const isAdmin = user?.role === "admin";
  const isOwner = post.author_id != null && user?.id === post.author_id;
  if (!isOwner && !isAdmin) redirect(`/board/${postId}`);

  return (
    <div className="pt-32 sm:pt-40 pb-24">
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href={`/board/${postId}`}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] mb-6"
        >
          ← 글로 돌아가기
        </Link>
        <h1 className="display-md text-2xl mb-6">글 수정</h1>
        <PostForm post={post} isAdmin={Boolean(isAdmin)} />
      </div>
    </div>
  );
}
