import { requireAdmin } from "@/lib/auth";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { IconHome, IconMembers } from "@/components/admin/AdminIcons";
import { listBanners } from "@/lib/banners-db";
import { BannerListClient } from "./BannerListClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "회원 배너 — 집무실" };

export default async function AdminBannersPage() {
  await requireAdmin();
  const banners = await listBanners();

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "집무실 홈", href: "/admin", icon: <IconHome size={14} /> },
          { label: "회원 배너", icon: <IconMembers size={14} /> },
        ]}
      />

      <div className="max-w-[1040px] mx-auto px-10 pt-12 pb-24">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-[var(--admin-ink)] mb-2">
            회원 배너
            <span className="font-serif text-sm text-[var(--admin-mute)] ml-3 tracking-widest">
              廣告
            </span>
          </h1>
          <p className="text-[var(--admin-ink-soft)] text-sm leading-relaxed max-w-xl">
            영가회 회원의 외부 사이트로 연결되는 배너를 등록합니다.
            메인 페이지 하단에 가로로 노출됩니다.
          </p>
        </div>

        <BannerListClient banners={banners} />
      </div>
    </>
  );
}
