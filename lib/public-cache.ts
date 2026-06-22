import "server-only";
import { unstable_cache } from "next/cache";

import { listActiveSlides as _listActiveSlides } from "./slides-db";
import {
  getFeaturedVideo as _getFeaturedVideo,
  listVideos as _listVideos,
} from "./videos-db";
import { listActiveBanners as _listActiveBanners } from "./banners-db";
import {
  listHomeChapterDisplays as _listHomeChapterDisplays,
  getChapterMeta as _getChapterMeta,
} from "./chapter-meta-db";
import {
  listAllArticles as _listAllArticles,
  listChapterArticles as _listChapterArticles,
  getArticleBySlug as _getArticleBySlug,
  getLatestPerChapter as _getLatestPerChapter,
} from "./articles-db";
import { listEbooks as _listEbooks } from "./ebooks-db";
import {
  listCategories as _listCategories,
  listPhotos as _listPhotos,
  listPhotosByCategory as _listPhotosByCategory,
  getCategoryBySlug as _getCategoryBySlug,
} from "./gallery-db";
import { getPageBackground as _getPageBackground } from "./backgrounds-db";
import { listUsers as _listUsers } from "./users-db";
import {
  getTagsForArticle as _getTagsForArticle,
  listAllTags as _listAllTags,
  listArticlesByTag as _listArticlesByTag,
  searchArticles as _searchArticles,
} from "./tags-db";

/**
 * 공개 페이지 전용 읽기 캐시.
 *
 * 배경: 거의 모든 공개 페이지가 `force-dynamic` 이라 캐싱이 전혀 되지 않아,
 * 방문/크롤 한 번마다 DB 콘텐츠 쿼리가 통째로 다시 실행되어 Turso "rows read"
 * 할당량이 폭증했다. 여기서 콘텐츠 읽기 함수를 `unstable_cache` 로 감싸면
 * `force-dynamic` 페이지여도 DB 를 다시 때리지 않고 데이터 캐시에서 응답한다.
 *
 * - 모든 캐시는 단일 태그(PUBLIC_TAG)로 묶여, 어드민에서 콘텐츠를 수정하면
 *   해당 액션이 `revalidateTag(PUBLIC_TAG)` 로 전체 공개 캐시를 즉시 무효화한다.
 * - TTL(revalidate)은 백스톱 — 무효화 호출이 누락돼도 30분이면 자동 갱신된다.
 * - 어드민 페이지는 이 모듈을 쓰지 않고 raw `*-db.ts` 함수를 직접 써서 항상 최신.
 * - 세션(getCurrentUser)은 암호화 쿠키만 읽고 DB 를 건드리지 않으므로 캐싱 불필요.
 */
export const PUBLIC_TAG = "public-content";
const opts = { tags: [PUBLIC_TAG], revalidate: 1800 };

export const listActiveSlides = unstable_cache(
  _listActiveSlides,
  ["pc:slides:active"],
  opts
);
export const getFeaturedVideo = unstable_cache(
  _getFeaturedVideo,
  ["pc:videos:featured"],
  opts
);
export const listVideos = unstable_cache(_listVideos, ["pc:videos:all"], opts);
export const listActiveBanners = unstable_cache(
  _listActiveBanners,
  ["pc:banners:active"],
  opts
);
export const listHomeChapterDisplays = unstable_cache(
  _listHomeChapterDisplays,
  ["pc:chapter:home"],
  opts
);
export const getChapterMeta = unstable_cache(
  _getChapterMeta,
  ["pc:chapter:meta"],
  opts
);
export const listAllArticles = unstable_cache(
  _listAllArticles,
  ["pc:articles:all"],
  opts
);
export const listChapterArticles = unstable_cache(
  _listChapterArticles,
  ["pc:articles:chapter"],
  opts
);
export const getArticleBySlug = unstable_cache(
  _getArticleBySlug,
  ["pc:articles:slug"],
  opts
);
export const getLatestPerChapter = unstable_cache(
  _getLatestPerChapter,
  ["pc:articles:latest"],
  opts
);
export const listEbooks = unstable_cache(_listEbooks, ["pc:ebooks:all"], opts);
export const listCategories = unstable_cache(
  _listCategories,
  ["pc:gallery:categories"],
  opts
);
export const listPhotos = unstable_cache(
  _listPhotos,
  ["pc:gallery:photos"],
  opts
);
export const listPhotosByCategory = unstable_cache(
  _listPhotosByCategory,
  ["pc:gallery:photos-by-cat"],
  opts
);
export const getCategoryBySlug = unstable_cache(
  _getCategoryBySlug,
  ["pc:gallery:category"],
  opts
);
export const getPageBackground = unstable_cache(
  _getPageBackground,
  ["pc:bg:page"],
  opts
);
export const listUsers = unstable_cache(_listUsers, ["pc:users:all"], opts);
export const getTagsForArticle = unstable_cache(
  _getTagsForArticle,
  ["pc:tags:article"],
  opts
);
export const listAllTags = unstable_cache(_listAllTags, ["pc:tags:all"], opts);
export const listArticlesByTag = unstable_cache(
  _listArticlesByTag,
  ["pc:tags:by-tag"],
  opts
);
export const searchArticles = unstable_cache(
  _searchArticles,
  ["pc:search"],
  opts
);
