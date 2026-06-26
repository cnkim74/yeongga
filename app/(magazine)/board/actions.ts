"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, requireMember } from "@/lib/auth";
import {
  createPost,
  updatePost,
  deletePost,
  getPost,
  setPinned,
  type AttachmentInput,
} from "@/lib/board-db";
import { deleteUploadIfLocal } from "@/lib/uploads";

function parseAttachments(raw: FormDataEntryValue | null): AttachmentInput[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(String(raw));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((a) => a && typeof a.file_url === "string" && typeof a.file_name === "string")
      .map((a) => ({
        file_url: String(a.file_url),
        file_name: String(a.file_name),
        file_size: Number(a.file_size ?? 0) || 0,
        mime: a.mime ? String(a.mime) : null,
      }));
  } catch {
    return [];
  }
}

export async function createPostAction(formData: FormData) {
  const user = await requireMember("/board/new");

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const attachments = parseAttachments(formData.get("attachments"));
  // 공지 지정은 관리자만
  const pinned = user.role === "admin" && formData.get("pinned") === "on";

  if (!title) return { error: "제목을 입력해 주세요." };

  const id = await createPost({
    title,
    body,
    author_id: user.id,
    author_name: user.name || user.username,
    pinned,
    attachments,
  });

  revalidatePath("/board");
  redirect(`/board/${id}`);
}

export async function updatePostAction(formData: FormData) {
  const user = await requireMember("/board");

  const id = Number(formData.get("id"));
  if (!id) return { error: "ID가 없습니다." };

  const post = await getPost(id);
  if (!post) return { error: "글을 찾을 수 없습니다." };
  const isOwner = post.author_id != null && post.author_id === user.id;
  if (!isOwner && user.role !== "admin") {
    return { error: "수정 권한이 없습니다." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const attachments = parseAttachments(formData.get("attachments"));
  const pinned =
    user.role === "admin" ? formData.get("pinned") === "on" : post.pinned;

  if (!title) return { error: "제목을 입력해 주세요." };

  // 제거된 첨부의 실제 파일 정리 (스토리지)
  const newUrls = new Set(attachments.map((a) => a.file_url));
  for (const old of post.attachments) {
    if (!newUrls.has(old.file_url)) await deleteUploadIfLocal(old.file_url);
  }

  await updatePost(id, { title, body, pinned, attachments });

  revalidatePath("/board");
  revalidatePath(`/board/${id}`);
  redirect(`/board/${id}`);
}

export async function deletePostAction(formData: FormData) {
  const user = await requireMember("/board");
  const id = Number(formData.get("id"));
  if (!id) return;

  const post = await getPost(id);
  if (!post) return;
  const isOwner = post.author_id != null && post.author_id === user.id;
  if (!isOwner && user.role !== "admin") return;

  const urls = await deletePost(id);
  for (const url of urls) await deleteUploadIfLocal(url);

  revalidatePath("/board");
  redirect("/board");
}

export async function togglePinAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return;
  const id = Number(formData.get("id"));
  const pinned = formData.get("pinned") === "true";
  if (!id) return;
  await setPinned(id, pinned);
  revalidatePath("/board");
  revalidatePath(`/board/${id}`);
}
