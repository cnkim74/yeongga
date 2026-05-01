"use client";

import { useActionState } from "react";
import { saveMemberAction, type MemberFormState } from "./actions";
import type { User } from "@/lib/users-db";

export function MemberForm({ user }: { user?: User }) {
  const [state, formAction, pending] = useActionState<
    MemberFormState,
    FormData
  >(saveMemberAction, {});
  const isEdit = !!user;

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {user && <input type="hidden" name="id" value={user.id} />}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          name="name"
          label="이름 *"
          defaultValue={user?.name}
          required
        />
        <div>
          <Label>아이디 (로그인 ID) *</Label>
          <input
            name="username"
            type="text"
            required={!isEdit}
            defaultValue={user?.username}
            disabled={isEdit}
            className="notion-input w-full font-mono border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)] disabled:bg-[var(--color-notion-hover)] disabled:text-[var(--color-notion-mute)]"
          />
          {isEdit && (
            <div className="text-xs text-[var(--color-notion-mute)] mt-1">
              아이디는 변경할 수 없습니다.
            </div>
          )}
        </div>
      </div>

      <div>
        <Label>이메일 (Google 로그인 매칭에 사용)</Label>
        <input
          name="email"
          type="email"
          defaultValue={user?.email ?? ""}
          placeholder="user@gmail.com"
          className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)]"
        />
        <div className="text-xs text-[var(--color-notion-mute)] mt-1">
          이 이메일과 같은 Google 계정으로 첫 로그인하면 자동으로 이 회원에 연결됩니다.
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>권한 *</Label>
          <select
            name="role"
            defaultValue={user?.role ?? "member"}
            className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)]"
          >
            <option value="member">회원 — 회원 전용 글 보기</option>
            <option value="admin">관리자 — 관리실 출입 가능</option>
          </select>
        </div>
        <Field
          name="joined_at"
          label="가입일"
          type="date"
          defaultValue={user?.joined_at ?? ""}
        />
      </div>

      <div>
        <Label>
          {isEdit
            ? "비밀번호 변경 (비워 두면 유지)"
            : "초기 비밀번호 (Google 전용 계정이면 비워둘 수 있음)"}
        </Label>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)]"
        />
        {!isEdit && (
          <div className="text-xs text-[var(--color-notion-mute)] mt-1">
            비워두면 무작위 값이 들어가며, 이 계정은 Google 로그인으로만 들어올 수 있습니다.
          </div>
        )}
      </div>

      <div>
        <Label>메모</Label>
        <textarea
          name="note"
          rows={3}
          defaultValue={user?.note ?? ""}
          className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)]"
        />
      </div>

      {state.error && (
        <div className="text-sm text-[#c4554d] bg-[#ffe2dd] border border-[#f5c8c0] rounded-lg p-3">
          {state.error}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] disabled:opacity-50 px-4 h-9"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        <a href="/admin/members" className="notion-icon-btn h-9">
          취소
        </a>
      </div>
    </form>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs text-[var(--color-notion-mute)] font-medium mb-2 uppercase tracking-wider">
      {children}
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)]"
      />
    </div>
  );
}
