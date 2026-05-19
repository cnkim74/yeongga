"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createPhoto,
  updatePhoto,
  deletePhoto,
} from "@/lib/gallery-db";

function refreshPaths() {
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

// ─── 빠른 인라인 편집 ────────────────────────────────────────
// 카드 자리에서 한 가지 필드만 바로 바꿀 때 (예: 카테고리 드롭다운).
// 부분 업데이트 — 보내지 않은 필드는 그대로 유지.

export async function quickUpdatePhotoAction(input: {
  id: number;
  category_id?: number | null;
  title?: string | null;
  description?: string | null;
  taken_at?: string | null;
  visibility?: "public" | "members-only";
  position?: number;
}) {
  await requireAdmin();
  const id = input.id;
  if (!id) return { error: "ID가 없습니다." };

  // updatePhoto 는 전체 필드를 받지만, 보내지 않은 필드는 undefined →
  // gallery-db 단의 SET 절에서 그 필드가 빠지도록 처리되어 있어야 함.
  await updatePhoto(id, {
    category_id: input.category_id,
    title: input.title,
    description: input.description,
    taken_at: input.taken_at,
    visibility: input.visibility,
    position: input.position,
  });
  refreshPaths();
  return { ok: true };
}

// ─── 일괄 처리 ─────────────────────────────────────────────
// 체크박스로 여러 장 선택 후 한 가지 필드를 한 번에 바꿀 때.

export async function bulkUpdatePhotosAction(input: {
  ids: number[];
  category_id?: number | null;
  visibility?: "public" | "members-only";
}) {
  await requireAdmin();
  if (!input.ids || input.ids.length === 0) return { error: "선택된 사진이 없습니다." };

  for (const id of input.ids) {
    await updatePhoto(id, {
      category_id: input.category_id,
      visibility: input.visibility,
    });
  }
  refreshPaths();
  return { ok: true, count: input.ids.length };
}

export async function bulkDeletePhotosAction(input: { ids: number[] }) {
  await requireAdmin();
  if (!input.ids || input.ids.length === 0) return { error: "선택된 사진이 없습니다." };

  for (const id of input.ids) {
    await deletePhoto(id);
  }
  refreshPaths();
  return { ok: true, count: input.ids.length };
}
