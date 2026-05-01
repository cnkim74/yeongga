"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  createVideo,
  deleteVideo,
  setFeatured,
  updateVideo,
} from "@/lib/videos-db";

export type VideoFormState = { error?: string };

function refresh() {
  revalidatePath("/admin/videos");
  revalidatePath("/videos");
  revalidatePath("/");
}

export async function saveVideoAction(
  _prev: VideoFormState,
  formData: FormData
): Promise<VideoFormState> {
  await requireAdmin();

  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const title = String(formData.get("title") ?? "").trim();
  const inputUrl = String(formData.get("inputUrl") ?? "").trim();
  const kicker = String(formData.get("kicker") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const featured = formData.get("featured") === "on";

  if (!title) return { error: "제목은 비워둘 수 없습니다." };
  if (!inputUrl)
    return { error: "유튜브/비메오 URL을 붙여 넣어 주세요." };

  if (id) {
    await updateVideo(id, { kicker, title, description, inputUrl, featured });
  } else {
    const r = await createVideo({ kicker, title, description, inputUrl, featured });
    if (!r.ok) return { error: r.error };
  }

  refresh();
  redirect("/admin/videos");
}

export async function setFeaturedAction(formData: FormData) {
  await requireAdmin();
  await setFeatured(Number(formData.get("id")));
  refresh();
}

export async function deleteVideoAction(formData: FormData) {
  await requireAdmin();
  await deleteVideo(Number(formData.get("id")));
  refresh();
}
