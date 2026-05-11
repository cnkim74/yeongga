"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const CMAP_URL = "/cmaps/";
const CMAP_PACKED = true;
const STANDARD_FONT_DATA_URL = "/standard_fonts/";

interface EbookReaderProps {
  pdfUrl: string;
  title: string;
  backHref?: string;
}

type ViewMode = "flipbook" | "iframe";

export function EbookReader({ pdfUrl, title, backHref }: EbookReaderProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("flipbook");
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [spread, setSpread] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [pageWidth, setPageWidth] = useState(400);
  const [debug, setDebug] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);
  const leftCanvasRef  = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const mobileCanvasRef = useRef<HTMLCanvasElement>(null);

  // 진행 중인 렌더 작업 추적
  const activeRenderTasks = useRef<Set<RenderTask>>(new Set());

  /* ── PDF 로드 ── */
  useEffect(() => {
    if (viewMode !== "flipbook") return;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setPdf(null);
    setNumPages(0);
    setDebug("PDF 가져오는 중…");

    (async () => {
      try {
        const res = await fetch(pdfUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.arrayBuffer();
        if (cancelled) return;

        setDebug(`PDF 다운로드 완료 (${(data.byteLength / 1024 / 1024).toFixed(2)} MB), 파싱 중…`);

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
        setDebug(`PDF 파싱 완료 — ${doc.numPages}페이지`);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [pdfUrl, viewMode]);

  /* ── 뷰포트 크기 ── */
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

  /* ── 스프레드 계산 ── */
  const totalSpreads = numPages > 0 ? Math.ceil(numPages / 2) : 1;
  function spreadPages(s: number): [number | null, number | null] {
    const l = s * 2 + 1;
    const r = s * 2 + 2;
    return [l <= numPages ? l : null, r <= numPages ? r : null];
  }
  const [leftPage, rightPage] = spreadPages(spread);
  const mobilePage = leftPage ?? 1;

  /* ── Canvas 렌더 — Mozilla 공식 예제 패턴 (DPR 미적용 단순화) ── */
  const renderPage = useCallback(
    async (pageNum: number, canvas: HTMLCanvasElement) => {
      if (!pdf) return;

      try {
        const page = await pdf.getPage(pageNum);
        const naturalViewport = page.getViewport({ scale: 1 });
        const cssWidth = canvas.parentElement?.clientWidth ?? 400;
        const scale = cssWidth / naturalViewport.width;
        const viewport = page.getViewport({ scale });

        // 캔버스 크기 설정 (단순화: DPR 미적용)
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        // 캔버스 컨텍스트 명시적 획득 + 흰색 배경 클리어
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setDebug(`p${pageNum}: 2D 컨텍스트 획득 실패`);
          return;
        }

        // pdfjs v5 호환: canvas 와 canvasContext 둘 다 전달 (안전)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderParams: any = {
          canvas,
          canvasContext: ctx,
          viewport,
        };

        const task = page.render(renderParams);
        activeRenderTasks.current.add(task);

        await task.promise;
        activeRenderTasks.current.delete(task);

        setDebug(
          `p${pageNum} 렌더 완료 — canvas: ${canvas.width}x${canvas.height}, viewport: ${Math.floor(viewport.width)}x${Math.floor(viewport.height)}`
        );
      } catch (e) {
        if (e instanceof Error) {
          if (e.name === "RenderingCancelledException") return;
          setDebug(`p${pageNum} 에러: ${e.name} — ${e.message}`);
        }
        console.error(`[EbookReader] p${pageNum}`, e);
      }
    },
    [pdf]
  );

  /* ── 진행 중인 렌더 모두 취소 ── */
  function cancelAllRenders() {
    activeRenderTasks.current.forEach((t) => {
      try { t.cancel(); } catch {}
    });
    activeRenderTasks.current.clear();
  }

  /* ── 스프레드/크기 변경 시 렌더 ── */
  useEffect(() => {
    if (!pdf || loading || viewMode !== "flipbook") return;

    cancelAllRenders();

    const handle = requestAnimationFrame(() => {
      if (isMobile) {
        if (mobileCanvasRef.current && mobilePage) {
          renderPage(mobilePage, mobileCanvasRef.current);
        }
      } else {
        if (leftCanvasRef.current && leftPage) {
          renderPage(leftPage, leftCanvasRef.current);
        }
        if (rightCanvasRef.current && rightPage) {
          renderPage(rightPage, rightCanvasRef.current);
        }
      }
    });

    return () => {
      cancelAnimationFrame(handle);
      cancelAllRenders();
    };
  }, [pdf, loading, spread, isMobile, pageWidth, leftPage, rightPage, mobilePage, renderPage, viewMode]);

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

  const pageLabel = (() => {
    if (isMobile) return mobilePage ? `${mobilePage} / ${numPages}` : "";
    const pages = [leftPage, rightPage].filter(Boolean) as number[];
    if (pages.length === 0) return "";
    if (pages.length === 1) return `${pages[0]} / ${numPages}`;
    return `${pages[0]}–${pages[1]} / ${numPages}`;
  })();

  const pageHeight = Math.round(pageWidth * 1.414);

  /* ── iframe 폴백 모드 ── */
  if (viewMode === "iframe") {
    return (
      <div className="flex flex-col min-h-screen bg-gray-900">
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-2.5 bg-black/80 text-white/80 text-sm">
          {backHref && (
            <Link href={backHref} className="text-white/60 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10">
              ← 서재
            </Link>
          )}
          <span className="truncate font-medium">{title}</span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setViewMode("flipbook")}
            className="text-xs px-3 py-1 rounded border border-white/20 hover:bg-white/10"
          >
            📖 책 모드
          </button>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 rounded border border-white/20 hover:bg-white/10"
          >
            ↗ 새 탭
          </a>
        </div>
        <iframe
          src={pdfUrl}
          title={title}
          className="flex-1 w-full bg-white"
          style={{ minHeight: "calc(100vh - 50px)" }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col min-h-screen select-none"
      style={{
        background:
          "radial-gradient(ellipse at 30% 20%, #5c3010 0%, #3a1a06 40%, #2c1205 80%, #1e0d04 100%)",
      }}
    >
      {/* 상단 바 */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-2.5 bg-black/60 backdrop-blur-sm text-white/80 text-sm">
        {backHref && (
          <Link href={backHref} className="shrink-0 text-white/60 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10">
            ← 서재
          </Link>
        )}
        <span className="truncate max-w-[160px] sm:max-w-sm font-medium opacity-90">{title}</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setViewMode("iframe")}
          className="text-xs px-2 py-1 rounded border border-white/20 hover:bg-white/10"
          title="브라우저 기본 PDF 뷰어로 보기"
        >
          📄 기본 뷰어
        </button>
        {numPages > 0 && (
          <span className="font-mono text-xs opacity-60 tabular-nums">{pageLabel}</span>
        )}
      </div>

      {/* 메인 뷰어 */}
      <div
        ref={containerRef}
        className="flex-1 flex flex-col items-center justify-center py-8 sm:py-12 px-2 relative"
      >
        {loadError ? (
          <ErrorState message={loadError} onFallback={() => setViewMode("iframe")} />
        ) : loading ? (
          <LoadingSpinner text="PDF 불러오는 중…" />
        ) : (
          <>
            <div className="flex items-center w-full max-w-[1200px] justify-center">
              <NavArrow dir="left" disabled={atFirst} onClick={goPrev} />

              {isMobile ? (
                <div style={{
                  width: pageWidth,
                  borderRadius: 4,
                  overflow: "hidden",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
                  background: "#fefcf8",
                }}>
                  <canvas ref={mobileCanvasRef} style={{ display: "block", width: "100%" }} />
                </div>
              ) : (
                <div className="flex" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
                  <div style={{
                    width: pageWidth,
                    minHeight: pageHeight,
                    borderRadius: "4px 0 0 4px",
                    background: "#f5f0e8",
                    overflow: "hidden",
                    boxShadow: "inset -6px 0 12px -4px rgba(0,0,0,0.20)",
                  }}>
                    {leftPage ? (
                      <canvas ref={leftCanvasRef} style={{ display: "block", width: "100%" }} />
                    ) : (
                      <div style={{ width: pageWidth, height: pageHeight }}
                        className="flex items-center justify-center">
                        <span className="text-[#c4a882] text-4xl opacity-20">📖</span>
                      </div>
                    )}
                  </div>

                  <div style={{
                    width: 12,
                    minHeight: pageHeight,
                    flexShrink: 0,
                    background:
                      "linear-gradient(to right, #8b6340 0%, #d4a96a 30%, #e8c98a 50%, #d4a96a 70%, #8b6340 100%)",
                  }} />

                  <div style={{
                    width: pageWidth,
                    minHeight: pageHeight,
                    borderRadius: "0 4px 4px 0",
                    background: "#fefcf8",
                    overflow: "hidden",
                    boxShadow: "inset 6px 0 12px -4px rgba(0,0,0,0.15)",
                  }}>
                    {rightPage ? (
                      <canvas ref={rightCanvasRef} style={{ display: "block", width: "100%" }} />
                    ) : (
                      <div style={{ width: pageWidth, height: pageHeight }} />
                    )}
                  </div>
                </div>
              )}

              <NavArrow dir="right" disabled={atLast} onClick={goNext} />
            </div>

            {numPages > 0 && (
              <div className="mt-5 text-white/40 text-xs font-mono tabular-nums">{pageLabel}</div>
            )}

            {/* 진단 정보 */}
            {debug && (
              <div className="mt-3 text-amber-300/60 text-[10px] font-mono max-w-2xl text-center px-4">
                {debug}
              </div>
            )}
          </>
        )}
      </div>

      {/* 하단 바 */}
      <div className="sticky bottom-0 z-20 flex items-center justify-center gap-2 px-4 py-3 bg-black/60 backdrop-blur-sm">
        <BottomBtn onClick={goFirst} disabled={atFirst} label="처음" title="처음으로">{"|◀"}</BottomBtn>
        <BottomBtn onClick={goPrev}  disabled={atFirst} label="이전" title="이전 페이지">{"◀◀"}</BottomBtn>

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

        <BottomBtn onClick={goNext} disabled={atLast} label="다음" title="다음 페이지">{"▶▶"}</BottomBtn>
        <BottomBtn onClick={goLast} disabled={atLast} label="마지막" title="마지막으로">{"▶|"}</BottomBtn>
      </div>
    </div>
  );
}

function NavArrow({ dir, disabled, onClick }: { dir: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      aria-label={dir === "left" ? "이전 페이지" : "다음 페이지"}
      className={[
        "flex-shrink-0 w-10 sm:w-14 flex items-center justify-center self-stretch",
        "transition-all duration-200 rounded-lg mx-1",
        disabled
          ? "opacity-20 cursor-not-allowed"
          : "opacity-70 hover:opacity-100 hover:bg-white/10 cursor-pointer active:scale-95",
      ].join(" ")}
    >
      <span className="text-white text-2xl sm:text-3xl" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }} aria-hidden="true">
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

function ErrorState({ message, onFallback }: { message: string; onFallback: () => void }) {
  return (
    <div className="text-center py-20 px-6">
      <div className="text-5xl mb-5">⚠️</div>
      <div className="text-white text-lg font-medium mb-2">PDF를 불러올 수 없습니다</div>
      <div className="text-white/50 text-sm max-w-sm mx-auto mb-6">{message}</div>
      <button
        type="button"
        onClick={onFallback}
        className="text-sm px-4 py-2 rounded border border-white/30 text-white hover:bg-white/10"
      >
        📄 브라우저 기본 PDF 뷰어로 열기
      </button>
    </div>
  );
}
