// 클라이언트·서버 공용 타입과 라벨 — server-only 모듈에서 분리
// SubmissionRow 같은 클라이언트 컴포넌트가 안전하게 import 가능

export type SubmissionStatus = "new" | "reviewing" | "done" | "archived";
export type SubmissionCategory =
  | "photo"
  | "document"
  | "memoir"
  | "video"
  | "other";

/** 출처 표기 방식 */
export type AttributionMode = "name" | "anon" | "anon_era";

export const CATEGORY_LABELS: Record<SubmissionCategory, string> = {
  photo: "사진",
  document: "문서·기록물",
  memoir: "회고·수필",
  video: "영상",
  other: "기타",
};

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  new: "신규",
  reviewing: "검토 중",
  done: "완료",
  archived: "보관",
};

export const ATTRIBUTION_LABELS: Record<AttributionMode, string> = {
  name: "실명 표기 (예: 김해길 회원 제공)",
  anon: "익명 (출처 미표기)",
  anon_era: "익명 + 연대만 (예: 1대 회원 제공)",
};

export type Submission = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  category: SubmissionCategory;
  message: string;
  file_url: string | null;
  file_name: string | null;
  status: SubmissionStatus;
  ip_hash: string | null;
  user_agent: string | null;
  admin_note: string | null;
  /** 저작권 동의 시각 (ISO) */
  consent_at: string | null;
  /** 출처 표기 방식 */
  attribution_mode: AttributionMode;
  /** 함께 담긴 분의 동의 확인 여부 */
  others_consent: boolean;
  created_at: string;
  updated_at: string;
};
