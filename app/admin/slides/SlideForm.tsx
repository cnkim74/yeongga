"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSlideAction } from "./actions";
import type { Slide } from "@/lib/slides-db";

export function SlideForm({ slide }: { slide?: Slide }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string>(slide?.image_path ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  /** 이번 세션에서 새로 업로드한 경우만 "업로드 완료" 메시지를 띄움 */
  const [justUploaded, setJustUploaded] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError(null);
    const fd = new FormData(e.currentTarget);
    // 안전: image_path 가 hidden 값으로 들어 있어도 state 값으로 덮어씌움
    fd.set("image_path", imagePath);

    startTransition(async () => {
      try {
        const result = await saveSlideAction({}, fd);
        if (result && "error" in result && result.error) {
          setSaveError(result.error);
          return;
        }
        // 성공 — 서버에서 redirect 가 발생했어야 하지만, 그러지 못한 경우 클라이언트에서 이동
        router.push("/admin/slides");
        router.refresh();
      } catch (err) {
        // NEXT_REDIRECT 는 정상 흐름 — 메시지 무시하고 이동
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("NEXT_REDIRECT")) {
          router.push("/admin/slides");
          return;
        }
        setSaveError(`저장 중 오류: ${msg}`);
      }
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setJustUploaded(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/slide", { method: "POST", body: fd });
      if (!res.ok) {
        // HTTP 4xx/5xx — JSON 본문이 아닐 수도 있음 (예: 404 HTML)
        setUploadError(`업로드 실패 (HTTP ${res.status}). 잠시 후 다시 시도해 주세요.`);
        return;
      }
      const json = await res.json();
      if (!json.ok) {
        setUploadError(json.error ?? "업로드에 실패했습니다.");
      } else {
        setImagePath(json.url);
        setUploadError(null);   // ← 성공 시 이전 에러 명시적 제거
        setJustUploaded(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadError(`업로드 중 오류: ${msg}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {slide && <input type="hidden" name="id" value={slide.id} />}
      {/* image_path 를 hidden 으로 전송 — 파일은 별도 API 로 업로드됨 */}
      <input type="hidden" name="image_path" value={imagePath} />

      {/* 이미지 */}
      <div>
        <Label>표지 이미지</Label>
        <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-start">
          <div className="aspect-video bg-[var(--color-notion-hover)] rounded-md overflow-hidden border border-[var(--color-notion-rule)]">
            {imagePath ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={imagePath} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-[var(--color-notion-mute)] text-xs">
                미리보기
              </div>
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={uploading}
              onChange={handleFileChange}
              className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-[var(--color-notion-text)] file:text-white file:cursor-pointer"
            />
            <div className="text-xs text-[var(--color-notion-mute)] mt-2 leading-relaxed">
              jpg / png / webp / gif · 최대 12MB · 권장 가로 2400px 이상, 16:9
              비율. {slide && "교체하지 않으려면 그대로 두세요."}
            </div>
            {uploading && (
              <div className="mt-2 text-xs text-[var(--color-notion-mute)]">
                업로드 중…
              </div>
            )}
            {/* 에러는 새 업로드 결과가 없는 경우(=현재 imagePath 가 비었거나 직전 시도가 실패) 에만 표시 */}
            {uploadError && !justUploaded && (
              <div className="mt-2 text-xs text-[#c4554d]">{uploadError}</div>
            )}
            {/* "업로드 완료" 메시지는 이번 세션에서 새로 업로드한 경우에만 표시 (편집 진입 시 잘못 표시되는 것 방지) */}
            {justUploaded && imagePath && !uploading && (
              <div className="mt-2 text-xs text-emerald-700">
                ✓ 업로드 완료 — 저장하면 반영됩니다
              </div>
            )}
          </div>
        </div>
      </div>

      <Field
        name="kicker"
        label="라벨 (작은 윗 글자)"
        defaultValue={slide?.kicker ?? ""}
        placeholder="예: 卷頭言 · 권두언"
      />

      <div>
        <Label>제목</Label>
        <textarea
          name="title"
          rows={2}
          required
          defaultValue={slide?.title ?? ""}
          placeholder="줄바꿈으로 두 줄까지 만들 수 있습니다"
          className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)] text-lg leading-snug"
        />
      </div>

      <div>
        <Label>설명 (한두 줄)</Label>
        <textarea
          name="excerpt"
          rows={3}
          defaultValue={slide?.excerpt ?? ""}
          className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)]"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          name="cta"
          label="버튼 글자"
          defaultValue={slide?.cta ?? ""}
          placeholder="예: 회의록 보기"
        />
        <Field
          name="href"
          label="버튼 링크"
          defaultValue={slide?.href ?? "/"}
          placeholder="/archive/yeongi/... 또는 https://..."
        />
      </div>

      <div className="text-xs text-[var(--color-notion-mute)] -mt-3 leading-relaxed">
        💡 버튼 링크는 사이트 내 경로(예: <code className="font-mono">/archive/yeongi/cheot-moim</code>)이거나
        외부 URL(예: <code className="font-mono">https://...</code>)을 입력하세요.
        존재하지 않는 경로를 입력하면 클릭 시 &quot;페이지 없음&quot;이 표시됩니다.
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="active"
          type="checkbox"
          defaultChecked={slide ? slide.active === 1 : true}
          className="h-4 w-4"
        />
        <span>활성 — 공개 사이트 메인에 노출</span>
      </label>

      {saveError && (
        <div className="text-sm text-[#c4554d] bg-[#ffe2dd] border border-[#f5c8c0] rounded-lg p-3">
          {saveError}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending || uploading || !imagePath}
          className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf] disabled:opacity-50 px-4 h-9"
        >
          {isPending ? "저장 중…" : "저장"}
        </button>
        <a href="/admin/slides" className="notion-icon-btn h-9">
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
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        name={name}
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="notion-input w-full border border-[var(--color-notion-rule)] focus:border-[var(--color-notion-accent)]"
      />
    </div>
  );
}
