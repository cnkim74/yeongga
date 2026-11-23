"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import {
  createArticle,
  deleteArticle,
  getArticleFileOriginal,
  getArticleRevisionHTML,
  listArticleRevisions,
  setArticleHidden,
  setArticlesHidden,
  updateArticle,
  type ArticleInput,
  type ArticleRevisionMeta,
  type Visibility,
} from "@/lib/articles-db";
import { setTagsForArticle } from "@/lib/tags-db";
import { allChapters as chapters } from "@/lib/chapters";

export type ArticleFormState = { error?: string };

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

function refresh(chapter: string, slug?: string) {
  revalidatePath("/admin/articles");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath(`/archive/${chapter}`);
  if (slug) revalidatePath(`/archive/${chapter}/${slug}`);
  revalidateTag("articles", "max"); // unstable_cache 무효화
}

function readInput(formData: FormData): ArticleInput | { _error: string } {
  const chapter = String(formData.get("chapter") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const author = String(formData.get("author") ?? "").trim() || null;
  const excerpt = String(formData.get("excerpt") ?? "").trim() || null;
  const cover = String(formData.get("cover") ?? "").trim() || null;
  const date = String(formData.get("date") ?? "").trim();
  const visibility = (
    formData.get("visibility") === "members-only" ? "members-only" : "public"
  ) as Visibility;
  const body = String(formData.get("body") ?? "");

  if (!chapters.find((c) => c.slug === chapter)) {
    return { _error: "장(章)을 선택해 주세요." };
  }
  if (!slug) return { _error: "슬러그를 입력해 주세요." };
  if (!SLUG_RE.test(slug)) {
    return {
      _error: "슬러그는 영문 소문자·숫자·하이픈만 가능합니다 (예: cheot-moim).",
    };
  }
  if (!title) return { _error: "제목은 비워둘 수 없습니다." };
  if (!date) return { _error: "날짜를 입력해 주세요." };
  // HTML 본문 — 빈 단락만 있으면 비어 있다고 판정. 이미지나 영상이 있으면 통과.
  const hasMedia = /<img|<iframe/i.test(body);
  const hasText = body.replace(/<[^>]+>/g, "").trim().length > 0;
  if (!hasMedia && !hasText) return { _error: "본문이 비어 있습니다." };

  return {
    chapter,
    slug,
    title,
    subtitle,
    author,
    excerpt,
    cover,
    date,
    visibility,
    body,
  };
}

export async function saveArticleAction(
  _prev: ArticleFormState,
  formData: FormData
): Promise<ArticleFormState> {
  await requireAdmin();

  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;

  const parsed = readInput(formData);
  if ("_error" in parsed) return { error: parsed._error };

  // 태그 파싱 (쉼표 구분 문자열 → 배열)
  const tagsRaw = String(formData.get("tags") ?? "");
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  let articleId: number;
  if (id) {
    const r = await updateArticle(id, parsed);
    if (!r.ok) return { error: r.error };
    articleId = id;
  } else {
    const r = await createArticle(parsed);
    if (!r.ok) return { error: r.error };
    articleId = r.id;
  }

  await setTagsForArticle(articleId, tags);

  refresh(parsed.chapter, parsed.slug);
  revalidatePath("/search");
  revalidatePath("/admin/tags");
  redirect("/admin/articles");
}

export async function deleteArticleAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const chapter = String(formData.get("chapter") ?? "");
  await deleteArticle(id);
  refresh(chapter);
}

/** 글 관리 — 비공개 켜기/끄기. 삭제와 달리 언제든 되돌릴 수 있다(seeded_deletions 에 기록하지 않음). */
export async function setArticleHiddenAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const chapter = String(formData.get("chapter") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const hide = String(formData.get("hide") ?? "") === "1";
  if (!Number.isInteger(id) || id <= 0) return;
  await setArticleHidden(id, hide);
  refresh(chapter, slug);
  revalidatePath("/search");
  revalidatePath("/sitemap.xml");
}

/** 글 관리 목록 — '비공개 글 숨기기' 설정(쿠키로 기억, 다음에 들어와도 유지). */
// "use server" 파일은 async 함수만 내보낼 수 있어 이름은 page.tsx 에도 같은 값으로 적는다.
const ADMIN_HIDE_HIDDEN_COOKIE = "admin_hide_hidden";
export async function setAdminHideHiddenAction(formData: FormData) {
  await requireAdmin();
  const on = String(formData.get("on") ?? "") === "1";
  const jar = await cookies();
  if (on) {
    jar.set(ADMIN_HIDE_HIDDEN_COOKIE, "1", {
      path: "/admin",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
    });
  } else {
    jar.delete({ name: ADMIN_HIDE_HIDDEN_COOKIE, path: "/admin" });
  }
  revalidatePath("/admin/articles");
}

/** 글 관리 — 체크한 글 여러 편을 한꺼번에 비공개/다시 공개. */
export async function setArticlesHiddenBulkAction(formData: FormData) {
  await requireAdmin();
  const ids = formData
    .getAll("ids")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
  const hide = String(formData.get("hide") ?? "") === "1";
  await setArticlesHidden(ids, hide);
  revalidatePath("/", "layout");
  revalidateTag("articles", "max");
}

/** 편집기 — 이 글의 이전 버전 목록과 파일 원본 유무. */
export async function listRevisionsAction(
  articleId: number
): Promise<{ revisions: ArticleRevisionMeta[]; fileLayoutBlocks: number | null }> {
  await requireAdmin();
  const [revisions, file] = await Promise.all([
    listArticleRevisions(articleId),
    getArticleFileOriginal(articleId),
  ]);
  return { revisions, fileLayoutBlocks: file ? file.layoutBlocks : null };
}

/** 편집기 — 고른 버전(이전 저장본 또는 파일 원본)의 본문 HTML. 불러오기만 하고 저장은 편집자가 한다. */
export async function loadRevisionAction(
  articleId: number,
  revisionId: number | "file"
): Promise<string | null> {
  await requireAdmin();
  if (revisionId === "file") return (await getArticleFileOriginal(articleId))?.html ?? null;
  return getArticleRevisionHTML(articleId, revisionId);
}
