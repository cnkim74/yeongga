import { Node } from "@tiptap/core";

export type OrnamentStyle = "line" | "dots" | "diamond" | "asterism" | "wave";

const TEXTS: Record<OrnamentStyle, string> = {
  line: "─────",
  dots: "·  ·  ·",
  diamond: "◆  ◆  ◆",
  asterism: "※  ※  ※",
  wave: "～  ～  ～",
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    ornament: {
      insertOrnament: (style: OrnamentStyle) => ReturnType;
    };
  }
}

// 본문 사이에 넣는 장식 구분선·점 등. 단순한 atom 블록.
export const Ornament = Node.create({
  name: "ornament",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      style: {
        default: "line" as OrnamentStyle,
        parseHTML: (el) =>
          (el.getAttribute("data-style") as OrnamentStyle) ?? "line",
        renderHTML: (attrs) => ({ "data-style": attrs.style }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='ornament']" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const style = (node.attrs.style ?? "line") as OrnamentStyle;
    return [
      "div",
      {
        ...HTMLAttributes,
        "data-type": "ornament",
        "data-style": style,
        class: `ornament ornament-${style}`,
      },
      TEXTS[style] ?? TEXTS.line,
    ];
  },

  addCommands() {
    return {
      insertOrnament:
        (style) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { style },
          }),
    };
  },
});
