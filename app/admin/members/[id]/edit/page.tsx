import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { getUser } from "@/lib/users-db";
import { MemberForm } from "../../MemberForm";

export const dynamic = "force-dynamic";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = getUser(Number(id));
  if (!user) notFound();

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "🗂️ 관리실 홈", href: "/admin" },
          { label: "👥 회원 명부", href: "/admin/members" },
          { label: user.name },
        ]}
      />
      <div className="px-12 pt-12 pb-24 max-w-[960px] mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{user.name}</h1>
        <p className="text-sm text-[var(--color-notion-mute)] font-mono mb-8">
          @{user.username}
        </p>
        <MemberForm user={user} />
      </div>
    </>
  );
}
