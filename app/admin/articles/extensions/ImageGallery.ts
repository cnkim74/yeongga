import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageGalleryView } from "../ImageGalleryView";

export type GalleryImage = {
  src: string;
  alt?: string;
  caption?: string | null;
};

export type GalleryLayout =
  | "row-2"
  | "row-3"
  | "row-4"
  | "grid-2"
  | "grid-3"
  | "stack";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageGallery: {
      insertImageGallery: (input: {
        images: GalleryImage[];
        layout?: GalleryLayout;
      }) => ReturnType;
    };
  }
}

// 여러 이미지를 묶어 한 줄/그리드로 보여 주는 노드.
// images 배열은 data-images JSON 속성으로 보존.
export const ImageGallery = Node.create({
  name: "imageGallery",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      images: {
        default: [] as GalleryImage[],
        parseHTML: (el) => {
          const raw = el.getAttribute("data-images");
          if (!raw) return [];
          try {
            return JSON.parse(raw);
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => ({
          "data-images": JSON.stringify(attrs.images ?? []),
        }),
      },
      layout: {
        default: "row-2" as GalleryLayout,
        parseHTML: (el) => el.getAttribute("data-layout") ?? "row-2",
        renderHTML: (attrs) => ({ "data-layout": attrs.layout }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='image-gallery']" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const images = (node.attrs.images ?? []) as GalleryImage[];
    const layout = node.attrs.layout as GalleryLayout;

    const items = images.map((img) => {
      const fig: (string | object | unknown[])[] = [
        "figure",
        { class: "gallery-item" },
        ["img", { src: img.src, alt: img.alt ?? "" }],
      ];
      if (img.caption) fig.push(["figcaption", {}, img.caption]);
      return fig;
    });

    return [
      "div",
      {
        ...HTMLAttributes,
        "data-type": "image-gallery",
        "data-layout": layout,
        "data-images": JSON.stringify(images),
        class: `image-gallery layout-${layout}`,
      },
      ...items,
    ];
  },

  addCommands() {
    return {
      insertImageGallery:
        ({ images, layout = "row-2" }) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { images, layout },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageGalleryView);
  },
});
