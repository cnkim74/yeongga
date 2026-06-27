import { requireAdmin } from "@/lib/auth";
import { listAlbums } from "@/lib/gallery-db";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { GalleryAlbumList } from "./GalleryAlbumList";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  await requireAdmin();
  const albums = await listAlbums(false);
  const totalPhotos = albums.reduce((sum, a) => sum + a.photo_count, 0);

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
          앨범 단위로 제목·설명과 사진을 한 번에 올립니다. 공개 갤러리에서 카드로 보입니다.
        </p>

        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-10">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-notion-mute)]">앨범</span>
            <span className="font-medium">{albums.length}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-notion-mute)]">전체 사진</span>
            <span className="font-medium">{totalPhotos}장</span>
          </div>
        </div>

        <GalleryAlbumList albums={albums} />
      </div>
    </>
  );
}
