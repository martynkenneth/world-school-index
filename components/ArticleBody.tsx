import { Fragment } from "react";

export function sectionId(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// This intentionally supports only the Markdown used in our editorial articles.
// Content is rendered as React text, never injected as raw HTML.
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const safe = /^(https:\/\/|\/(?!\/))/.test(link[2]);
      return safe ? <a key={index} href={link[2]}>{link[1]}</a> : <Fragment key={index}>{link[1]}</Fragment>;
    }
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function ArticleBody({ content }: { content: string }) {
  const blocks = content.replace(/\r/g, "").trim().split(/\n\s*\n/).filter((block) => !block.startsWith("# "));
  return <div className="article-prose">{blocks.map((block, index) => {
    if (block.startsWith("## ")) {
      const heading = block.slice(3);
      return <h2 key={index} id={sectionId(heading)}>{heading}</h2>;
    }
    const lines = block.split("\n");
    if (lines.every((line) => line.startsWith("|"))) {
      const rows = lines.map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
      return <div className="article-table" key={index} role="region" aria-label="School comparison checklist" tabIndex={0}>
        <table><thead><tr>{rows[0].map((cell, i) => <th scope="col" key={i}>{inline(cell)}</th>)}</tr></thead>
          <tbody>{rows.slice(2).map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{inline(cell)}</td>)}</tr>)}</tbody>
        </table>
      </div>;
    }
    if (lines.every((line) => /^- /.test(line))) return <ul key={index}>{lines.map((line, i) => <li key={i}>{inline(line.slice(2))}</li>)}</ul>;
    if (lines.every((line) => /^\d+\. /.test(line))) return <ol key={index}>{lines.map((line, i) => <li key={i}>{inline(line.replace(/^\d+\. /, ""))}</li>)}</ol>;
    return <p className={block.startsWith("**A useful question:**") ? "article-question" : undefined} key={index}>{inline(lines.join(" "))}</p>;
  })}</div>;
}

