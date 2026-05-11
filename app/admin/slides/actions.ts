"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  createSlide,
  deleteSlide,
  getSlide,
  moveSlide,
  toggleActive,
  updateSlide,
} from "@/lib/slides-db";
import { deleteUploadIfLocal } from "@/lib/uploads";

export type SlideFormState = { error?: string };

function refresh() {
  revalidatePath("/admin/slides");
  revalidatePath("/");
}

export async function saveSlideAction(
  _prev: SlideFormState,
  formData: FormData
): Promise<SlideFormState> {
  await requireAdmin();

  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const title = String(formData.get("title") ?? "").trim();
  const kicker = String(formData.get("kicker") ?? "").trim() || null;
  const excerpt = String(formData.get("excerpt") ?? "").trim() || null;
  const cta = String(formData.get("cta") ?? "").trim() || null;
  const href = String(formData.get("href") ?? "/").trim() || "/";
  const active = formData.get("active") === "on";

  // 이미지는 /api/upload/slide 로 먼저 업로드되고 URL 만 전달됨
  const imagePath = String(formData.get("image_path") ?? "").trim();

  if (!title) return { error: "제목은 비워둘 수 없습니다." };
  if (!imagePath) {
    return { error: "이미지를 업로드해 주세요." };
  }

  if (id) {
    // 기존 슬라이드 — 이미지가 바뀌었으면 옛 파일 정리
    const existing = await getSlide(id);
    if (existing && existing.image_path !== imagePath) {
      await deleteUploadIfLocal(existing.image_path);
    }
    await updateSlide(id, {
      image_path: imagePath,
      kicker,
      title,
      excerpt,
      cta,
      href,
      active,
    });
  } else {
    await createSlide({
      image_path: imagePath,
      kicker,
      title,
      excerpt,
      cta,
      href,
      active,
    });
  }

  refresh();
  redirect("/admin/slides");
}

export async function toggleSlideAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const active = formData.get("active") === "1";
  await toggleActive(id, active);
  refresh();
}

export async function moveSlideAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const dir = String(formData.get("dir")) as "up" | "down";
  await moveSlide(id, dir);
  refresh();
}

export async function deleteSlideAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const existing = await getSlide(id);
  if (existing) await deleteUploadIfLocal(existing.image_path);
  await deleteSlide(id);
  refresh();
}
