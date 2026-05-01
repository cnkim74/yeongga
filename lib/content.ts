import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { chapters, getChapter, type Chapter } from "./chapters";

export type Visibility = "public" | "members-only";

export type ArticleMeta = {
  slug: string;
  chapter: string;
  title: string;
  subtitle?: string;
  date: string; // ISO
  author?: string;
  excerpt?: string;
  cover?: string;
  visibility: Visibility;
};

export type Article = ArticleMeta & {
  html: string;
  raw: string;
};

const CONTENT_DIR = path.join(process.cwd(), "content", "articles");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function listMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".md"))
    .map((d) => d.name);
}

function readArticleFile(chapterSlug: string, fileName: string): Article {
  const filePath = path.join(CONTENT_DIR, chapterSlug, fileName);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const slug = fileName.replace(/\.md$/, "");

  const v = String(data.visibility ?? "public").toLowerCase();
  const visibility: Visibility =
    v === "members-only" || v === "members" || v === "private"
      ? "members-only"
      : "public";

  return {
    slug,
    chapter: chapterSlug,
    title: (data.title as string) ?? slug,
    subtitle: data.subtitle as string | undefined,
    date: (data.date as string) ?? "1970-01-01",
    author: data.author as string | undefined,
    excerpt: data.excerpt as string | undefined,
    cover: data.cover as string | undefined,
    visibility,
    html: "", // filled below if requested
    raw: content,
  };
}

export function getChapterArticles(chapterSlug: string): ArticleMeta[] {
  const dir = path.join(CONTENT_DIR, chapterSlug);
  const files = listMarkdownFiles(dir);
  const articles = files.map((f) => readArticleFile(chapterSlug, f));
  return articles
    .map(({ html: _h, raw: _r, ...meta }) => meta)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getAllArticles(): ArticleMeta[] {
  ensureDir(CONTENT_DIR);
  return chapters
    .flatMap((c) => getChapterArticles(c.slug))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getArticle(
  chapterSlug: string,
  slug: string
): Promise<Article | null> {
  const fileName = `${slug}.md`;
  const filePath = path.join(CONTENT_DIR, chapterSlug, fileName);
  if (!fs.existsSync(filePath)) return null;

  const article = readArticleFile(chapterSlug, fileName);
  const processed = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(article.raw);

  article.html = String(processed);
  return article;
}

export function getChapterMeta(slug: string): Chapter | undefined {
  return getChapter(slug);
}

export { chapters };
