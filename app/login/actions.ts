"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { authenticate } from "@/lib/users-db";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!username || !password) {
    return { error: "아이디와 비밀번호를 입력해 주세요." };
  }

  const user = await authenticate(username, password);
  if (!user) {
    return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  }

  const session = await getSession();
  session.user = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };
  await session.save();

  redirect(next || "/");
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/");
}
