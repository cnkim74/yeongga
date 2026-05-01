"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  createArticle,
  deleteArticle,
  updateArticle,
  type ArticleInput,
  type Visibility,
} from "@/lib/articles-db";
import { chapters } from "@/lib/chapters";

export type ArticleFormState = { error?: string };

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

function refresh(chapter: string, slug?: string) {
  revalidatePath("/admin/articles");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath(`/archive/${chapter}`);
  if (slug) revalidatePath(`/archive/${chapter}/${slug}`);
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
  if (!body.trim()) return { _error: "본문이 비어 있습니다." };

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

  if (id) {
    const r = await updateArticle(id, parsed);
    if (!r.ok) return { error: r.error };
  } else {
    const r = await createArticle(parsed);
    if (!r.ok) return { error: r.error };
  }

  refresh(parsed.chapter, parsed.slug);
  redirect("/admin/articles");
}

export async function deleteArticleAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const chapter = String(formData.get("chapter") ?? "");
  await deleteArticle(id);
  refresh(chapter);
}
