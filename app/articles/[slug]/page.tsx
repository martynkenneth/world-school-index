import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/data/articles";
import { ArticleBody, sectionId } from "@/components/ArticleBody";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return articles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = articles.find((item) => item.slug === slug);
  if (!article) notFound();
  return {
    title: `${article.title} | World School Index`,
    description: article.description,
    alternates: { canonical: `https://worldschoolindex.com/articles/${article.slug}` },
    openGraph: { title: article.title, description: article.description, type: "article" },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = articles.find((item) => item.slug === slug);
  if (!article) notFound();
  const headings = article.content.replace(/\r/g, "").split("\n").filter((line) => line.startsWith("## ")).map((line) => line.slice(3));
  return <main>
    <header className="article-hero shell">
      <Link className="text-link" href="/articles">← All articles</Link>
      <span className="eyebrow">A guide for parents</span>
      <h1>{article.title}</h1>
    </header>
    <div className={`shell article-layout${headings.length ? "" : " article-short"}`}>
      {headings.length > 0 ? <aside className="article-contents">
        <nav aria-label="In this article">
          <span className="eyebrow">In this article</span>
          <ol>{headings.map((heading) => <li key={heading}><a href={`#${sectionId(heading)}`}>{heading}</a></li>)}</ol>
        </nav>
      </aside> : null}
      <article aria-label={article.title}>
        <ArticleBody content={article.content} />
        <div className="article-end"><span className="eyebrow">Keep exploring</span>
          {articles.filter((item) => item.slug !== slug).map((item) => <p key={item.slug}><Link href={`/articles/${item.slug}`}>{item.title} →</Link></p>)}
          <Link className="text-link" href="/countries/vietnam">Explore school profiles →</Link>
        </div>
      </article>
    </div>
  </main>;
}
