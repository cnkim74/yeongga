"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

// react-pdf 없이 pdfjs-dist 직접 사용 — canvas 렌더링 완전 제어
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const CMAP_URL = "/cmaps/";
const CMAP_PACKED = true;
const STANDARD_FONT_DATA_URL = "/standard_fonts/";

interface EbookReaderProps {
  pdfUrl: string;
  title: string;
  backHref?: string;
}

export function EbookReader({ pdfUrl, title, backHref }: EbookReaderProps) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [spread, setSpread] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [pageWidth, setPageWidth] = useState(400);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftCanvasRef  = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const mobileCanvasRef = useRef<HTMLCanvasElement>(null);

  /* ── PDF 로드 ──
   * URL 방식 대신 fetch → ArrayBuffer 로 전달:
   * worker가 별도로 PDF를 fetch할 때 발생하는 CORS/네트워크 문제를 우회
   */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setPdf(null);
    setNumPages(0);

    (async () => {
      try {
        const res = await fetch(pdfUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.arrayBuffer();
        if (cancelled) return;

        const doc = await pdfjs.getDocument({
          data,
          cMapUrl: CMAP_URL,
          cMapPacked: CMAP_PACKED,
          standardFontDataUrl: STANDARD_FONT_DATA_URL,
        }).promise;

        if (cancelled) return;
        setPdf(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [pdfUrl]);

  /* ── 뷰포트 크기 감지 ── */
  useEffect(() => {
    function updateSize() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      const cw = containerRef.current?.clientWidth ?? window.innerWidth;
      setPageWidth(
        mobile
          ? Math.min(cw - 32, 480)
          : Math.min(Math.floor((cw - 172) / 2), 520)
      );
    }
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  /* ── 스프레드 계산 ──
   * spread 0 → [page 1, page 2]
   * spread 1 → [page 3, page 4]
   */
  const totalSpreads = numPages > 0 ? Math.ceil(numPages / 2) : 1;

  function spreadPages(s: number): [number | null, number | null] {
    const l = s * 2 + 1;
    const r = s * 2 + 2;
    return [l <= numPages ? l : null, r <= numPages ? r : null];
  }

  const [leftPage, rightPage] = spreadPages(spread);
  const mobilePage = leftPage ?? 1;

  /* ── Canvas 렌더 함수 ── */
  const renderPage = useCallback(
    async (pageNum: number, canvas: HTMLCanvasElement, targetWidth: number) => {
      if (!pdf) return;
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const scale = targetWidth / viewport.width;
        const scaled = page.getViewport({ scale });

        // 고DPI(Retina) 지원
        const dpr = window.devicePixelRatio || 1;
        canvas.width  = Math.round(scaled.width  * dpr);
        canvas.height = Math.round(scaled.height * dpr);
        canvas.style.width  = `${Math.round(scaled.width)}px`;
        canvas.style.height = `${Math.round(scaled.height)}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.scale(dpr, dpr);

        await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise;
      } catch (e) {
        console.error(`[EbookReader] page ${pageNum} render error`, e);
      }
    },
    [pdf]
  );

  /* ── 스프레드 변경 시 렌더 ── */
  useEffect(() => {
    if (!pdf || loading) return;

    if (isMobile) {
      if (mobileCanvasRef.current && mobilePage) {
        renderPage(mobilePage, mobileCanvasRef.current, pageWidth);
      }
    } else {
      if (leftCanvasRef.current && leftPage) {
        renderPage(leftPage, leftCanvasRef.current, pageWidth);
      }
      if (rightCanvasRef.current && rightPage) {
        renderPage(rightPage, rightCanvasRef.current, pageWidth);
      }
    }
  }, [pdf, loading, spread, isMobile, pageWidth, leftPage, rightPage, mobilePage, renderPage]);

  /* ── 네비게이션 ── */
  const atFirst = spread === 0;
  const atLast  = spread >= totalSpreads - 1;

  function goFirst() { setSpread(0); }
  function goPrev()  { if (!atFirst) setSpread((s) => s - 1); }
  function goNext()  { if (!atLast)  setSpread((s) => s + 1); }
  function goLast()  { setSpread(totalSpreads - 1); }

  /* ── 키보드 ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft"  || e.key === "PageUp")   goPrev();
      if (e.key === "ArrowRight" || e.key === "PageDown")  goNext();
      if (e.key === "Home") goFirst();
      if (e.key === "End")  goLast();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* 페이지 번호 표시 */
  const pageLabel = (() => {
    if (isMobile) return mobilePage ? `${mobilePage} / ${numPages}` : "";
    const pages = [leftPage, rightPage].filter(Boolean) as number[];
    if (pages.length === 0) return "";
    if (pages.length === 1) return `${pages[0]} / ${numPages}`;
    return `${pages[0]}–${pages[1]} / ${numPages}`;
  })();

  /* 페이지 높이 추정 (A4 비율) */
  const pageHeight = Math.round(pageWidth * 1.414);

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
          >
            ← 서재
          </Link>
        )}
        <span className="truncate max-w-[160px] sm:max-w-sm font-medium opacity-90">
          {title}
        </span>
        <div className="flex-1" />
        {numPages > 0 && (
          <span className="font-mono text-xs opacity-60 tabular-nums">{pageLabel}</span>
        )}
      </div>

      {/* ── 메인 뷰어 ── */}
      <div
        ref={containerRef}
        className="flex-1 flex flex-col items-center justify-center py-8 sm:py-12 px-2 relative"
      >
        {loadError ? (
          <ErrorState message={loadError} />
        ) : loading ? (
          <LoadingSpinner text="PDF 불러오는 중…" />
        ) : (
          <>
            <div className="flex items-center w-full max-w-[1200px] justify-center">
              <NavArrow dir="left"  disabled={atFirst} onClick={goPrev} />

              {isMobile ? (
                /* ── 모바일: 단일 canvas ── */
                <div style={{
                  borderRadius: 4,
                  overflow: "hidden",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
                  background: "#fefcf8",
                  minHeight: pageHeight,
                  minWidth: pageWidth,
                }}>
                  <canvas ref={mobileCanvasRef} style={{ display: "block" }} />
                </div>
              ) : (
                /* ── 데스크톱: 두 페이지 ── */
                <div className="flex" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
                  {/* 왼쪽 */}
                  <div style={{
                    width: pageWidth,
                    minHeight: pageHeight,
                    borderRadius: "4px 0 0 4px",
                    background: "#f5f0e8",
                    overflow: "hidden",
                    boxShadow: "inset -6px 0 12px -4px rgba(0,0,0,0.20)",
                    display: "flex",
                    alignItems: "flex-start",
                  }}>
                    {leftPage ? (
                      <canvas ref={leftCanvasRef} style={{ display: "block" }} />
                    ) : (
                      <div style={{ width: pageWidth, height: pageHeight }}
                        className="flex items-center justify-center">
                        <span className="text-[#c4a882] text-4xl opacity-20">📖</span>
                      </div>
                    )}
                  </div>

                  {/* 바인딩 */}
                  <div style={{
                    width: 12,
                    minHeight: pageHeight,
                    flexShrink: 0,
                    background:
                      "linear-gradient(to right, #8b6340 0%, #d4a96a 30%, #e8c98a 50%, #d4a96a 70%, #8b6340 100%)",
                  }} />

                  {/* 오른쪽 */}
                  <div style={{
                    width: pageWidth,
                    minHeight: pageHeight,
                    borderRadius: "0 4px 4px 0",
                    background: "#fefcf8",
                    overflow: "hidden",
                    boxShadow: "inset 6px 0 12px -4px rgba(0,0,0,0.15)",
                    display: "flex",
                    alignItems: "flex-start",
                  }}>
                    {rightPage ? (
                      <canvas ref={rightCanvasRef} style={{ display: "block" }} />
                    ) : (
                      <div style={{ width: pageWidth, height: pageHeight }} />
                    )}
                  </div>
                </div>
              )}

              <NavArrow dir="right" disabled={atLast}  onClick={goNext} />
            </div>

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
        <BottomBtn onClick={goFirst} disabled={atFirst} label="처음"   title="처음으로">{"|◀"}</BottomBtn>
        <BottomBtn onClick={goPrev}  disabled={atFirst} label="이전"   title="이전 페이지">{"◀◀"}</BottomBtn>

        {numPages > 1 && (
          <input
            type="range"
            min={0}
            max={totalSpreads - 1}
            value={spread}
            onChange={(e) => setSpread(Number(e.target.value))}
            className="w-40 sm:w-64 accent-amber-400 cursor-pointer"
            aria-label="페이지 슬라이더"
          />
        )}

        <BottomBtn onClick={goNext}  disabled={atLast}  label="다음"   title="다음 페이지">{"▶▶"}</BottomBtn>
        <BottomBtn onClick={goLast}  disabled={atLast}  label="마지막" title="마지막으로">{"▶|"}</BottomBtn>
      </div>
    </div>
  );
}

/* ── 서브 컴포넌트 ── */

function NavArrow({ dir, disabled, onClick }: {
  dir: "left" | "right"; disabled: boolean; onClick: () => void;
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
      <span className="text-white text-2xl sm:text-3xl"
        style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }} aria-hidden="true">
        {dir === "left" ? "❮" : "❯"}
      </span>
    </button>
  );
}

function BottomBtn({ onClick, disabled, label, title, children }: {
  onClick: () => void; disabled: boolean; label: string; title: string; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={title}
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

function LoadingSpinner({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white/70 animate-spin" />
      <span className="text-white/50 text-sm">{text}</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center py-20 px-6">
      <div className="text-5xl mb-5">⚠️</div>
      <div className="text-white text-lg font-medium mb-2">PDF를 불러올 수 없습니다</div>
      <div className="text-white/50 text-sm max-w-sm mx-auto mb-4">{message}</div>
    </div>
  );
}
