"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createPhoto,
  updatePhoto,
  deletePhoto,
  getCategoryById,
  listCategories,
  listPhotos,
} from "@/lib/gallery-db";
import { deleteUploadIfLocal } from "@/lib/uploads";

function refreshPaths() {
  revalidatePath("/gallery");
  revalidatePath("/admin/gallery");
  revalidateTag("gallery", "max"); // unstable_cache 무효화
}

// ─── 앨범(게시판식) 액션 ──────────────────────────────────────

type AlbumImage = { image_url: string; file_name?: string };

function parseAlbumImages(raw: FormDataEntryValue | null): AlbumImage[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(String(raw));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((a) => a && typeof a.image_url === "string")
      .map((a) => ({ image_url: String(a.image_url), file_name: a.file_name ? String(a.file_name) : undefined }));
  } catch {
    return [];
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  const cats = await listCategories();
  const taken = new Set(
    cats.filter((c) => c.id !== excludeId).map((c) => c.slug)
  );
  let candidate = base || "album";
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${base || "album"}-${n}`;
    n += 1;
  }
  return candidate;
}

export async function createAlbumAction(fd: FormData) {
  await requireAdmin();

  const name = String(fd.get("name") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim() || null;
  const slugInput = slugify(String(fd.get("slug") ?? ""));
  const visibility =
    fd.get("visibility") === "members-only" ? "members-only" : "public";
  const images = parseAlbumImages(fd.get("images"));

  if (!name) return { error: "앨범 제목을 입력해 주세요." };

  const base = slugInput || slugify(name) || `album-${Date.now().toString(36)}`;
  const slug = await uniqueSlug(base);
  const cover_url = images[0]?.image_url ?? null;

  const categoryId = await createCategory({ name, slug, description, cover_url });
  for (let i = 0; i < images.length; i++) {
    await createPhoto({
      category_id: categoryId,
      image_url: images[i].image_url,
      position: i,
      visibility,
    });
  }

  refreshPaths();
  redirect("/admin/gallery");
}

export async function updateAlbumAction(fd: FormData) {
  await requireAdmin();

  const id = Number(fd.get("id"));
  if (!id) return { error: "ID가 없습니다." };
  const album = await getCategoryById(id);
  if (!album) return { error: "앨범을 찾을 수 없습니다." };

  const name = String(fd.get("name") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim() || null;
  const slugInput = slugify(String(fd.get("slug") ?? ""));
  const visibility =
    fd.get("visibility") === "members-only" ? "members-only" : "public";
  const images = parseAlbumImages(fd.get("images"));

  if (!name) return { error: "앨범 제목을 입력해 주세요." };

  const slug =
    slugInput && slugInput !== album.slug
      ? await uniqueSlug(slugInput, id)
      : album.slug;
  const cover_url = images[0]?.image_url ?? null;

  await updateCategory(id, { name, slug, description, cover_url });

  // 사진 동기화 — image_url 기준
  const existing = await listPhotos({ categoryId: id });
  const byUrl = new Map(existing.map((p) => [p.image_url, p]));
  const newUrls = new Set(images.map((im) => im.image_url));

  for (let i = 0; i < images.length; i++) {
    const url = images[i].image_url;
    const found = byUrl.get(url);
    if (found) {
      await updatePhoto(found.id, { position: i, visibility });
    } else {
      await createPhoto({
        category_id: id,
        image_url: url,
        position: i,
        visibility,
      });
    }
  }
  // 빠진 사진 제거 + 스토리지 정리
  for (const p of existing) {
    if (!newUrls.has(p.image_url)) {
      await deletePhoto(p.id);
      await deleteUploadIfLocal(p.image_url);
    }
  }

  refreshPaths();
  redirect("/admin/gallery");
}

export async function deleteAlbumAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!id) return;
  const photos = await listPhotos({ categoryId: id });
  for (const p of photos) {
    await deletePhoto(p.id);
    await deleteUploadIfLocal(p.image_url);
  }
  await deleteCategory(id);
  refreshPaths();
  redirect("/admin/gallery");
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
