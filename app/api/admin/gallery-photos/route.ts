import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listAlbums, listPhotos } from "@/lib/gallery-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 글 편집기의 「사진 란에서 가져오기」 창이 쓰는 목록. 관리자 전용.
//  - /api/admin/gallery-photos            → 앨범 목록 (숨긴 앨범 포함)
//  - /api/admin/gallery-photos?album=12   → 그 앨범의 사진
export async function GET(req: Request) {
  await requireAdmin();
  const albumParam = new URL(req.url).searchParams.get("album");

  if (albumParam) {
    const id = Number(albumParam);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "잘못된 앨범 번호입니다." }, { status: 400 });
    }
    const photos = await listPhotos({ categoryId: id });
    return NextResponse.json({
      photos: photos.map((p) => ({
        id: p.id,
        url: p.image_url,
        title: p.title,
        visibility: p.visibility,
      })),
    });
  }

  const albums = await listAlbums(false, true);
  return NextResponse.json({
    albums: albums.map((a) => ({
      id: a.id,
      name: a.name,
      year: a.year ?? null,
      eventDate: a.event_date ?? null,
      cover: a.cover,
      count: a.photo_count,
      hidden: a.hidden,
    })),
  });
}
