"use client";

import { useState, useTransition } from "react";

const CATEGORIES = [
  { value: "photo", label: "사진" },
  { value: "document", label: "문서·기록물" },
  { value: "memoir", label: "회고·수필" },
  { value: "video", label: "영상" },
  { value: "other", label: "기타" },
] as const;

const ATTRIBUTIONS = [
  { value: "name", label: "실명 표기 — 예: 김해길 회원 제공" },
  { value: "anon", label: "익명 — 출처 미표기" },
  { value: "anon_era", label: "익명 + 연대만 — 예: 1대 회원 제공" },
] as const;

export function ContributeForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [othersConsent, setOthersConsent] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { uploadToR2 } = await import("@/lib/r2-client");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await uploadToR2(safeName, file, {
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
    if (!consent) {
      setError("자료 사용 동의에 체크해 주세요.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      category: String(fd.get("category") ?? "other"),
      attribution_mode: String(fd.get("attribution_mode") ?? "name"),
      message: String(fd.get("message") ?? ""),
      website: String(fd.get("website") ?? ""), // honeypot
      file_url: fileUrl,
      file_name: fileName,
      others_consent: othersConsent,
      consent,
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
            setConsent(false);
            setOthersConsent(false);
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
      {/* honeypot — 봇만 채움 */}
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

      <Field
        label="출처 표기 방식"
        required
        hint="아카이브·갤러리에 자료가 노출될 때 어떻게 표기할지 선택해 주세요."
      >
        <select name="attribution_mode" defaultValue="name" className="form-input">
          {ATTRIBUTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </Field>

      {/* ─── 저작권 동의 박스 ─────────────────────── */}
      <ConsentBox
        consent={consent}
        setConsent={setConsent}
        othersConsent={othersConsent}
        setOthersConsent={setOthersConsent}
      />

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending || uploading || !consent}
          className="btn-pill disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? "접수 중…" : "자료 보내기"} <span aria-hidden="true">→</span>
        </button>
        {!consent && (
          <p className="mt-3 text-xs text-[var(--color-ink-mute)]">
            위 자료 사용 동의에 체크하시면 버튼이 활성화됩니다.
          </p>
        )}
      </div>
    </form>
  );
}

function ConsentBox({
  consent,
  setConsent,
  othersConsent,
  setOthersConsent,
}: {
  consent: boolean;
  setConsent: (v: boolean) => void;
  othersConsent: boolean;
  setOthersConsent: (v: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] overflow-hidden">
      <div className="px-6 sm:px-8 py-5 border-b border-[var(--color-rule)]">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h3 className="display-md text-lg text-[var(--color-ink)]">
            자료 사용에 관한 안내
          </h3>
          <span className="font-serif text-xs text-[var(--color-ink-mute)] tracking-widest">
            使用에 관한 案內
          </span>
        </div>
      </div>

      <div className="px-6 sm:px-8 py-6 text-sm text-[var(--color-ink-soft)] leading-relaxed space-y-5 max-h-[400px] overflow-auto">
        <p>
          영가회는 회원께서 보내 주신 사진·문서·회고·영상을 회의 발자취로 갈무리합니다.
          보내시기 전에 다음 내용을 한 번만 살펴 봐 주시면 감사하겠습니다.
        </p>

        <ConsentItem n="1" title="저작권은 보내신 분께 그대로 있습니다">
          이 자료의 저작권은 <b>보내 주신 회원께</b> 있으며, 영가회는 그 권리를
          가져가지 않습니다. 보내신 뒤에도 같은 자료를 다른 곳에 자유롭게 쓰실 수 있습니다.
        </ConsentItem>

        <ConsentItem n="2" title="영가회는 자료를 무료로 사용할 수 있도록 허락해 주십니다">
          영가회는 다음과 같은 <b>비영리 회 운영 목적</b>으로 이 자료를 사용합니다.
          <ul className="mt-2 ml-5 list-disc space-y-1 marker:text-[var(--color-ink-mute)]">
            <li>영가회 웹 아카이브 (사이트·갤러리·글 페이지)</li>
            <li>영가회 회보·책자·소식지</li>
            <li>영가회 행사·전시·영상물 (40년사·기념지 포함)</li>
            <li>회 내부 자료의 정리·복제·편집·배포</li>
          </ul>
        </ConsentItem>

        <ConsentItem n="3" title="영구적이고 비독점적입니다">
          영가회의 사용 권리는 <b>영구적</b>입니다. 그러나 <b>비독점</b>이라,
          보내신 분께서 같은 자료를 다른 어느 자리에 쓰시는 데에 영가회가 어떤 제한도 두지 않습니다.
        </ConsentItem>

        <ConsentItem n="4" title="다른 분이 함께 담긴 자료">
          사진 등에 본인 외 다른 분이 함께 담겨 있는 경우, 가능한 범위에서 그분들의 동의를
          미리 확인해 주시면 좋습니다. 추후 그분들의 요청이 있을 경우 영가회는 해당 자료를
          갈무리에서 즉시 빼겠습니다.
        </ConsentItem>

        <ConsentItem n="5" title="출처 표기">
          영가회는 자료의 출처(성함·연대·관계)를 가능한 범위에서 표기합니다.
          <b>익명</b> 또는 다른 표기를 원하실 경우 위의 &quot;출처 표기 방식&quot; 항목에서 선택해 주세요.
        </ConsentItem>

        <ConsentItem n="6" title="철회·삭제 요청">
          나중에 사용을 멈추기 원하시면 편집실로 알려 주십시오. 영가회 아카이브에서 해당 자료를
          <b> 빠르게 삭제</b>해 드립니다.
        </ConsentItem>

        <ConsentItem n="7" title="개인정보">
          폼에 적어 주신 이메일·연락처는 <b>회신 용도로만</b> 사용되며 외부에 공개되지 않습니다.
        </ConsentItem>
      </div>

      <div className="px-6 sm:px-8 py-5 border-t border-[var(--color-rule)] bg-[var(--color-bg-soft)] space-y-3">
        {/* 다른 분 동의 (선택) */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={othersConsent}
            onChange={(e) => setOthersConsent(e.target.checked)}
            className="mt-1 w-4 h-4 accent-[var(--color-ink)] shrink-0"
          />
          <span className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            자료에 본인 외 다른 분이 함께 담겨 있다면, 그분들의 동의를 확인했습니다.
            <span className="text-[var(--color-ink-mute)]"> (해당 없으면 비워 두셔도 됩니다)</span>
          </span>
        </label>

        {/* 자료 사용 동의 (필수) */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 w-4 h-4 accent-[var(--color-accent)] shrink-0"
            required
          />
          <span className="text-sm text-[var(--color-ink)] leading-relaxed">
            <b>위 내용을 읽고 자료 사용에 동의합니다</b>
            <span className="text-red-500 ml-1">*</span>
            <span className="text-[var(--color-ink-mute)] block text-xs mt-0.5">
              필수 — 동의해야 &quot;자료 보내기&quot; 버튼이 활성화됩니다.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}

function ConsentItem({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="font-serif text-[var(--color-ink-mute)] text-sm font-medium tabular-nums">
          {n}.
        </span>
        <h4 className="display-md text-base text-[var(--color-ink)] leading-snug">
          {title}
        </h4>
      </div>
      <div className="ml-5 text-[14px] leading-relaxed">{children}</div>
    </div>
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
