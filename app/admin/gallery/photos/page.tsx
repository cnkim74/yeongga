import { requireAdmin } from "@/lib/auth";
import { listPhotos, listCategories } from "@/lib/gallery-db";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { PhotoUploadForm } from "./PhotoUploadForm";
import { PhotoGridAdmin } from "./PhotoGridAdmin";

export const dynamic = "force-dynamic";

export default async function AdminPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await requireAdmin();
  const { category } = await searchParams;

  const categories = await listCategories();
  const filteredCat = category ? categories.find((c) => c.slug === category) : null;

  const photos = await listPhotos(filteredCat ? { categoryId: filteredCat.id } : undefined);

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "집무실 홈", href: "/admin" },
          { label: "🖼️ 갤러리 관리", href: "/admin/gallery" },
          { label: filteredCat ? `📁 ${filteredCat.name}` : "📷 전체 사진" },
        ]}
      />

      <div className="px-12 pt-12 pb-24 max-w-[1080px] mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {filteredCat ? filteredCat.name : "전체 사진"}
        </h1>
        <p className="text-[var(--color-notion-mute)] text-sm mb-6">
          {photos.length}장의 사진
          {filteredCat && (
            <>
              {" "}·{" "}
              <a href="/admin/gallery/photos" className="underline">
                전체 보기
              </a>
            </>
          )}
        </p>

        {/* 카테고리 필터 탭 */}
        <div className="flex flex-wrap gap-2 mb-8">
          <a
            href="/admin/gallery/photos"
            className={`notion-icon-btn text-xs ${!category ? "bg-[var(--color-notion-accent)] text-white" : ""}`}
          >
            전체
          </a>
          {categories.map((c) => (
            <a
              key={c.id}
              href={`/admin/gallery/photos?category=${c.slug}`}
              className={`notion-icon-btn text-xs ${
                category === c.slug ? "bg-[var(--color-notion-accent)] text-white" : ""
              }`}
            >
              {c.name} ({c.photo_count ?? 0})
            </a>
          ))}
        </div>

        <PhotoUploadForm categories={categories} defaultCategorySlug={category} />

        <PhotoGridAdmin photos={photos} />
      </div>
    </>
  );
}
