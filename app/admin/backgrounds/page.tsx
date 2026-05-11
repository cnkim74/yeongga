import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { listPageBackgrounds } from "@/lib/backgrounds-db";
import { BgCard } from "./BgCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "페이지 배경 — 집무실" };

export default async function BackgroundsAdminPage() {
  const bgs = await listPageBackgrounds();

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "집무실 홈", href: "/admin" },
          { label: "🖼️ 페이지 배경" },
        ]}
      />
      <div className="px-8 sm:px-12 pt-12 pb-24 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">페이지 배경 이미지</h1>
          <p className="text-sm text-[var(--color-notion-mute)] mt-1">
            각 페이지 상단 히어로 섹션의 배경 이미지와 투명도를 설정합니다.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bgs.map((bg) => (
            <BgCard key={bg.page} bg={bg} />
          ))}
        </div>
      </div>
    </>
  );
}
