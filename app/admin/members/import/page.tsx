import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { requireAdmin } from "@/lib/auth";
import { ImportClient } from "./ImportClient";

export const dynamic = "force-dynamic";

export default async function ImportMembersPage() {
  await requireAdmin();

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "🗂️ 관리실 홈", href: "/admin" },
          { label: "👥 회원 명부", href: "/admin/members" },
          { label: "엑셀 일괄 등록" },
        ]}
      />
      <div className="px-12 pt-12 pb-24 max-w-[1080px] mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          엑셀로 회원 일괄 등록
        </h1>
        <p className="text-[var(--color-notion-mute)] mb-8">
          엑셀(.xlsx) 또는 CSV 파일에 회원 명부를 정리해 한꺼번에 등록합니다.
          업로드 후 미리보기에서 확인 → 일괄 등록 두 단계입니다.
        </p>
        <ImportClient />
      </div>
    </>
  );
}
