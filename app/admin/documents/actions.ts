"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createDocument,
  updateDocument,
  deleteDocument,
  getDocument,
} from "@/lib/documents-db";
import { deleteUploadIfLocal } from "@/lib/uploads";

function refreshPaths() {
  revalidatePath("/admin/documents");
  revalidatePath("/documents");
  revalidateTag("documents", "max");
}

function readForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const file_url = String(formData.get("file_url") ?? "").trim();
  const file_name = String(formData.get("file_name") ?? "").trim();
  const file_size = Number(formData.get("file_size") ?? 0) || 0;
  const mime = String(formData.get("mime") ?? "").trim() || null;
  const position = Number(formData.get("position") ?? 0) || 0;
  return { title, description, category, file_url, file_name, file_size, mime, position };
}

export async function createDocumentAction(formData: FormData) {
  await requireAdmin();
  const data = readForm(formData);

  if (!data.title) return { error: "제목을 입력해 주세요." };
  if (!data.file_url) return { error: "파일을 업로드해 주세요." };

  await createDocument(data);
  refreshPaths();
  return { ok: true };
}

export async function updateDocumentAction(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!id) return { error: "ID가 없습니다." };

  const data = readForm(formData);
  if (!data.title) return { error: "제목을 입력해 주세요." };
  if (!data.file_url) return { error: "파일을 업로드해 주세요." };

  // 파일을 새로 올렸으면 기존 파일 정리
  const prev = await getDocument(id);
  if (prev && prev.file_url !== data.file_url) {
    await deleteUploadIfLocal(prev.file_url);
  }

  await updateDocument(id, data);
  refreshPaths();
  return { ok: true };
}

export async function deleteDocumentAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) return;
  const doc = await getDocument(id);
  await deleteDocument(id);
  if (doc) await deleteUploadIfLocal(doc.file_url);
  refreshPaths();
}
