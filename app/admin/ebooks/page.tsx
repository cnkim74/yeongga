import { requireAdmin } from "@/lib/auth";
import { listEbooks } from "@/lib/ebooks-db";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { EbookListClient } from "./EbookListClient";

export const dynamic = "force-dynamic";

export default async function AdminEbooksPage() {
  await requireAdmin();
  const ebooks = await listEbooks();

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "집무실 홈", href: "/admin" },
          { label: "📚 이북 관리" },
        ]}
      />

      <div className="px-12 pt-12 pb-24 max-w-[1080px] mx-auto">
        <div className="text-7xl mb-3 leading-none select-none">📚</div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">이북 관리</h1>
        <p className="text-[var(--color-notion-mute)] text-base mb-6 max-w-2xl">
          PDF 파일을 업로드하고 공개 서재에서 열람할 수 있도록 관리합니다.
        </p>

        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-10">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-notion-mute)]">총</span>
            <span className="font-medium">{ebooks.length}권</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-notion-mute)]">공개</span>
            <span className="font-medium">
              {ebooks.filter((e) => e.visibility === "public").length}권
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-notion-mute)]">🔒 회원 전용</span>
            <span className="font-medium">
              {ebooks.filter((e) => e.visibility === "members-only").length}권
            </span>
          </div>
        </div>

        <EbookListClient ebooks={ebooks} />
      </div>
    </>
  );
}
