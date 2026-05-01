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
import { deleteUploadIfLocal, saveUpload } from "@/lib/uploads";

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

  if (!title) return { error: "제목은 비워둘 수 없습니다." };

  const file = formData.get("image") as File | null;
  let imagePath = String(formData.get("current_image") ?? "");

  if (file && file.size > 0) {
    const upload = await saveUpload("slides", file);
    if (!upload.ok) return { error: upload.error };
    if (id) {
      const existing = await getSlide(id);
      if (existing) await deleteUploadIfLocal(existing.image_path);
    }
    imagePath = upload.publicPath;
  }

  if (!imagePath) {
    return { error: "이미지 파일을 첨부해 주세요." };
  }

  if (id) {
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
