import "server-only";
import { listAlbums, listPhotosByCategory } from "./gallery-db";

/**
 * 연혁 글 아래에 보여 줄 사진 란 앨범.
 *
 * 글 본문은 건드리지 않고, 글 주소(slug)와 앨범 주소(slug)를 짝지어 두었다가
 * 글 페이지에서 본문 뒤에 붙여 보여 준다. 같은 행사·같은 날로 확인된 것만 둔다.
 * (추정이거나 '그 시절 분위기' 정도인 것은 넣지 않는다 — 자료/연혁사진/연혁-사진-짝짓기표.md 참고)
 */
const YEONGI_ALBUMS: Record<string, string> = {
  // 영가문화 제1집 — 1982.3.25 발간
  "yeongga-munhwa-1jip": "ev-1982-0325-munhwa1",
  // 2대 류목기 회장 선임 — 1998.10.24 임시총회
  "2dae-hoejang-sidae": "ev-1998-1024-imsi",
  // 5대 류종묵 회장 취임 — 2011.1.7 신년하례회
  "5dae-chuim": "ev-2011-0107-sinnyeon",
  // 6대 김봉구 회장 취임 — 2015.1.9 신년하례회
  "6dae-chuim": "ev-2015-0109-sinnyeon",
};

export type RelatedAlbum = {
  slug: string;
  name: string;
  eventDate: string | null;
  photos: { id: number; url: string; title: string | null }[];
};

/** 이 연혁 글에 붙일 앨범과 공개 사진. 없거나 숨긴 앨범이면 null. */
export async function getRelatedAlbum(
  chapter: string,
  articleSlug: string
): Promise<RelatedAlbum | null> {
  if (chapter !== "yeongi") return null;
  const albumSlug = YEONGI_ALBUMS[articleSlug];
  if (!albumSlug) return null;

  // publicOnly=true · 숨긴 앨범 제외 — 사진 란과 같은 기준으로 공개된 것만
  const albums = await listAlbums(true);
  const album = albums.find((a) => a.slug === albumSlug);
  if (!album || album.photo_count === 0) return null;

  const photos = (await listPhotosByCategory(albumSlug))
    .filter((p) => p.visibility === "public")
    .sort((a, b) => a.position - b.position || a.id - b.id);
  if (photos.length === 0) return null;

  return {
    slug: album.slug,
    name: album.name,
    eventDate: album.event_date,
    photos: photos.map((p) => ({ id: p.id, url: p.image_url, title: p.title })),
  };
}
