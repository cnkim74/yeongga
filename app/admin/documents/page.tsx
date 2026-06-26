import { requireAdmin } from "@/lib/auth";
import { listDocuments } from "@/lib/documents-db";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { DocumentListClient } from "./DocumentListClient";

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage() {
  await requireAdmin();
  const documents = await listDocuments();
  const categoryCount = new Set(
    documents.map((d) => d.category ?? "기타")
  ).size;

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "집무실 홈", href: "/admin" },
          { label: "🗂️ 자료실" },
        ]}
      />

      <div className="px-12 pt-12 pb-24 max-w-[1080px] mx-auto">
        <div className="text-7xl mb-3 leading-none select-none">🗂️</div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">자료실</h1>
        <p className="text-[var(--color-notion-mute)] text-base mb-6 max-w-2xl">
          회의록·서식·회계 등 자료를 올려 두면 로그인한 회원이 열람·다운로드할 수 있습니다.
        </p>

        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-10">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-notion-mute)]">총 자료</span>
            <span className="font-medium">{documents.length}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-notion-mute)]">분류</span>
            <span className="font-medium">{categoryCount}개</span>
          </div>
        </div>

        <DocumentListClient documents={documents} />
      </div>
    </>
  );
}
