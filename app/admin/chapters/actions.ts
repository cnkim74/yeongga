"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { upsertChapterMeta, type DisplayMode } from "@/lib/chapter-meta-db";

export async function saveChapterMetaAction(formData: FormData) {
  await requireAdmin();

  const chapter_slug = String(formData.get("chapter_slug") ?? "").trim();
  if (!chapter_slug) return { error: "챕터 슬러그가 없습니다." };

  const cover_image_raw = String(formData.get("cover_image") ?? "").trim();
  const cover_image = cover_image_raw || null;

  const mode = String(formData.get("display_mode") ?? "latest");
  const display_mode: DisplayMode =
    mode === "featured" ? "featured" : mode === "random" ? "random" : "latest";

  const featuredRaw = formData.get("featured_article_id");
  const featured_article_id =
    featuredRaw && String(featuredRaw).trim() !== ""
      ? Number(featuredRaw)
      : null;

  const visible = formData.get("visible") === "1";
  const positionRaw = formData.get("position");
  const position = positionRaw ? Number(positionRaw) : 0;

  await upsertChapterMeta(chapter_slug, {
    cover_image,
    display_mode,
    featured_article_id,
    visible,
    position,
  });

  revalidatePath("/admin/chapters");
  revalidatePath("/");
  return { ok: true };
}
