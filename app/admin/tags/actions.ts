"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { deleteTag, renameTag } from "@/lib/tags-db";
import { PUBLIC_TAG } from "@/lib/public-cache";

function refresh() {
  updateTag(PUBLIC_TAG);
  revalidatePath("/admin/tags");
  revalidatePath("/search");
}

export async function deleteTagAction(formData: FormData) {
  await requireAdmin();
  const tag = String(formData.get("tag") ?? "").trim();
  if (!tag) return;
  await deleteTag(tag);
  refresh();
}

export async function renameTagAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  await requireAdmin();
  const oldTag = String(formData.get("oldTag") ?? "").trim();
  const newTag = String(formData.get("newTag") ?? "").trim();
  if (!oldTag || !newTag) return { error: "태그 이름을 입력해 주세요." };
  if (oldTag === newTag) return {};
  await renameTag(oldTag, newTag);
  refresh();
  return {};
}
