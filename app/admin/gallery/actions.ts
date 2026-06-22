"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createPhoto,
  updatePhoto,
  deletePhoto,
} from "@/lib/gallery-db";
import { PUBLIC_TAG } from "@/lib/public-cache";

function refreshPaths() {
  updateTag(PUBLIC_TAG);
  revalidatePath("/gallery");
  revalidatePath("/admin/gallery");
}

// ─── 카테고리 액션 ────────────────────────────────────────────

export async function createCategoryAction(fd: FormData) {
  await requireAdmin();

  const name = String(fd.get("name") ?? "").trim();
  const slug = String(fd.get("slug") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim() || null;
  const cover_url = String(fd.get("cover_url") ?? "").trim() || null;
  const position = Number(fd.get("position") ?? 0) || 0;

  if (!name) return { error: "이름을 입력해 주세요." };
  if (!slug) return { error: "슬러그를 입력해 주세요." };

  await createCategory({ name, slug, description, cover_url, position });
  refreshPaths();
  return { ok: true };
}

export async function updateCategoryAction(fd: FormData) {
  await requireAdmin();

  const id = Number(fd.get("id"));
  if (!id) return { error: "ID가 없습니다." };

  const name = String(fd.get("name") ?? "").trim();
  const slug = String(fd.get("slug") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim() || null;
  const cover_url = String(fd.get("cover_url") ?? "").trim() || null;
  const position = Number(fd.get("position") ?? 0) || 0;

  if (!name) return { error: "이름을 입력해 주세요." };
  if (!slug) return { error: "슬러그를 입력해 주세요." };

  await updateCategory(id, { name, slug, description, cover_url, position });
  refreshPaths();
  return { ok: true };
}

export async function deleteCategoryAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  await deleteCategory(id);
  refreshPaths();
}

// ─── 사진 액션 ────────────────────────────────────────────────

export async function createPhotoAction(fd: FormData) {
  await requireAdmin();

  const image_url = String(fd.get("image_url") ?? "").trim();
  if (!image_url) return { error: "이미지 URL이 없습니다." };

  const category_id_raw = fd.get("category_id");
  const category_id =
    category_id_raw && String(category_id_raw).trim() !== ""
      ? Number(category_id_raw)
      : null;
  const title = String(fd.get("title") ?? "").trim() || null;
  const description = String(fd.get("description") ?? "").trim() || null;
  const taken_at = String(fd.get("taken_at") ?? "").trim() || null;
  const position = Number(fd.get("position") ?? 0) || 0;
  const visibility =
    fd.get("visibility") === "members-only" ? "members-only" : "public";

  await createPhoto({ category_id, title, description, image_url, taken_at, position, visibility });
  refreshPaths();
  return { ok: true };
}

export async function updatePhotoAction(fd: FormData) {
  await requireAdmin();

  const id = Number(fd.get("id"));
  if (!id) return { error: "ID가 없습니다." };

  const category_id_raw = fd.get("category_id");
  const category_id =
    category_id_raw && String(category_id_raw).trim() !== ""
      ? Number(category_id_raw)
      : null;
  const title = String(fd.get("title") ?? "").trim() || null;
  const description = String(fd.get("description") ?? "").trim() || null;
  const image_url = String(fd.get("image_url") ?? "").trim();
  const taken_at = String(fd.get("taken_at") ?? "").trim() || null;
  const position = Number(fd.get("position") ?? 0) || 0;
  const visibility =
    fd.get("visibility") === "members-only" ? "members-only" : "public";

  await updatePhoto(id, { category_id, title, description, image_url, taken_at, position, visibility });
  refreshPaths();
  return { ok: true };
}

export async function deletePhotoAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  await deletePhoto(id);
  refreshPaths();
}
