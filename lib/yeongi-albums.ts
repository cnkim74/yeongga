import "server-only";
import { listAlbums, listPhotosByCategory } from "./gallery-db";

/**
 * 연혁 글 아래에 보여 줄 사진 란 앨범.
 *
 * 글 본문은 건드리지 않고, 글 주소(slug)와 앨범 주소(slug)를 짝지어 두었다가
 * 글 페이지에서 본문 뒤에 붙여 보여 준다. 운영 연혁 13편(2026.11 정리본)만 대상이다.
 *
 *  - main   : 같은 행사·같은 날로 확인된 앨범 → 사진을 글 아래에 바로 보여 준다
 *  - albums : 그 회장 재임 기간(취임일~퇴임일)에 열린 행사 앨범 → 카드로 보여 주고
 *             누르면 사진 란의 앨범으로 간다 (취임 사진이라는 뜻이 아니라 '그 시기 행사')
 *
 * 대응하는 앨범이 없는 글(태동 Ⅰ·Ⅱ, 창립총회, 초대 회장, 회보 재개)은 항목을 두지 않는다.
 * 짝짓기 근거: 자료/연혁사진/연혁-사진-짝짓기표.md
 */
const YEONGI_ALBUMS: Record<string, { main?: string; albums: string[] }> = {
  // 2대 류목기 회장 (1998.10.24 ~ 2002.12.31) — main: 1998.10.24 임시총회에서 선임
  "2dae-hoejang-sidae": {
    main: "ev-1998-1024-imsi",
    albums: [
      "ev-1999-0531-hyangwoo",
      "ev-2000-0602-oeul",
      "ev-2002-chukha",
      "ev-2002-0109-sinnyeon",
      "ev-2002-0316-kimgwangrim",
      "ev-2002-0403-pungsan",
    ],
  },
  // 3대 금창태 회장 (2003.1.1 ~ 2006.12.31)
  "3dae-chuim": {
    albums: [
      "ev-2003-sinnyeon",
      "ev-2003-0415-chukha",
      "ev-2004-0113-heebeom",
      "ev-2004-0908-oeul",
      "ev-2006-0415-hadong",
    ],
  },
  // 4대 허동진 회장 (2007.1.10 ~ 2010.12.31)
  "4dae-chuim": {
    albums: [
      "ev-2007-1101-vietnam",
      "ev-2008-0109-sinnyeon",
      "ev-2009-0620-china",
      "ev-2009-0925-cheongsong",
      "ev-2010-sinnyeon",
    ],
  },
  // 5대 류종묵 회장 (2011.1.1 ~ 2014.12.31) — main: 2011.1.7 취임 하례회
  "5dae-chuim": {
    main: "ev-2011-0107-sinnyeon",
    albums: [
      "ev-2011-0419-hong",
      "ev-2011-1010-bakseil",
      "ev-2012-sinnyeon",
      "ev-2012-0424-bangi",
      "ev-2013-0111-sinnyeon",
      "ev-2014-0612-bangi",
    ],
  },
  // 6대 김봉구 회장 (2015.1.9 취임 ~ 2017.5.26) — main: 2015.1.9 취임 하례회
  "6dae-chuim": {
    main: "ev-2015-0109-sinnyeon",
    albums: ["ev-2015-0917-imsi", "ev-2016-0108-sinnyeon"],
  },
  // 7대 김계동 회장 (2017.5.27 ~ 2020.6)
  "7dae-chuim": {
    albums: ["ev-2017-0912-tambang", "ev-2018-0830-imsi"],
  },
  // 8대 문상부 회장 (2020.6 ~ 2025.2.5)
  "8dae-chuim": {
    albums: [
      "ev-2021-himang1",
      "ev-2022-golf1",
      "ev-2022-0624-dangsun",
      "ev-2022-0629-wonro",
      "ev-2022-0915-himang",
      "ev-2022-1006-gandam",
      "ev-2023-0203-chonghoe",
      "ev-2023-0515-seminar",
      "ev-2023-0914-wonro",
      "ev-2024-wonro-11",
      "ev-2024-wonro-13",
      "ev-2024-0119-chonghoe",
      "ev-2024-0402-isahoe",
      "ev-2024-0423-yecheon",
    ],
  },
  // 제9대 박대섭 회장 (2025.2.6 ~)
  "9dae-chuim": {
    albums: ["ev-2026-0630-yeokdae"],
  },
};

export type RelatedAlbums = {
  /** 같은 행사 앨범 — 사진을 바로 보여 준다 */
  main: {
    slug: string;
    name: string;
    eventDate: string | null;
    photos: { id: number; url: string; title: string | null }[];
  } | null;
  /** 재임 기간 행사 앨범 — 카드로 보여 준다 */
  others: {
    slug: string;
    name: string;
    year: number | null;
    eventDate: string | null;
    cover: string | null;
    count: number;
  }[];
};

/** 이 연혁 글에 붙일 앨범. 공개 사진이 있는 앨범만 — 없으면 null. */
export async function getRelatedAlbums(
  chapter: string,
  articleSlug: string
): Promise<RelatedAlbums | null> {
  if (chapter !== "yeongi") return null;
  const entry = YEONGI_ALBUMS[articleSlug];
  if (!entry) return null;

  // publicOnly=true · 숨긴 앨범 제외 — 사진 란과 같은 기준으로 공개된 것만
  const all = await listAlbums(true);
  const bySlug = new Map(all.map((a) => [a.slug, a]));

  let main: RelatedAlbums["main"] = null;
  if (entry.main) {
    const album = bySlug.get(entry.main);
    if (album && album.photo_count > 0) {
      const photos = (await listPhotosByCategory(entry.main))
        .filter((p) => p.visibility === "public")
        .sort((a, b) => a.position - b.position || a.id - b.id);
      if (photos.length > 0) {
        main = {
          slug: album.slug,
          name: album.name,
          eventDate: album.event_date,
          photos: photos.map((p) => ({ id: p.id, url: p.image_url, title: p.title })),
        };
      }
    }
  }

  const others = entry.albums
    .map((s) => bySlug.get(s))
    .filter((a): a is NonNullable<typeof a> => Boolean(a) && (a?.photo_count ?? 0) > 0)
    .map((a) => ({
      slug: a.slug,
      name: a.name,
      year: a.year ?? null,
      eventDate: a.event_date,
      cover: a.cover,
      count: a.photo_count,
    }));

  if (!main && others.length === 0) return null;
  return { main, others };
}
