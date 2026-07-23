export const metadata = {
  title: "Crawler Policy | World School Index",
  description: "How the World School Index source crawler accesses official school websites.",
};

export default function CrawlerPolicyPage() {
  return (
    <main>
      <section className="compact-hero">
        <div className="shell narrow">
          <span className="eyebrow light">Crawler policy</span>
          <h1>Responsible source retrieval</h1>
          <p>Operational limits used when primary-source pages are fetched for verification.</p>
        </div>
      </section>
      <section className="section shell narrow prose-page">
        <h2>Identification</h2>
        <p><code>WorldSchoolIndexBot/1.0</code> identifies every automated request and links back to this policy.</p>
        <h2>Access controls</h2>
        <ol>
          <li><code>robots.txt</code> is checked before any source page is requested.</li>
          <li>Requests are limited to one every three seconds per domain, or a slower published crawl delay.</li>
          <li>No more than three school domains are contacted concurrently.</li>
          <li>Blocked, unreachable, and unsuccessful requests are recorded explicitly.</li>
        </ol>
        <h2>Purpose</h2>
        <p>Fetched pages are used to verify structured school fields and retain an auditable local source cache. Unsupported fields remain null.</p>
      </section>
    </main>
  );
}
