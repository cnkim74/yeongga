"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createEbook, updateEbook, deleteEbook } from "@/lib/ebooks-db";

function refreshPaths() {
  revalidatePath("/admin/ebooks");
  revalidatePath("/ebooks");
}

export async function createEbookAction(formData: FormData) {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const pdf_url = String(formData.get("pdf_url") ?? "").trim();
  const cover_url = String(formData.get("cover_url") ?? "").trim() || null;
  const visibility =
    formData.get("visibility") === "members-only" ? "members-only" : "public";
  const position = Number(formData.get("position") ?? 0) || 0;

  if (!title) return { error: "제목을 입력해 주세요." };
  if (!pdf_url) return { error: "PDF 파일을 업로드해 주세요." };

  await createEbook({ title, description, pdf_url, cover_url, visibility, position });
  refreshPaths();
  return { ok: true };
}

export async function updateEbookAction(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!id) return { error: "ID가 없습니다." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const pdf_url = String(formData.get("pdf_url") ?? "").trim();
  const cover_url = String(formData.get("cover_url") ?? "").trim() || null;
  const visibility =
    formData.get("visibility") === "members-only" ? "members-only" : "public";
  const position = Number(formData.get("position") ?? 0) || 0;

  if (!title) return { error: "제목을 입력해 주세요." };
  if (!pdf_url) return { error: "PDF 파일을 업로드해 주세요." };

  await updateEbook(id, { title, description, pdf_url, cover_url, visibility, position });
  refreshPaths();
  revalidatePath(`/ebooks/${id}`);
  return { ok: true };
}

export async function deleteEbookAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  await deleteEbook(id);
  refreshPaths();
}
