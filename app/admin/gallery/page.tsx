import { requireAdmin } from "@/lib/auth";
import { listCategories, listPhotos } from "@/lib/gallery-db";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { GalleryCategoryList } from "./GalleryCategoryList";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  await requireAdmin();
  const [categories, allPhotos] = await Promise.all([
    listCategories(),
    listPhotos(),
  ]);

  const uncategorizedCount = allPhotos.filter((p) => p.category_id === null).length;

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "집무실 홈", href: "/admin" },
          { label: "🖼️ 갤러리 관리" },
        ]}
      />

      <div className="px-12 pt-12 pb-24 max-w-[1080px] mx-auto">
        <div className="text-7xl mb-3 leading-none select-none">🖼️</div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">갤러리 관리</h1>
        <p className="text-[var(--color-notion-mute)] text-base mb-6 max-w-2xl">
          카테고리를 만들고 사진을 업로드합니다. 공개 갤러리에서 바로 확인할 수 있습니다.
        </p>

        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-10">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-notion-mute)]">카테고리</span>
            <span className="font-medium">{categories.length}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-notion-mute)]">전체 사진</span>
            <span className="font-medium">{allPhotos.length}장</span>
          </div>
          {uncategorizedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-notion-mute)]">미분류</span>
              <span className="font-medium text-amber-600">{uncategorizedCount}장</span>
            </div>
          )}
        </div>

        <GalleryCategoryList categories={categories} />
      </div>
    </>
  );
}
