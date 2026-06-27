import { requireAdmin } from "@/lib/auth";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { AlbumForm } from "../../AlbumForm";

export const dynamic = "force-dynamic";

export default async function NewAlbumPage() {
  await requireAdmin();

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "집무실 홈", href: "/admin" },
          { label: "🖼️ 갤러리 관리", href: "/admin/gallery" },
          { label: "새 앨범" },
        ]}
      />
      <div className="px-12 pt-12 pb-24 max-w-[820px] mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-6">새 앨범</h1>
        <AlbumForm />
      </div>
    </>
  );
}
