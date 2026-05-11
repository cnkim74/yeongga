"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  updateSubmissionStatus,
  deleteSubmission,
  type SubmissionStatus,
} from "@/lib/submissions-db";

function isValidStatus(s: string): s is SubmissionStatus {
  return ["new", "reviewing", "done", "archived"].includes(s);
}

export async function updateSubmissionAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");
  const adminNote = formData.has("admin_note")
    ? String(formData.get("admin_note") ?? "") || null
    : undefined;

  if (!id) return { error: "ID가 없습니다." };
  if (!isValidStatus(status)) return { error: "상태 값이 올바르지 않습니다." };

  await updateSubmissionStatus(id, status, adminNote);
  revalidatePath("/admin/submissions");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteSubmissionAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) return;
  await deleteSubmission(id);
  revalidatePath("/admin/submissions");
  revalidatePath("/admin");
}
