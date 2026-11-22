import { Node } from "@tiptap/core";

// 카드 틀(<div class="ygpr-…">·<div class="ygcl-…">)을 편집·저장해도 지우지 않고 클래스째 보존한다.
// 역대 회장 페이지(ygpr-)의 스타일은 app/globals.css 가 맡는다.
export const ClassBlock = Node.create({
  name: "classBlock",
  group: "block",
  content: "block*",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (el) => el.getAttribute("class"),
        renderHTML: (attrs) => (attrs.class ? { class: attrs.class } : {}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div",
        priority: 60,
        getAttrs: (el) => (/(^|\s)yg(cl|pr)-/.test((el as HTMLElement).className) ? null : false),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes, 0];
  },
});
