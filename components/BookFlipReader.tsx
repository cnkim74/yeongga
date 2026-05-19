"use client";

/**
 * BookFlipReader — react-pageflip 기반 실제 책넘김 애니메이션 + 사운드 + 명암.
 *
 * 페이지 안정성을 위해 PDF.js 로 모든 페이지를 미리 JPEG dataURL 로
 * 렌더해 두고, react-pageflip 의 자식 페이지에는 <img> 만 두는 방식.
 * react-pageflip 의 lazy 마운트/언마운트와 무관하게 모든 페이지가
 * 채워진 상태로 들어옴.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const CMAP_URL = "/cmaps/";
const CMAP_PACKED = true;
const STANDARD_FONT_DATA_URL = "/standard_fonts/";

// react-pageflip 은 window 즉시 참조 → SSR 단계에서 깨짐
const HTMLFlipBook = dynamic(() => import("react-pageflip"), { ssr: false });

interface BookFlipReaderProps {
  pdfUrl: string;
  pageWidth: number;
  pageHeight: number;
  sound?: boolean;
  onPageChange?: (page: number, total: number) => void;
  onProgress?: (rendered: number, total: number) => void;
}

export interface BookFlipReaderHandle {
  flipNext: () => void;
  flipPrev: () => void;
  flipToPage: (page: number) => void;
  getNumPages: () => number;
}

/**
 * 종이 사르륵 사운드 — 5.5kHz → 2.5kHz 밴드패스 스위프 노이즈.
 */
function playPageFlipSound() {
  try {
    type Win = Window & { webkitAudioContext?: typeof AudioContext };
    const AC = (window.AudioContext ?? (window as Win).webkitAudioContext);
    if (!AC) return;
    const ctx = new AC();
    const dur = 0.22;

    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(5500, ctx.currentTime);
    bp.frequency.exponentialRampToValueAtTime(2500, ctx.currentTime + dur * 0.85);
    bp.Q.value = 0.7;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);

    noise.connect(bp).connect(g).connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + dur);
    setTimeout(() => ctx.close().catch(() => {}), 400);
  } catch {}
}

/** 한 페이지 — 표지는 그래픽 디자인, 본문은 <img>. */
const FlipPage = forwardRef<HTMLDivElement, {
  width: number;
  height: number;
  imgSrc?: string;
  isCover?: "front" | "back" | null;
}>(function FlipPage({ width, height, imgSrc, isCover }, ref) {
  if (isCover) {
    const isFront = isCover === "front";
    return (
      <div
        ref={ref}
        data-density="hard"
        style={{ width, height, userSelect: "none" }}
      >
        {/* 내부 wrapper 로 styling 안정화 */}
        <div
          style={{
            width: "100%",
            height: "100%",
            background: isFront
              ? "linear-gradient(160deg, #2d1810 0%, #1a0e08 60%, #0f0805 100%)"
              : "linear-gradient(160deg, #0f0805 0%, #1a0e08 60%, #2d1810 100%)",
            boxShadow:
              "inset 0 0 80px rgba(0,0,0,0.7), inset 0 0 0 3px rgba(180,140,80,0.25)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#d4b074",
            fontFamily: "var(--font-serif)",
            textAlign: "center",
            padding: 32,
            position: "relative",
          }}
        >
          {isFront ? (
            <>
              <div
                style={{
                  fontSize: Math.round(width * 0.085),
                  letterSpacing: "0.28em",
                  fontWeight: 500,
                  marginBottom: Math.round(height * 0.04),
                  textShadow: "0 2px 8px rgba(0,0,0,0.6)",
                }}
              >
                永 嘉 會
              </div>
              <div
                style={{
                  width: "55%",
                  height: 1,
                  background:
                    "linear-gradient(to right, transparent, rgba(212,176,116,0.5), transparent)",
                  marginBottom: Math.round(height * 0.04),
                }}
              />
              <div
                style={{
                  fontSize: Math.round(width * 0.065),
                  letterSpacing: "0.2em",
                  opacity: 0.85,
                }}
              >
                50 年 史
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: Math.round(height * 0.08),
                  fontSize: Math.round(width * 0.022),
                  letterSpacing: "0.3em",
                  opacity: 0.5,
                }}
              >
                1977 · 2026
              </div>
            </>
          ) : (
            <div
              style={{
                fontSize: Math.round(width * 0.055),
                letterSpacing: "0.25em",
                opacity: 0.7,
              }}
            >
              永 嘉 會
            </div>
          )}
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
        boxShadow: "inset 0 0 24px rgba(0,0,0,0.06)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {imgSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgSrc}
          alt=""
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
          draggable={false}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#c4a882",
            fontSize: 24,
            opacity: 0.3,
          }}
        >
          ⋯
        </div>
      )}
    </div>
  );
});

export const BookFlipReader = forwardRef<BookFlipReaderHandle, BookFlipReaderProps>(
  function BookFlipReader(
    { pdfUrl, pageWidth, pageHeight, sound = true, onPageChange, onProgress },
    ref
  ) {
    const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [pageImages, setPageImages] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [rendered, setRendered] = useState(0);
    const flipBookRef = useRef<unknown>(null);

    /* PDF 로드 */
    useEffect(() => {
      let cancelled = false;
      setLoading(true);
      setLoadError(null);
      setPdf(null);
      setPageImages({});
      setRendered(0);

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

    /* 모든 페이지를 직렬로 이미지 렌더 — 안정적이지만 시간 소요 */
    useEffect(() => {
      if (!pdf) return;
      let cancelled = false;

      (async () => {
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          try {
            const page = await pdf.getPage(i);
            const natural = page.getViewport({ scale: 1 });
            const scale = (pageWidth * (window.devicePixelRatio || 1)) / natural.width;
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement("canvas");
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            const ctx = canvas.getContext("2d");
            if (!ctx) continue;
            await page.render({ canvasContext: ctx, viewport }).promise;
            if (cancelled) return;
            // JPEG 압축 — 메모리 부담 줄임
            const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
            setPageImages((prev) => ({ ...prev, [i]: dataUrl }));
            setRendered((n) => {
              const next = n + 1;
              if (onProgress) onProgress(next, pdf.numPages);
              return next;
            });
          } catch (e) {
            console.error(`[BookFlipReader] page ${i} render failed`, e);
          }
        }
      })();

      return () => { cancelled = true; };
    }, [pdf, pageWidth, onProgress]);

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
    const handleFlip = (e: { data: number }) => {
      if (sound) playPageFlipSound();
      if (onPageChange) onPageChange(e.data, numPages);
    };

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
      <div className="book-flip-wrap" style={{ filter: "drop-shadow(0 30px 50px rgba(0,0,0,0.55))" }}>
        {rendered < numPages && (
          <div className="text-center text-white/40 text-xs mb-3 font-mono">
            페이지 렌더 중 {rendered} / {numPages}
          </div>
        )}
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
          <FlipPage width={pageWidth} height={pageHeight} isCover="front" />
          {Array.from({ length: numPages }, (_, i) => (
            <FlipPage
              key={i + 1}
              width={pageWidth}
              height={pageHeight}
              imgSrc={pageImages[i + 1]}
            />
          ))}
          <FlipPage width={pageWidth} height={pageHeight} isCover="back" />
        </HTMLFlipBook>
      </div>
    );
  }
);
