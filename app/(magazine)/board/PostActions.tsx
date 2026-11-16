"use client";

import Link from "next/link";
import { useTransition } from "react";
import { deletePostAction } from "./actions";

export function PostActions({
  postId,
  canEdit,
  isAdmin,
}: {
  postId: number;
  canEdit: boolean;
  isAdmin: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (!canEdit && !isAdmin) return null;

  return (
    <div className="flex items-center gap-2">
      {canEdit && (
        <>
          <Link
            href={`/board/${postId}/edit`}
            className="text-xs py-1.5 px-3 rounded-full border border-[var(--color-rule)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink)] transition"
          >
            수정
          </Link>
          <form
            action={deletePostAction}
            onSubmit={(e) => {
              if (!confirm("이 글을 삭제할까요? 첨부파일도 함께 삭제되며 되돌릴 수 없습니다.")) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={postId} />
            <button
              type="submit"
              className="text-xs py-1.5 px-3 rounded-full border border-[var(--color-rule)] text-[#c4554d] hover:border-[#c4554d] transition"
            >
              삭제
            </button>
          </form>
        </>
      )}
    </div>
  );
}
