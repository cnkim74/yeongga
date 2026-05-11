"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createBanner, updateBanner, deleteBanner } from "@/lib/banners-db";

function refresh() {
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function createBannerAction(formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const image_url = String(formData.get("image_url") ?? "").trim();
  const link_url = String(formData.get("link_url") ?? "").trim();
  const position = Number(formData.get("position") ?? 0) || 0;
  const active = formData.get("active") === "1";

  if (!title) return { error: "제목을 입력해 주세요." };
  if (!image_url) return { error: "이미지를 업로드해 주세요." };
  if (!link_url) return { error: "링크 URL을 입력해 주세요." };

  await createBanner({ title, subtitle, image_url, link_url, position, active });
  refresh();
  return { ok: true };
}

export async function updateBannerAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) return { error: "ID가 없습니다." };
  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const image_url = String(formData.get("image_url") ?? "").trim();
  const link_url = String(formData.get("link_url") ?? "").trim();
  const position = Number(formData.get("position") ?? 0) || 0;
  const active = formData.get("active") === "1";

  if (!title) return { error: "제목을 입력해 주세요." };
  if (!image_url) return { error: "이미지를 업로드해 주세요." };
  if (!link_url) return { error: "링크 URL을 입력해 주세요." };

  await updateBanner(id, { title, subtitle, image_url, link_url, position, active });
  refresh();
  return { ok: true };
}

export async function deleteBannerAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) return;
  await deleteBanner(id);
  refresh();
}
