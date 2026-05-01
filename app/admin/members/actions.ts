"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createUser, deleteUser, getUser, updateUser } from "@/lib/users-db";
import { deleteUploadIfLocal } from "@/lib/uploads";

export type MemberFormState = { error?: string };

function refresh() {
  revalidatePath("/admin/members");
}

export async function saveMemberAction(
  _prev: MemberFormState,
  formData: FormData
): Promise<MemberFormState> {
  const me = await requireAdmin();

  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const username = String(formData.get("username") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const role = (formData.get("role") === "admin" ? "admin" : "member") as
    | "admin"
    | "member";
  const joined_at = String(formData.get("joined_at") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "");

  // 프로필 사진 — 폼은 URL만 들고 옴 (실제 업로드는 /api/upload/member-avatar)
  const avatarUrl = String(formData.get("avatar_url") ?? "") || null;
  console.log("[member save]", {
    id,
    name,
    avatarUrlLen: avatarUrl?.length ?? 0,
    avatarUrlPrefix: avatarUrl?.slice(0, 60) ?? null,
  });
  if (id) {
    const existing = await getUser(id);
    if (existing?.avatar_url && existing.avatar_url !== avatarUrl) {
      await deleteUploadIfLocal(existing.avatar_url);
    }
  }

  if (!name) return { error: "이름은 비워둘 수 없습니다." };
  if (!id && !username) return { error: "아이디는 비워둘 수 없습니다." };

  // 본인이 자기 권한을 회원으로 떨어뜨리는 것 방지
  if (id && id === me.id && role !== "admin") {
    return {
      error: "본인의 관리자 권한은 직접 회수할 수 없습니다.",
    };
  }

  if (id) {
    const r = await updateUser(id, {
      name,
      email,
      avatar_url: avatarUrl,
      role,
      joined_at,
      note,
      newPassword: password || null,
    });
    if (!r.ok) return { error: r.error };
  } else {
    const r = await createUser({
      username,
      name,
      email,
      avatar_url: avatarUrl,
      password: password || null,
      role,
      joined_at,
      note,
    });
    if (!r.ok) return { error: r.error };
  }

  refresh();
  redirect("/admin/members");
}

export async function deleteMemberAction(formData: FormData) {
  const me = await requireAdmin();
  const id = Number(formData.get("id"));
  if (id === me.id) {
    // 본인 삭제는 막음 — 안전장치
    return;
  }
  const existing = await getUser(id);
  if (existing?.avatar_url) await deleteUploadIfLocal(existing.avatar_url);
  await deleteUser(id);
  refresh();
}
