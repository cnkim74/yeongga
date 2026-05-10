"use client";

import { useState, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface EbookReaderProps {
  pdfUrl: string;
  title: string;
}

export function EbookReader({ pdfUrl, title }: EbookReaderProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);
  const [inputPage, setInputPage] = useState("1");

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    setLoadError(error.message);
    setLoading(false);
  }

  function goToPrev() {
    const next = Math.max(1, pageNumber - 1);
    setPageNumber(next);
    setInputPage(String(next));
  }

  function goToNext() {
    const next = Math.min(numPages, pageNumber + 1);
    setPageNumber(next);
    setInputPage(String(next));
  }

  function zoomIn() {
    setScale((s) => Math.min(2.0, parseFloat((s + 0.1).toFixed(1))));
  }

  function zoomOut() {
    setScale((s) => Math.max(0.5, parseFloat((s - 0.1).toFixed(1))));
  }

  function resetZoom() {
    setScale(1.0);
  }

  function handlePageInput(e: React.ChangeEvent<HTMLInputElement>) {
    setInputPage(e.target.value);
  }

  function handlePageInputCommit(e: React.KeyboardEvent | React.FocusEvent) {
    if ("key" in e && e.key !== "Enter") return;
    const n = parseInt(inputPage, 10);
    if (!isNaN(n) && n >= 1 && n <= numPages) {
      setPageNumber(n);
    } else {
      setInputPage(String(pageNumber));
    }
  }

  // 페이지 너비 계산: 컨테이너 너비 * scale (단 최소 300, 최대 1000)
  const pageWidth = containerWidth
    ? Math.min(1000, Math.max(300, containerWidth * scale))
    : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-gray-800">
      {/* 상단 툴바 */}
      <div className="sticky top-0 z-10 bg-gray-900 text-white flex items-center gap-2 px-4 py-2.5 shadow-md flex-wrap">
        {/* 제목 (왼쪽) */}
        <span className="text-sm font-medium text-gray-300 truncate max-w-[180px] sm:max-w-xs">
          {title}
        </span>

        <div className="flex-1" />

        {/* 페이지 네비게이션 */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToPrev}
            disabled={pageNumber <= 1}
            className="px-2.5 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="이전 페이지"
          >
            ← 이전
          </button>

          <div className="flex items-center gap-1 mx-1">
            <input
              type="text"
              value={inputPage}
              onChange={handlePageInput}
              onKeyDown={handlePageInputCommit}
              onBlur={handlePageInputCommit}
              className="w-10 text-center rounded bg-gray-700 text-white text-sm py-0.5 border border-gray-600 focus:outline-none focus:border-gray-400"
              aria-label="페이지 번호"
            />
            <span className="text-gray-400 text-sm">/ {numPages || "—"}</span>
          </div>

          <button
            type="button"
            onClick={goToNext}
            disabled={pageNumber >= numPages}
            className="px-2.5 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="다음 페이지"
          >
            다음 →
          </button>
        </div>

        {/* 줌 */}
        <div className="flex items-center gap-1 ml-2">
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="w-7 h-7 rounded text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-40 transition flex items-center justify-center"
            aria-label="축소"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="px-2 py-0.5 rounded text-xs bg-gray-700 hover:bg-gray-600 transition tabular-nums min-w-[42px] text-center"
            aria-label="원래 크기"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= 2.0}
            className="w-7 h-7 rounded text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-40 transition flex items-center justify-center"
            aria-label="확대"
          >
            ＋
          </button>
        </div>
      </div>

      {/* PDF 뷰어 영역 */}
      <div
        ref={containerRef}
        className="flex-1 flex items-start justify-center px-4 py-8 overflow-x-auto"
      >
        {loadError ? (
          <div className="text-white text-center mt-20">
            <div className="text-4xl mb-4">⚠️</div>
            <div className="text-base font-medium mb-2">PDF를 불러올 수 없습니다</div>
            <div className="text-sm text-gray-400">{loadError}</div>
          </div>
        ) : (
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-800">
                <div className="text-white text-center">
                  <div className="mb-3 text-3xl animate-pulse">📖</div>
                  <div className="text-sm text-gray-400">PDF 불러오는 중...</div>
                </div>
              </div>
            )}
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
            >
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                className="shadow-2xl"
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        )}
      </div>

      {/* 하단 슬라이더 */}
      {numPages > 1 && (
        <div className="bg-gray-900 px-6 py-3 flex items-center gap-3">
          <span className="text-gray-500 text-xs tabular-nums w-4 text-right">1</span>
          <input
            type="range"
            min={1}
            max={numPages}
            value={pageNumber}
            onChange={(e) => {
              const n = Number(e.target.value);
              setPageNumber(n);
              setInputPage(String(n));
            }}
            className="flex-1 accent-white"
            aria-label="페이지 슬라이더"
          />
          <span className="text-gray-500 text-xs tabular-nums">{numPages}</span>
        </div>
      )}
    </div>
  );
}
