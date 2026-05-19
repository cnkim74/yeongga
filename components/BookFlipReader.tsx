"use client";

/**
 * BookFlipReader — react-pageflip 기반 실제 책넘김 애니메이션 + 사운드 + 명암.
 *
 * 기존 EbookReader 의 정적 두 페이지 나란히 표시(spread) 모드와 별개로,
 * 종이 한 장이 휘어지듯 넘어가는 진짜 책 느낌의 자리.
 *
 * - PDF.js 로 페이지를 캔버스에 렌더 (필요한 페이지만 lazy 렌더)
 * - HTMLFlipBook 이 페이지 휘어지는 애니메이션 + 그림자 자동 처리
 * - 페이지 넘김 시 Web Audio API 로 합성 사운드 (mp3 파일 불필요)
 * - 종이 질감·표지 그림자는 CSS 로 입힘
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

// react-pageflip 은 window 를 즉시 참조해 SSR 단계에서 깨진다.
// Next.js 에서는 dynamic import + ssr:false 로 클라이언트에서만 로드.
const HTMLFlipBook = dynamic(() => import("react-pageflip"), { ssr: false });

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const CMAP_URL = "/cmaps/";
const CMAP_PACKED = true;
const STANDARD_FONT_DATA_URL = "/standard_fonts/";

interface BookFlipReaderProps {
  pdfUrl: string;
  pageWidth: number;
  pageHeight: number;
  /** 사운드 활성 여부 (기본 true) */
  sound?: boolean;
  /** 외부에서 현재 페이지 변동을 받고 싶을 때 */
  onPageChange?: (page: number, total: number) => void;
}

export interface BookFlipReaderHandle {
  flipNext: () => void;
  flipPrev: () => void;
  flipToPage: (page: number) => void;
  getNumPages: () => number;
}

/**
 * 종이 넘기는 합성 사운드 — Web Audio API 로 즉석 생성.
 * 짧은 노이즈 버스트 + 저주파 thud 가 섞인 결.
 */
function playPageFlipSound() {
  try {
    type Win = Window & { webkitAudioContext?: typeof AudioContext };
    const AC = (window.AudioContext ?? (window as Win).webkitAudioContext);
    if (!AC) return;
    const ctx = new AC();
    const dur = 0.18;
    // 노이즈 (종이 결 마찰)
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.6) * 0.45;
    }
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2200;
    bp.Q.value = 0.7;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.8, ctx.currentTime);
    noise.connect(bp).connect(ng).connect(ctx.destination);

    // 저주파 thud
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.12);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.001, ctx.currentTime);
    og.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
    og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(og).connect(ctx.destination);

    noise.start();
    osc.start();
    noise.stop(ctx.currentTime + dur);
    osc.stop(ctx.currentTime + dur);
    // 정리
    setTimeout(() => ctx.close().catch(() => {}), 400);
  } catch {
    // 사운드 실패는 무시
  }
}

/**
 * 한 페이지 컴포넌트. ref 로 캔버스 접근 가능.
 * react-pageflip 은 직속 자식들에게 ref 를 박아 두므로 forwardRef 필수.
 */
const FlipPage = forwardRef<HTMLDivElement, {
  pageNum: number;
  width: number;
  height: number;
  renderPage: (pageNum: number, canvas: HTMLCanvasElement) => void;
  isCover?: "front" | "back" | null;
}>(function FlipPage({ pageNum, width, height, renderPage, isCover }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderedRef = useRef(false);

  // 페이지가 DOM 에 들어오면 한 번 렌더
  useEffect(() => {
    if (!canvasRef.current || renderedRef.current) return;
    renderedRef.current = true;
    renderPage(pageNum, canvasRef.current);
  }, [pageNum, renderPage]);

  if (isCover) {
    return (
      <div
        ref={ref}
        style={{
          width,
          height,
          background:
            isCover === "front"
              ? "linear-gradient(135deg, #5a2418 0%, #3a1408 60%, #2a0d04 100%)"
              : "linear-gradient(135deg, #2a0d04 0%, #3a1408 60%, #5a2418 100%)",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#e8c98a",
          fontFamily: "var(--font-serif)",
          fontSize: 20,
          letterSpacing: "0.15em",
          textAlign: "center",
          padding: 40,
        }}
      >
        <div>
          {isCover === "front" ? "永 嘉 會\n40 年 史" : "永 嘉 會"}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{
        width,
        height,
        background: "#fefcf8",
        boxShadow: "inset 0 0 30px rgba(0,0,0,0.08)",
        // 종이 결 — 미세한 노이즈
        backgroundImage:
          "repeating-linear-gradient(90deg, transparent 0 2px, rgba(140,100,60,0.015) 2px 3px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
      />
    </div>
  );
});

export const BookFlipReader = forwardRef<BookFlipReaderHandle, BookFlipReaderProps>(
  function BookFlipReader({ pdfUrl, pageWidth, pageHeight, sound = true, onPageChange }, ref) {
    const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const flipBookRef = useRef<unknown>(null);

    const activeTasks = useRef<Set<RenderTask>>(new Set());

    /* PDF 로드 */
    useEffect(() => {
      let cancelled = false;
      setLoading(true);
      setLoadError(null);
      setPdf(null);
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
        } catch (e) {
          if (cancelled) return;
          setLoadError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [pdfUrl]);

    /* 페이지 → 캔버스 렌더 */
    const renderPage = useCallback(
      async (pageNum: number, canvas: HTMLCanvasElement) => {
        if (!pdf) return;
        try {
          const page = await pdf.getPage(pageNum);
          const natural = page.getViewport({ scale: 1 });
          const scale = pageWidth / natural.width;
          const viewport = page.getViewport({ scale });
          const dpr = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = "100%";
          canvas.style.height = "100%";
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          const transform: [number, number, number, number, number, number] | undefined =
            dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
          const task = page.render({ canvasContext: ctx, viewport, transform });
          activeTasks.current.add(task);
          await task.promise;
          activeTasks.current.delete(task);
        } catch (e) {
          if (e instanceof Error && e.name === "RenderingCancelledException") return;
          console.error(`[BookFlipReader] p${pageNum}`, e);
        }
      },
      [pdf, pageWidth]
    );

    /* 정리 — 컴포넌트 언마운트 시 진행 중 렌더 모두 취소 */
    useEffect(() => {
      const tasks = activeTasks.current;
      return () => {
        tasks.forEach((t) => { try { t.cancel(); } catch {} });
        tasks.clear();
      };
    }, []);

    /* 외부 핸들 */
    useImperativeHandle(ref, () => ({
      flipNext: () => {
        const fb = flipBookRef.current as { pageFlip?: () => { flipNext: () => void } } | null;
        fb?.pageFlip?.().flipNext();
      },
      flipPrev: () => {
        const fb = flipBookRef.current as { pageFlip?: () => { flipPrev: () => void } } | null;
        fb?.pageFlip?.().flipPrev();
      },
      flipToPage: (page: number) => {
        const fb = flipBookRef.current as { pageFlip?: () => { flip: (p: number) => void } } | null;
        fb?.pageFlip?.().flip(page);
      },
      getNumPages: () => numPages,
    }), [numPages]);

    /* onFlip — 사운드 + 외부 알림 */
    const handleFlip = useCallback(
      (e: { data: number }) => {
        if (sound) playPageFlipSound();
        if (onPageChange) onPageChange(e.data, numPages);
      },
      [sound, onPageChange, numPages]
    );

    if (loadError) {
      return (
        <div className="text-center py-12 text-white/80">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="font-medium mb-1">PDF 로드 실패</div>
          <div className="text-white/50 text-sm">{loadError}</div>
        </div>
      );
    }

    if (loading || !pdf) {
      return (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white/70 animate-spin" />
          <span className="text-white/50 text-sm">책을 펴는 중…</span>
        </div>
      );
    }

    return (
      <div
        className="book-flip-wrap"
        style={{
          // 책 아래 깊은 그림자
          filter: "drop-shadow(0 30px 50px rgba(0,0,0,0.55))",
        }}
      >
        {/* react-pageflip 의 HTMLFlipBook 타입이 까다로워 minimum 옵션만 */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <HTMLFlipBook
          width={pageWidth}
          height={pageHeight}
          size="fixed"
          minWidth={200}
          maxWidth={1000}
          minHeight={300}
          maxHeight={1400}
          drawShadow={true}
          flippingTime={650}
          // 양면 스프레드 강제 — 책처럼 두 페이지가 펼쳐진 상태에서
          // 한 장이 휘어 넘어가는 자리. (default true 면 데스크탑에서도
          // 단일 페이지 portrait 로 가는 경우가 있어 false 로 고정)
          usePortrait={false}
          startPage={0}
          showCover={true}
          mobileScrollSupport={true}
          onFlip={handleFlip}
          ref={flipBookRef as React.Ref<unknown>}
          className=""
          style={{}}
          startZIndex={0}
          autoSize={false}
          maxShadowOpacity={0.5}
          clickEventForward={true}
          useMouseEvents={true}
          swipeDistance={30}
          showPageCorners={true}
          disableFlipByClick={false}
        >
          {/* 앞표지 */}
          <FlipPage
            pageNum={0}
            width={pageWidth}
            height={pageHeight}
            renderPage={() => {}}
            isCover="front"
          />
          {/* 본문 페이지들 */}
          {Array.from({ length: numPages }, (_, i) => (
            <FlipPage
              key={i + 1}
              pageNum={i + 1}
              width={pageWidth}
              height={pageHeight}
              renderPage={renderPage}
              isCover={null}
            />
          ))}
          {/* 뒤표지 */}
          <FlipPage
            pageNum={0}
            width={pageWidth}
            height={pageHeight}
            renderPage={() => {}}
            isCover="back"
          />
        </HTMLFlipBook>
      </div>
    );
  }
);
