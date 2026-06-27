import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getCategoryById, listPhotos } from "@/lib/gallery-db";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { AlbumForm } from "../../../AlbumForm";

export const dynamic = "force-dynamic";

export default async function EditAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const albumId = Number(id);
  const album = await getCategoryById(albumId);
  if (!album) notFound();

  const photos = await listPhotos({ categoryId: albumId });
  const existingImages = photos.map((p) => ({
    image_url: p.image_url,
    file_name: p.title ?? undefined,
  }));
  const defaultVisibility =
    photos.length > 0 && photos.every((p) => p.visibility === "members-only")
      ? "members-only"
      : "public";

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "집무실 홈", href: "/admin" },
          { label: "🖼️ 갤러리 관리", href: "/admin/gallery" },
          { label: `✏️ ${album.name}` },
        ]}
      />
      <div className="px-12 pt-12 pb-24 max-w-[820px] mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-6">앨범 수정</h1>
        <AlbumForm
          album={{
            id: album.id,
            name: album.name,
            slug: album.slug,
            description: album.description,
          }}
          existingImages={existingImages}
          defaultVisibility={defaultVisibility}
        />
      </div>
    </>
  );
}
