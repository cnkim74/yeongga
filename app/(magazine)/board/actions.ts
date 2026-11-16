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

/** 자료 날짜 — YYYY, YYYY-MM, YYYY-MM-DD 만 받는다. 비우면 제목의 연도로 정렬. */
function parseDocDate(v: FormDataEntryValue | null): string | null {
  const t = String(v ?? "").trim().replace(/[./]/g, "-");
  const m = t.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return [y, mo?.padStart(2, "0"), d?.padStart(2, "0")].filter(Boolean).join("-");
}

export async function createPostAction(formData: FormData) {
  const user = await requireMember("/board/new");

  const title = String(formData.get("title") ?? "").trim().normalize("NFC");
  const body = String(formData.get("body") ?? "").trim();
  const attachments = parseAttachments(formData.get("attachments"));
  // 공지사항은 없앴다 — 모든 글은 자료실. 자료 날짜로 정렬한다.
  const kind = "material" as const;
  const pinned = false;
  const doc_date = parseDocDate(formData.get("doc_date"));

  if (!title) return { error: "제목을 입력해 주세요." };

  const id = await createPost({
    title,
    body,
    author_id: user.id,
    author_name: user.name || user.username,
    kind,
    pinned,
    doc_date,
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

  const title = String(formData.get("title") ?? "").trim().normalize("NFC");
  const body = String(formData.get("body") ?? "").trim();
  const attachments = parseAttachments(formData.get("attachments"));
  const kind = "material" as const;
  const pinned = false;
  const doc_date = parseDocDate(formData.get("doc_date"));

  if (!title) return { error: "제목을 입력해 주세요." };

  // 제거된 첨부의 실제 파일 정리 (스토리지)
  const newUrls = new Set(attachments.map((a) => a.file_url));
  for (const old of post.attachments) {
    if (!newUrls.has(old.file_url)) await deleteUploadIfLocal(old.file_url);
  }

  await updatePost(id, { kind, title, body, pinned, doc_date, attachments });

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
