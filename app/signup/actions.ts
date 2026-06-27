"use server";

import { redirect } from "next/navigation";
import { createUser } from "@/lib/users-db";

export type SignupState = { error?: string };

export async function signupAction(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!name) return { error: "이름을 입력해 주세요." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "올바른 이메일 주소를 입력해 주세요." };
  if (password.length < 6)
    return { error: "비밀번호는 6자 이상이어야 합니다." };
  if (password !== password2)
    return { error: "비밀번호가 일치하지 않습니다." };

  const r = await createUser({
    username: email, // 이메일을 로그인 아이디로 사용
    name,
    email,
    password,
    role: "member",
    status: "pending",
    joined_at: new Date().toISOString().slice(0, 10),
  });

  if (!r.ok) {
    return { error: "이미 가입(또는 신청)된 이메일입니다." };
  }

  redirect(`/login?registered=1&next=${encodeURIComponent(next)}`);
}
