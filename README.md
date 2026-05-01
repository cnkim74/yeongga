# 영가회 永嘉會 — 아카이브

오랜 인연으로 모인 회원들의 글·모임·사진을 갈무리하는, 매거진 형태의
작은 정적 웹 아카이브입니다.

- **Next.js 16** (App Router, RSC)
- **Tailwind CSS v4** (CSS-first config)
- **TypeScript**
- 콘텐츠는 `content/articles/<chapter>/*.md` 마크다운 파일

## 설계 원칙

- **노인 가독성 우선**
  - 본문 기본 21px, 줄간격 1.95
  - 본문 글자 크기 5단계 조절(우측 상단 단추, `localStorage` 저장)
  - 한글 단어 단위 줄바꿈(`word-break: keep-all`)
  - 분명한 포커스 링과 큰 클릭 타깃
- **본문 본명조 계열**
  - `Noto Serif KR → Nanum Myeongjo → Apple SD Gothic Neo` 폴백
  - UI 텍스트는 `Noto Sans KR`
- **매거진 페이지 구성**
  - 표지 (`/`) — 헤드라인 + 차례 + 장별 최신
  - 아카이브 (`/archive`) — 5개 장 한눈에 보기
  - 장 목록 (`/archive/[chapter]`)
  - 글 본문 (`/archive/[chapter]/[slug]`)
  - 사진 갤러리 자리 (`/gallery`)
  - 회 소개 (`/about`)

## 디렉터리

```
app/
  layout.tsx          ← 루트 레이아웃 + 글자 크기 인라인 초기화 스크립트
  page.tsx            ← 매거진 표지
  globals.css         ← Tailwind v4 + 본명조/색 팔레트/.prose-body
  archive/
    page.tsx
    [chapter]/page.tsx
    [chapter]/[slug]/page.tsx
  gallery/page.tsx
  about/page.tsx
  not-found.tsx
components/
  Header.tsx
  Footer.tsx
  ReadingSizeProvider.tsx   ← 5단계 클라이언트 컨텍스트 + 첫 페인트 스크립트
  ReadingSizeControl.tsx    ← 가가가가가 단추
lib/
  chapters.ts        ← 5개 장 메타데이터 (一/二/三/四/五)
  content.ts         ← 마크다운 읽기·정렬·HTML 변환 (gray-matter + remark)
content/
  README.md
  articles/
    yeon-gi/   moim/   geul/   saram/   natnal/
```

## 글 새로 올리기

`content/articles/<chapter>/<slug>.md` 한 파일을 만들면 그 장 목록과
본문 페이지에 자동으로 나타납니다. 프런트매터 형식은
[`content/README.md`](./content/README.md) 참고.

장 자체(이름·번호·설명)는 [`lib/chapters.ts`](./lib/chapters.ts)에서
편집합니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
```

빌드:

```bash
npm run build
npm start
```

> 본 사이트는 외부 의존이 마크다운 처리(remark 계열)와 Google Fonts 한
> 종류뿐이라, 정적 빌드 후 `out/` 또는 어떤 정적 호스팅에도 올릴 수
> 있습니다.

## 글자 크기 조절 동작

- 우측 상단 “가가가가가” 단추로 1~5단계 선택
- 선택 결과는 브라우저 `localStorage`(`yeongga.reading-level`)에 저장
- 다음 방문 시 첫 페인트 전에 인라인 스크립트가 즉시 적용 (깜빡임 없음)
- CSS 변수 `--reading-size`로 본문(`.prose-body`)에 적용

## 사진 갤러리 추가

`/gallery` 페이지는 현재 자리(placeholder)만 두었습니다. 사진 파일을
`public/gallery/` 아래에 두고 `app/gallery/page.tsx`에서 목록을
읽어들이도록 확장하면 됩니다.
