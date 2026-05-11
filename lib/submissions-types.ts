// 클라이언트·서버 공용 타입과 라벨 — server-only 모듈에서 분리
// SubmissionRow 같은 클라이언트 컴포넌트가 안전하게 import 가능

export type SubmissionStatus = "new" | "reviewing" | "done" | "archived";
export type SubmissionCategory =
  | "photo"
  | "document"
  | "memoir"
  | "video"
  | "other";

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
  created_at: string;
  updated_at: string;
};
