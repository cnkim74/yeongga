"use client";

import { useState, useTransition } from "react";

const CATEGORIES = [
  { value: "photo", label: "사진" },
  { value: "document", label: "문서·기록물" },
  { value: "memoir", label: "회고·수필" },
  { value: "video", label: "영상" },
  { value: "other", label: "기타" },
] as const;

export function ContributeForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { upload } = await import("@vercel/blob/client");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await upload(`submissions/${Date.now()}-${safeName}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload/submission",
      });
      setFileUrl(blob.url);
      setFileName(file.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`파일 업로드 실패: ${msg}`);
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      category: String(fd.get("category") ?? "other"),
      message: String(fd.get("message") ?? ""),
      website: String(fd.get("website") ?? ""), // honeypot
      file_url: fileUrl,
      file_name: fileName,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!json.ok) {
          setError(json.error ?? "접수에 실패했습니다.");
          return;
        }
        setSubmitted(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`접수 중 오류: ${msg}`);
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-3xl border border-[var(--color-rule)] bg-white p-10 sm:p-14 text-center">
        <div className="text-5xl mb-4 select-none">✉️</div>
        <h2 className="display-md text-2xl sm:text-3xl mb-3">
          자료가 접수되었습니다
        </h2>
        <p className="text-[var(--color-ink-soft)] leading-relaxed mb-6">
          보내 주셔서 감사합니다. 편집실에서 확인한 뒤,
          필요에 따라 회신을 드리겠습니다.
          <br />
          한 장의 사진, 한 줄의 글이 다음 세대로 이어집니다.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setFileUrl("");
            setFileName("");
          }}
          className="btn-pill ghost"
        >
          한 번 더 보내기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* honeypot — 봇만 채움, 사람은 보이지 않음 */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Field label="이름" required>
        <input
          name="name"
          type="text"
          required
          maxLength={50}
          className="form-input"
          placeholder="홍길동"
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="이메일" hint="회신 받으실 주소 (선택)">
          <input
            name="email"
            type="email"
            maxLength={200}
            className="form-input"
            placeholder="name@example.com"
          />
        </Field>
        <Field label="연락처" hint="선택">
          <input
            name="phone"
            type="tel"
            maxLength={30}
            className="form-input"
            placeholder="010-0000-0000"
          />
        </Field>
      </div>

      <Field label="자료 종류" required>
        <select name="category" defaultValue="photo" className="form-input">
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="설명" required hint="찍은 해·장소·함께한 분 등을 함께 적어 주시면 정리에 큰 도움이 됩니다.">
        <textarea
          name="message"
          required
          rows={8}
          maxLength={5000}
          className="form-input resize-y"
          placeholder="자료에 대한 설명을 자유롭게 적어 주세요."
        />
      </Field>

      <Field label="파일 첨부" hint="이미지 또는 PDF, 최대 30MB (선택)">
        {fileUrl ? (
          <div className="flex items-center gap-3 py-2">
            <span className="inline-flex items-center gap-2 text-sm text-emerald-700 font-medium">
              ✓ 업로드 완료
            </span>
            <span className="text-sm text-[var(--color-ink-mute)] truncate flex-1">
              {fileName}
            </span>
            <button
              type="button"
              onClick={() => {
                setFileUrl("");
                setFileName("");
              }}
              className="text-xs text-red-600 hover:underline shrink-0"
            >
              제거
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept="image/*,application/pdf"
            disabled={uploading}
            onChange={handleFile}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-ink)] file:text-white file:px-3 file:py-2 file:cursor-pointer disabled:opacity-50"
          />
        )}
        {uploading && (
          <p className="mt-1 text-xs text-[var(--color-ink-mute)]">
            업로드 중…
          </p>
        )}
      </Field>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isPending || uploading}
          className="btn-pill disabled:opacity-50"
        >
          {isPending ? "접수 중…" : "자료 보내기"} <span aria-hidden="true">→</span>
        </button>
        <p className="mt-3 text-xs text-[var(--color-ink-mute)]">
          제출 시 영가회의 자료 보관·편집 목적으로 활용되는 데 동의하는 것으로 봅니다.
          개인정보는 회신 용도로만 사용되며 외부에 공개되지 않습니다.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && (
        <p className="mt-1.5 text-xs text-[var(--color-ink-mute)]">{hint}</p>
      )}
    </div>
  );
}
