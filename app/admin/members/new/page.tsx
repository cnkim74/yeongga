import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { MemberForm } from "../MemberForm";

export default function NewMemberPage() {
  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "🗂️ 관리실 홈", href: "/admin" },
          { label: "👥 회원 명부", href: "/admin/members" },
          { label: "새 회원" },
        ]}
      />
      <div className="px-12 pt-12 pb-24 max-w-[960px] mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">새 회원 등록</h1>
        <MemberForm />
      </div>
    </>
  );
}
