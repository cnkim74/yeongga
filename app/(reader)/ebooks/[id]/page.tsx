import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getEbook } from "@/lib/ebooks-db";
import { EbookReader } from "@/components/EbookReader";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ebook = await getEbook(Number(id));
  if (!ebook) return {};
  return {
    title: `${ebook.title} — 영가회 이북`,
    description: ebook.description ?? undefined,
  };
}

export default async function EbookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, ebook] = await Promise.all([
    getCurrentUser(),
    getEbook(Number(id)),
  ]);

  if (!ebook) notFound();

  const isLocked = ebook.visibility === "members-only" && !user;

  if (isLocked) {
    return (
      <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center px-6 py-24">
        <div className="rounded-3xl border border-[var(--color-rule)] bg-white p-10 sm:p-14 text-center max-w-md w-full">
          <div className="text-5xl mb-4 select-none">🔒</div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">
            회원만 볼 수 있는 이북입니다
          </h1>
          <p className="text-[var(--color-ink-soft)] leading-relaxed mb-8">
            {ebook.description ? (
              <>
                <span className="block mb-3 italic text-[var(--color-ink-mute)]">
                  &ldquo;{ebook.description}&rdquo;
                </span>
                이 이북은 영가회 회원으로 로그인하셔야 볼 수 있습니다.
              </>
            ) : (
              <>이 이북은 영가회 회원만 볼 수 있도록 설정되어 있습니다.</>
            )}
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Link
              href={`/login?next=/ebooks/${ebook.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-ink)] text-white text-sm font-medium hover:opacity-90 transition"
            >
              회원 로그인 →
            </Link>
            <Link
              href="/ebooks"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[var(--color-rule)] text-sm font-medium hover:bg-[var(--color-bg-soft)] transition"
            >
              이북 서재로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <EbookReader
      pdfUrl={ebook.pdf_url}
      title={ebook.title}
      backHref="/ebooks"
    />
  );
}
