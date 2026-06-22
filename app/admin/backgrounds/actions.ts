"use server";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { upsertPageBackground } from "@/lib/backgrounds-db";
import { PUBLIC_TAG } from "@/lib/public-cache";

export type BgFormState = { error?: string; ok?: boolean };

export async function saveBgAction(
  _prev: BgFormState,
  formData: FormData
): Promise<BgFormState> {
  await requireAdmin();
  const page = String(formData.get("page") ?? "").trim();
  const opacityRaw = Number(formData.get("opacity") ?? 20);
  const position = String(formData.get("position") ?? "center");
  const active = formData.get("active") === "1";
  const imagePath = String(formData.get("image_path") ?? "").trim() || undefined;

  if (!page) return { error: "페이지가 지정되지 않았습니다." };

  const opacity = Math.min(100, Math.max(0, opacityRaw)) / 100;

  await upsertPageBackground(page, {
    image_path: imagePath ?? null,
    opacity,
    position,
    active,
  });

  updateTag(PUBLIC_TAG);
  revalidatePath(`/admin/backgrounds`);
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath("/search");
  revalidatePath("/videos");
  revalidatePath("/about");
  revalidatePath("/gallery");
  revalidatePath("/ebooks");

  return { ok: true };
}

export async function removeImageAction(formData: FormData) {
  await requireAdmin();
  const page = String(formData.get("page") ?? "").trim();
  if (!page) return;
  await upsertPageBackground(page, { image_path: null, opacity: 0.2, position: "center", active: false });
  updateTag(PUBLIC_TAG);
  revalidatePath("/admin/backgrounds");
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath("/search");
  revalidatePath("/videos");
  revalidatePath("/about");
  revalidatePath("/gallery");
  revalidatePath("/ebooks");
}
