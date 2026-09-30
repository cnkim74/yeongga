import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { ArticleMeta, Article, Visibility } from "./articles-db";
import { looksLikeHTML, looksLikeWrappedMarkdown, renderMarkdown, unwrapMarkdown } from "./markdown";

/**
 * 데이터베이스가 잠시 응답하지 않을 때 쓰는 예비 읽기.
 *
 * 글 본문은 저장소의 content/articles/<장>/<슬러그>.md 에 그대로 들어 있다.
 * 데이터베이스를 못 읽는 동안에는 이 파일을 읽어 글을 보여 준다.
 * 지운 글은 파일도 함께 지웠으므로, 여기서 되살아날 일은 없다.
 *
 * 집무실에서 고친 뒤 파일에 반영하지 않은 글은 파일의 옛 내용이 보인다.
 * 데이터베이스가 돌아오면 저절로 원래대로 돌아간다.
 */

const ARTICLES_DIR = path.join(process.cwd(), "content", "articles");

/** 파일에는 id 가 없다. 장·슬러그로 일정한 음수 id 를 만들어 쓴다. */
function fakeId(chapter: string, slug: string): number {
  let h = 0;
  const key = `${chapter}/${slug}`;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return -Math.abs(h || 1);
}

function toVisibility(raw: unknown): Visibility {
  const v = String(raw ?? "public").toLowerCase();
  return v === "members-only" || v === "members" || v === "private"
    ? "members-only"
    : "public";
}

type Parsed = { meta: ArticleMeta; body: string };

function parseFile(chapter: string, slug: string, raw: string): Parsed {
  const { data, content } = matter(raw);
  const date = String(data.date ?? "1970-01-01");
  return {
    meta: {
      id: fakeId(chapter, slug),
      chapter,
      slug,
      title: String(data.title ?? slug),
      subtitle: data.subtitle ? String(data.subtitle) : null,
      author: data.author ? String(data.author) : null,
      excerpt: data.excerpt ? String(data.excerpt) : null,
      cover: data.cover ? String(data.cover) : null,
      date,
      visibility: toVisibility(data.visibility),
      created_at: date,
      updated_at: date,
    },
    body: content,
  };
}

/** 한 장(章)의 글 목록. 장을 비우면 전체. 최신순. */
export function listArticlesFromFiles(chapter?: string): ArticleMeta[] {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  const out: ArticleMeta[] = [];
  const chapters = chapter
    ? [chapter]
    : fs.readdirSync(ARTICLES_DIR).filter((d) => {
        try {
          return fs.statSync(path.join(ARTICLES_DIR, d)).isDirectory();
        } catch {
          return false;
        }
      });
  for (const ch of chapters) {
    const dir = path.join(ARTICLES_DIR, ch);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".md")) continue;
      const slug = file.replace(/\.md$/, "");
      try {
        const raw = fs.readFileSync(path.join(dir, file), "utf8");
        out.push(parseFile(ch, slug, raw).meta);
      } catch {
        // 한 글을 못 읽어도 나머지는 보여 준다
      }
    }
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
  return out;
}

/** 글 한 편. 본문은 마크다운을 HTML 로 그려서 돌려준다. */
export async function getArticleFromFiles(
  chapter: string,
  slug: string
): Promise<Article | null> {
  const file = path.join(ARTICLES_DIR, chapter, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  let parsed: Parsed;
  try {
    parsed = parseFile(chapter, slug, fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
  const body = parsed.body;
  const html = looksLikeWrappedMarkdown(body)
    ? await renderMarkdown(unwrapMarkdown(body))
    : looksLikeHTML(body)
      ? body
      : await renderMarkdown(body);
  return { ...parsed.meta, body, html };
}
