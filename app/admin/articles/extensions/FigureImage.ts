import Image from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";

// 본문 안에 들어가는 이미지 — figure/figcaption 으로 감싸 정렬/크기/캡션 메타를
// HTML 속성으로 보존하고, 공개 페이지에서 CSS로 그대로 렌더한다.
export const FigureImage = Image.extend({
  name: "image",

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      align: { default: "center" }, // left | center | right
      width: { default: "medium" }, // small | medium | large | full
      caption: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-type='image']",
        getAttrs: (el) => {
          const node = el as HTMLElement;
          const img = node.querySelector("img");
          const cap = node.querySelector("figcaption");
          return {
            src: img?.getAttribute("src"),
            alt: img?.getAttribute("alt") ?? null,
            title: img?.getAttribute("title") ?? null,
            align: node.getAttribute("data-align") ?? "center",
            width: node.getAttribute("data-width") ?? "medium",
            caption: cap?.textContent ?? null,
          };
        },
      },
      // 마이그레이션·구버전 호환: 단순 <img>도 받음
      {
        tag: "img[src]",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, alt, title, align, width, caption } = node.attrs;
    const figureAttrs = {
      "data-type": "image",
      "data-align": align,
      "data-width": width,
      class: `article-figure align-${align} size-${width}`,
    };
    const imgAttrs = mergeAttributes(HTMLAttributes, {
      src,
      alt: alt ?? "",
      title: title ?? undefined,
    });
    if (caption) {
      return [
        "figure",
        figureAttrs,
        ["img", imgAttrs],
        ["figcaption", {}, caption],
      ];
    }
    return ["figure", figureAttrs, ["img", imgAttrs]];
  },
});
