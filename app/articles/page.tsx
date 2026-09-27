import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "@/data/articles";

export const metadata: Metadata = {
  title: "Articles for Parents | World School Index",
  description: "Practical guides to choosing an international school and making the most of school visits.",
  alternates: { canonical: "https://worldschoolindex.com/articles" },
};

export default function ArticlesPage() {
  return <main>
    <section className="compact-hero"><div className="shell">
      <span className="eyebrow light">For parents</span>
      <h1>Articles</h1>
      <p>Thoughtful questions. Practical guidance. A clearer picture of school life.</p>
    </div></section>
    <section className="section shell article-list" aria-label="Articles for parents">
      {articles.map((article, index) => <article className="article-preview" key={article.slug}>
        <span className="eyebrow">Parent guide · {String(index + 1).padStart(2, "0")}</span>
        <h2><Link href={`/articles/${article.slug}`}>{article.title}</Link></h2>
        <p>{article.description}</p>
        <Link className="text-link" href={`/articles/${article.slug}`}>Read article →</Link>
      </article>)}
    </section>
  </main>;
}

