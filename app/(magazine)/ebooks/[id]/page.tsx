import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getEbook } from "@/lib/ebooks-db";
import { EbookReader } from "@/components/EbookReader";

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
          <h1 className="display-md text-2xl sm:text-3xl mb-3">
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
              className="btn-pill"
            >
              회원 로그인 →
            </Link>
            <Link href="/ebooks" className="btn-pill ghost">
              이북 서재로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 이북 헤더 정보 */}
      <div className="bg-[var(--color-bg-soft)] border-b border-[var(--color-rule)] pt-28 pb-6 px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/ebooks"
            className="kicker text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] inline-flex items-center gap-2 mb-4"
          >
            ← 이북 서재
          </Link>
          <div className="flex items-start gap-5">
            {ebook.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ebook.cover_url}
                alt={ebook.title}
                className="w-16 rounded shadow-md shrink-0"
              />
            )}
            <div>
              {ebook.visibility === "members-only" && (
                <div className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-0.5 rounded-full bg-[var(--color-ink)] text-white text-xs font-semibold">
                  🔒 회원 전용
                </div>
              )}
              <h1 className="display text-2xl sm:text-3xl mb-1">{ebook.title}</h1>
              {ebook.description && (
                <p className="text-[var(--color-ink-soft)] text-sm sm:text-base leading-relaxed">
                  {ebook.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PDF 리더 */}
      <div className="flex-1">
        <EbookReader pdfUrl={ebook.pdf_url} title={ebook.title} />
      </div>
    </div>
  );
}
