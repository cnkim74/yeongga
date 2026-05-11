"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface EbookReaderProps {
  pdfUrl: string;
  title: string;
  backHref?: string;
}

/**
 * 두 페이지 펼침 방식 e-Book 뷰어
 *
 * - 데스크톱 (≥768px): 좌우 2페이지 나란히 (책 펼침 형태)
 * - 모바일 (<768px): 1페이지 단독
 * - 스프레드 단위로 이동 (← →, |◀ ▶|)
 * - 키보드: 좌/우 화살표, Home/End
 */
export function EbookReader({ pdfUrl, title, backHref }: EbookReaderProps) {
  const [numPages, setNumPages] = useState(0);
  const [spread, setSpread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageWidth, setPageWidth] = useState(360);
  const [isMobile, setIsMobile] = useState(false);
  const [leftLoaded, setLeftLoaded] = useState(false);
  const [rightLoaded, setRightLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  /* ── 크기 감지 ── */
  useEffect(() => {
    function updateSize() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      const cw = containerRef.current?.clientWidth ?? window.innerWidth;
      if (mobile) {
        setPageWidth(Math.min(cw - 32, 480));
      } else {
        // 좌우 화살표 영역 (80px) + 여백 (80px) + 중앙 바인딩 (12px)
        setPageWidth(Math.min(Math.floor((cw - 172) / 2), 520));
      }
    }
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  /* ── 스프레드 계산 ──
   * spread 0 → 표지 (오른쪽에 1페이지만)
   * spread 1 → 2, 3
   * spread 2 → 4, 5
   * spread n → (n*2), (n*2+1)
   */
  const totalSpreads = numPages <= 1 ? 1 : Math.ceil((numPages - 1) / 2) + 1;

  function spreadPages(s: number): [number | null, number | null] {
    if (s === 0) return [null, 1];
    const l = s * 2;
    const r = s * 2 + 1;
    return [l <= numPages ? l : null, r <= numPages ? r : null];
  }

  const [leftPage, rightPage] = spreadPages(spread);

  /* 현재 표시 중인 페이지 번호 요약 */
  const pageLabel = (() => {
    const pages = [leftPage, rightPage].filter(Boolean) as number[];
    if (pages.length === 0) return "";
    if (pages.length === 1) return `${pages[0]} / ${numPages}`;
    return `${pages[0]}–${pages[1]} / ${numPages}`;
  })();

  /* ── 네비게이션 ── */
  const atFirst = spread === 0;
  const atLast = spread >= totalSpreads - 1;

  function goFirst() { setSpread(0); resetPageLoading(); }
  function goPrev() { if (!atFirst) { setSpread((s) => s - 1); resetPageLoading(); } }
  function goNext() { if (!atLast) { setSpread((s) => s + 1); resetPageLoading(); } }
  function goLast() { setSpread(totalSpreads - 1); resetPageLoading(); }

  function resetPageLoading() {
    setLeftLoaded(false);
    setRightLoaded(false);
  }

  /* ── 키보드 ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft" || e.key === "PageUp") goPrev();
      if (e.key === "ArrowRight" || e.key === "PageDown") goNext();
      if (e.key === "Home") goFirst();
      if (e.key === "End") goLast();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ── 로드 콜백 ── */
  function onDocumentLoad({ numPages: n }: { numPages: number }) {
    setNumPages(n);
    setLoading(false);
  }

  function onDocumentError(err: Error) {
    setLoadError(err.message);
    setLoading(false);
  }

  /* ── 페이지 높이 추정 (A4 비율 1:√2 ≈ 1:1.414) ── */
  const pageHeight = Math.round(pageWidth * 1.414);

  /* 모바일에서 보여줄 단일 페이지 */
  const mobilePage = rightPage ?? leftPage ?? 1;

  /* 두 페이지가 모두 렌더됐는지 */
  const spreadReady = isMobile
    ? rightLoaded || leftLoaded
    : (leftPage ? leftLoaded : true) && (rightPage ? rightLoaded : true);

  return (
    <div
      className="flex flex-col min-h-screen select-none"
      style={{
        background:
          "radial-gradient(ellipse at 30% 20%, #5c3010 0%, #3a1a06 40%, #2c1205 80%, #1e0d04 100%)",
      }}
    >
      {/* ── 상단 바 ── */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-2.5 bg-black/60 backdrop-blur-sm text-white/80 text-sm">
        {backHref && (
          <Link
            href={backHref}
            className="shrink-0 flex items-center gap-1.5 text-white/60 hover:text-white transition text-xs font-medium px-2 py-1 rounded hover:bg-white/10"
            title="이북 서재로 돌아가기"
          >
            ← 서재
          </Link>
        )}
        <span className="truncate max-w-[160px] sm:max-w-sm font-medium opacity-90">
          {title}
        </span>
        <div className="flex-1" />
        {numPages > 0 && (
          <span className="font-mono text-xs opacity-60 tabular-nums">
            {pageLabel}
          </span>
        )}
      </div>

      {/* ── 메인 뷰어 영역 ── */}
      <div
        ref={containerRef}
        className="flex-1 flex flex-col items-center justify-center py-8 sm:py-12 px-2 overflow-hidden"
      >
        {loadError ? (
          <ErrorState message={loadError} />
        ) : (
          <>
            {/* 로딩 스피너 */}
            {(loading || !spreadReady) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white/70 animate-spin" />
                  <span className="text-white/50 text-sm">
                    {loading ? "PDF 불러오는 중…" : "페이지 렌더 중…"}
                  </span>
                </div>
              </div>
            )}

            {/* 책 + 화살표 레이아웃 */}
            <div className="flex items-center gap-0 w-full max-w-[1200px] justify-center">
              {/* ◀ 이전 화살표 */}
              <NavArrow
                dir="left"
                disabled={atFirst}
                onClick={goPrev}
              />

              {/* 책 본체 */}
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoad}
                onLoadError={onDocumentError}
                loading={null}
                error={null}
              >
                {isMobile ? (
                  /* ── 모바일: 단일 페이지 ── */
                  <div
                    className="rounded-sm shadow-2xl overflow-hidden relative"
                    style={{
                      width: pageWidth,
                      height: spreadReady ? undefined : pageHeight,
                      background: "#fefcf8",
                    }}
                  >
                    <Page
                      pageNumber={mobilePage}
                      width={pageWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      onRenderSuccess={() => setRightLoaded(true)}
                      loading={null}
                    />
                  </div>
                ) : (
                  /* ── 데스크톱: 두 페이지 펼침 ── */
                  <div
                    className="flex relative"
                    style={{
                      /* 책 전체에 드리우는 그림자 */
                      filter: "drop-shadow(0 20px 60px rgba(0,0,0,0.7))",
                    }}
                  >
                    {/* 왼쪽 페이지 */}
                    <div
                      className="relative overflow-hidden"
                      style={{
                        width: pageWidth,
                        height: spreadReady ? undefined : pageHeight,
                        borderRadius: "4px 0 0 4px",
                        background: "#f5f0e8",
                        /* 오른쪽 끝(바인딩) 쪽 그림자 */
                        boxShadow: "inset -8px 0 16px -4px rgba(0,0,0,0.25)",
                      }}
                    >
                      {leftPage ? (
                        <Page
                          pageNumber={leftPage}
                          width={pageWidth}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          onRenderSuccess={() => setLeftLoaded(true)}
                          loading={null}
                        />
                      ) : (
                        /* 빈 왼쪽 페이지 (표지 스프레드) */
                        <div
                          style={{ width: pageWidth, height: pageHeight }}
                          className="flex items-center justify-center"
                        >
                          <span className="text-[#c4a882] text-4xl opacity-30">
                            📖
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 바인딩 (척추) */}
                    <div
                      style={{
                        width: 12,
                        minHeight: pageHeight,
                        flexShrink: 0,
                        background:
                          "linear-gradient(to right, #8b6340 0%, #d4a96a 30%, #e8c98a 50%, #d4a96a 70%, #8b6340 100%)",
                        boxShadow:
                          "inset 1px 0 2px rgba(255,255,255,0.3), inset -1px 0 2px rgba(0,0,0,0.4)",
                      }}
                    />

                    {/* 오른쪽 페이지 */}
                    <div
                      className="relative overflow-hidden"
                      style={{
                        width: pageWidth,
                        height: spreadReady ? undefined : pageHeight,
                        borderRadius: "0 4px 4px 0",
                        background: "#fefcf8",
                        /* 왼쪽 끝(바인딩) 쪽 그림자 */
                        boxShadow: "inset 8px 0 16px -4px rgba(0,0,0,0.2)",
                      }}
                    >
                      {rightPage ? (
                        <Page
                          pageNumber={rightPage}
                          width={pageWidth}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          onRenderSuccess={() => setRightLoaded(true)}
                          loading={null}
                        />
                      ) : (
                        /* 빈 오른쪽 페이지 (마지막 홀수 페이지 이후) */
                        <div
                          style={{ width: pageWidth, height: pageHeight }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </Document>

              {/* ▶ 다음 화살표 */}
              <NavArrow
                dir="right"
                disabled={atLast}
                onClick={goNext}
              />
            </div>

            {/* 페이지 번호 표시 (책 아래) */}
            {numPages > 0 && (
              <div className="mt-5 text-white/40 text-xs font-mono tabular-nums">
                {pageLabel}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 하단 네비게이션 바 ── */}
      <div className="sticky bottom-0 z-20 flex items-center justify-center gap-2 px-4 py-3 bg-black/60 backdrop-blur-sm">
        <BottomBtn onClick={goFirst} disabled={atFirst} label="처음" title="처음으로">
          {"|◀"}
        </BottomBtn>
        <BottomBtn onClick={goPrev} disabled={atFirst} label="이전" title="이전 페이지">
          {"◀◀"}
        </BottomBtn>

        {/* 페이지 슬라이더 */}
        {numPages > 1 && (
          <input
            type="range"
            min={0}
            max={totalSpreads - 1}
            value={spread}
            onChange={(e) => {
              setSpread(Number(e.target.value));
              resetPageLoading();
            }}
            className="w-40 sm:w-64 accent-amber-400 cursor-pointer"
            aria-label="페이지 슬라이더"
          />
        )}

        <BottomBtn onClick={goNext} disabled={atLast} label="다음" title="다음 페이지">
          {"▶▶"}
        </BottomBtn>
        <BottomBtn onClick={goLast} disabled={atLast} label="마지막" title="마지막으로">
          {"▶|"}
        </BottomBtn>
      </div>
    </div>
  );
}

/* ── 서브 컴포넌트들 ── */

function NavArrow({
  dir,
  disabled,
  onClick,
}: {
  dir: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "left" ? "이전 페이지" : "다음 페이지"}
      className={[
        "flex-shrink-0 w-10 sm:w-14 flex items-center justify-center self-stretch",
        "transition-all duration-200 rounded-lg mx-1",
        disabled
          ? "opacity-20 cursor-not-allowed"
          : "opacity-70 hover:opacity-100 hover:bg-white/10 cursor-pointer active:scale-95",
      ].join(" ")}
    >
      <span
        className="text-white text-2xl sm:text-3xl"
        style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
        aria-hidden="true"
      >
        {dir === "left" ? "❮" : "❯"}
      </span>
    </button>
  );
}

function BottomBtn({
  onClick,
  disabled,
  label,
  title,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title}
      className={[
        "px-3 py-1.5 rounded text-sm font-mono transition-all",
        disabled
          ? "text-white/20 cursor-not-allowed"
          : "text-white/70 hover:text-white hover:bg-white/10 cursor-pointer active:scale-95",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center py-20 px-6">
      <div className="text-5xl mb-5">⚠️</div>
      <div className="text-white text-lg font-medium mb-2">
        PDF를 불러올 수 없습니다
      </div>
      <div className="text-white/50 text-sm max-w-sm mx-auto">{message}</div>
    </div>
  );
}
