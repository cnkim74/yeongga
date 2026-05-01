"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveMemberAction, type MemberFormState } from "./actions";
import type { User } from "@/lib/users-db";

export function MemberForm({ user }: { user?: User }) {
  const [state, formAction, pending] = useActionState<
    MemberFormState,
    FormData
  >(saveMemberAction, {});
  const isEdit = !!user;
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // 방어막: state가 바뀔 때마다 DOM input.value도 강제로 동기화.
  // controlled input이 정상이면 중복이지만, 일부 모바일 브라우저에서
  // controlled value가 늦게 반영되는 경우를 막기 위함.
  useEffect(() => {
    if (avatarInputRef.current) {
      avatarInputRef.current.value = avatarUrl;
    }
  }, [avatarUrl]);

  async function handleFile(file: File) {
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("이미지 파일만 올릴 수 있습니다.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/member-avatar", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setUploadError(err.error ?? "업로드에 실패했습니다.");
        return;
      }
      const data = await res.json();
      setAvatarUrl(data.url);
    } catch (e) {
      setUploadError(`업로드 중 오류: ${String(e)}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(e) => {
        // 업로드 중엔 절대 제출 금지 (모바일에서 disabled 누락 대비)
        if (uploading) {
          e.preventDefault();
          alert("사진 업로드가 끝날 때까지 잠시만 기다려 주세요.");
          return;
        }
        // FormData 직전 한 번 더 강제 동기화
        if (avatarInputRef.current) {
          avatarInputRef.current.value = avatarUrl;
        }
      }}
      className="space-y-6 max-w-2xl pb-20"
    >
      {user && <input type="hidden" name="id" value={user.id} />}
      <input
        ref={avatarInputRef}
        type="hidden"
        name="avatar_url"
        defaultValue={avatarUrl}
      />

      <div>
        <Label>프로필 사진</Label>
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--color-notion-hover)] border border-[var(--color-notion-rule)] shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full grid place-items-center text-[var(--color-notion-mute)] text-xs">
                (없음)
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.currentTarget.files?.[0];
                e.currentTarget.value = "";
                if (f) handleFile(f);
              }}
              disabled={uploading}
              className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-[var(--color-notion-text)] file:text-white file:cursor-pointer disabled:opacity-50"
            />
            {uploading && (
              <div className="text-xs text-[var(--color-notion-accent)] mt-2">
                ⏳ 업로드 중…
              </div>
            )}
            {uploadError && (
              <div className="text-xs text-[#c4554d] mt-2">{uploadError}</div>
            )}
            <div className="text-xs text-[var(--color-notion-mute)] mt-2 leading-relaxed">
              jpg / png / webp / gif / heic 등 · 최대 12MB · 정사각형 권장.
              파일을 고르면 즉시 업로드됩니다.
            </div>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl("")}
                className="inline-flex items-center gap-2 mt-2 text-xs text-[#c4554d] hover:underline"
              >
                ✕ 사진 빼기
              </button>
            )}
          </div>
        </div>
      </div>

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

      {/* 모바일에서 항상 보이는 sticky 저장 바 */}
      <div className="sticky bottom-0 -mx-6 sm:mx-0 px-6 sm:px-0 pt-3 pb-4 sm:pt-2 sm:pb-0 bg-white border-t sm:border-t-0 border-[var(--color-notion-rule)] flex gap-2">
        <button
          type="submit"
          disabled={pending || uploading}
          className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] disabled:opacity-50 px-5 h-10 text-sm font-medium"
        >
          {pending ? "저장 중…" : uploading ? "업로드 끝나는 중…" : "저장"}
        </button>
        <a
          href="/admin/members"
          className="notion-icon-btn h-10 px-4 text-sm border border-[var(--color-notion-rule)]"
        >
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
