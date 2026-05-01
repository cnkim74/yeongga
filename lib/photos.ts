export type PhotoStatus = "공개" | "검수중" | "보류" | "비공개";
export type PhotoCategory =
  | "정기모임"
  | "야유회"
  | "총회"
  | "경조사"
  | "회보 자료"
  | "기타";

export type PhotoRow = {
  id: string;
  name: string;
  category: PhotoCategory;
  shotDate: string; // YYYY-MM-DD
  place: string;
  uploader: string;
  tags: string[];
  status: PhotoStatus;
  registered: string; // YYYY-MM-DD
};

export const photos: PhotoRow[] = [
  {
    id: "p001",
    name: "두물머리 단체사진",
    category: "정기모임",
    shotDate: "2025-10-18",
    place: "양평 두물머리",
    uploader: "박정자",
    tags: ["가을모임", "단체사진"],
    status: "공개",
    registered: "2025-10-21",
  },
  {
    id: "p002",
    name: "두물머리 차 마시는 자리",
    category: "정기모임",
    shotDate: "2025-10-18",
    place: "양평 두물머리",
    uploader: "박정자",
    tags: ["가을모임", "다과"],
    status: "공개",
    registered: "2025-10-21",
  },
  {
    id: "p003",
    name: "회장 인사 장면",
    category: "정기모임",
    shotDate: "2025-10-18",
    place: "양평 두물머리",
    uploader: "박정자",
    tags: ["가을모임", "인사말"],
    status: "검수중",
    registered: "2025-10-21",
  },
  {
    id: "p004",
    name: "이숙자 회원 텃밭",
    category: "회보 자료",
    shotDate: "2025-11-02",
    place: "이숙자 회원 자택",
    uploader: "이숙자",
    tags: ["글-텃밭일지", "회원사진"],
    status: "공개",
    registered: "2025-11-04",
  },
  {
    id: "p005",
    name: "정인규 회원 서재",
    category: "회보 자료",
    shotDate: "2025-12-15",
    place: "서울 정인규 회원 자택",
    uploader: "정인규",
    tags: ["글-편지", "회원사진"],
    status: "보류",
    registered: "2025-12-16",
  },
  {
    id: "p006",
    name: "1998년 첫 모임 흑백사진",
    category: "회보 자료",
    shotDate: "1998-10-12",
    place: "종로 식당",
    uploader: "김영석",
    tags: ["연혁", "초창기"],
    status: "공개",
    registered: "2026-01-12",
  },
  {
    id: "p007",
    name: "회장 댁 인터뷰 장면 1",
    category: "회보 자료",
    shotDate: "2026-02-08",
    place: "서울 김영석 회장 자택",
    uploader: "편집실",
    tags: ["인터뷰", "회원사진"],
    status: "공개",
    registered: "2026-02-09",
  },
  {
    id: "p008",
    name: "회장 댁 인터뷰 장면 2",
    category: "회보 자료",
    shotDate: "2026-02-08",
    place: "서울 김영석 회장 자택",
    uploader: "편집실",
    tags: ["인터뷰", "회원사진"],
    status: "검수중",
    registered: "2026-02-09",
  },
  {
    id: "p009",
    name: "옛 회보 표지 모음",
    category: "회보 자료",
    shotDate: "2026-03-02",
    place: "편집실",
    uploader: "편집실",
    tags: ["연혁", "회보"],
    status: "공개",
    registered: "2026-03-03",
  },
  {
    id: "p010",
    name: "고 박○○ 회원 추모 사진",
    category: "경조사",
    shotDate: "2024-09-21",
    place: "수원",
    uploader: "회장단",
    tags: ["경조사"],
    status: "비공개",
    registered: "2024-09-25",
  },
  {
    id: "p011",
    name: "2024년 봄 야유회 단체",
    category: "야유회",
    shotDate: "2024-04-20",
    place: "남한산성",
    uploader: "박정자",
    tags: ["야유회", "단체사진"],
    status: "공개",
    registered: "2024-04-22",
  },
  {
    id: "p012",
    name: "2026년 정기 총회 안건지",
    category: "총회",
    shotDate: "2026-04-10",
    place: "서울 회의실",
    uploader: "서기",
    tags: ["총회", "문서"],
    status: "검수중",
    registered: "2026-04-11",
  },
];

const CATEGORY_TAG: Record<PhotoCategory, string> = {
  정기모임: "tag-blue",
  야유회: "tag-green",
  총회: "tag-purple",
  경조사: "tag-gray",
  "회보 자료": "tag-orange",
  기타: "tag-gray",
};

const STATUS_TAG: Record<PhotoStatus, string> = {
  공개: "tag-green",
  검수중: "tag-yellow",
  보류: "tag-orange",
  비공개: "tag-red",
};

export function categoryTagClass(c: PhotoCategory) {
  return CATEGORY_TAG[c];
}

export function statusTagClass(s: PhotoStatus) {
  return STATUS_TAG[s];
}
