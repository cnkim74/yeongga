import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { PostForm } from "../PostForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "글쓰기 — 자료실 · 영가회 아카이브",
};

export default async function NewPostPage() {
  const user = await requireMember("/board/new");

  return (
    <div className="pt-32 sm:pt-40 pb-24">
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href="/board"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] mb-6"
        >
          ← 목록
        </Link>
        <h1 className="display-md text-2xl mb-6">글쓰기</h1>
        <PostForm isAdmin={user.role === "admin"} />
      </div>
    </div>
  );
}
