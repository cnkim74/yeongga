// 클라이언트 전용 — 서버에서 presigned PUT URL을 받아 R2에 직접 업로드.
// @vercel/blob/client 의 upload() 와 유사한 인터페이스로 호출처 변경을 최소화.

export interface ClientUploadOptions {
  handleUploadUrl: string;
  contentType?: string;
  onUploadProgress?: (state: { loaded: number; total: number; percentage: number }) => void;
}

export interface ClientUploadResult {
  url: string;
  bytes: number;
}

interface PresignResponse {
  ok: boolean;
  uploadUrl?: string;
  publicUrl?: string;
  key?: string;
  contentType?: string;
  error?: string;
}

export async function uploadToR2(
  filename: string,
  file: File,
  opts: ClientUploadOptions
): Promise<ClientUploadResult> {
  const contentType = opts.contentType ?? file.type ?? "application/octet-stream";

  // 1) 서버에 presigned PUT URL 요청
  const presignRes = await fetch(opts.handleUploadUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      mode: "presign",
      filename,
      contentType,
      size: file.size,
    }),
  });
  let presign: PresignResponse;
  try {
    presign = (await presignRes.json()) as PresignResponse;
  } catch {
    throw new Error(`업로드 토큰 발급 실패 (HTTP ${presignRes.status})`);
  }
  if (!presignRes.ok || !presign.ok || !presign.uploadUrl || !presign.publicUrl) {
    throw new Error(presign.error ?? `업로드 토큰 발급 실패 (HTTP ${presignRes.status})`);
  }

  // 2) presigned URL로 PUT — XHR 사용해 진행률 콜백 지원
  const uploadUrl = presign.uploadUrl;
  const publicUrl = presign.publicUrl;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    if (opts.onUploadProgress) {
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        opts.onUploadProgress!({
          loaded: e.loaded,
          total: e.total,
          percentage: (e.loaded / e.total) * 100,
        });
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`R2 업로드 실패 (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("R2 업로드 네트워크 오류"));
    xhr.send(file);
  });

  return { url: publicUrl, bytes: file.size };
}
