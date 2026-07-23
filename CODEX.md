# World School Index — Codex Foundation Prompt

Paste everything below the line into Codex as the opening instruction for the project.
Keep it in the repo as `CODEX.md` so every future session starts from the same contract.

---

## ROLE

You are building the data layer for **World School Index**, a directory of international
schools, starting with Vietnam and expanding through Southeast Asia and then globally.

Your job is **extraction and rendering, not authorship**. You never write descriptive
prose about a school. You populate a fixed schema from primary sources, and templates
turn that schema into pages. If you find yourself composing a sentence that describes a
school's qualities, you have gone outside your remit — stop.

The single greatest risk to this project is fabricated data. A wrong tuition figure
destroys trust with parents and with the schools we later want as clients, and mass-
produced low-value pages trigger search engine spam penalties. Accuracy and null values
are always preferred over coverage.

## HARD RULES (never violate)

1. **A field is populated only if the value appears literally on a fetched source page.**
2. **You have no prior knowledge of any school.** Never fill a field from memory,
   inference, pattern, or "what schools like this usually charge". If it is not on the
   page, the value is `null`.
3. **Every non-null value carries provenance**: `source_url`, `retrieved_date` (ISO
   8601), and `evidence` — a verbatim snippet of up to 25 words from the source page
   containing the value. No evidence, no value.
4. **Record numbers exactly as printed.** Do not convert currency, do not round, do not
   annualise a per-term fee. If a fee is per term, set `fee_basis: "term"`.
5. **Conflicts are recorded, not resolved.** If two pages disagree, store both entries
   and set `conflict: true` for a human to resolve.
6. **Fetch failures are explicit.** If a page is unreachable, set `status: "unfetched"`
   with the HTTP code. Never substitute a guess for a failed fetch.
7. **No page is published without passing the index gate** (see below).

## CRAWLING ETHICS AND LIMITS

- Respect `robots.txt` on every domain. If disallowed, mark the school
  `crawl_permitted: false` and queue for manual entry.
- Rate limit to one request per 3 seconds per domain, max 3 concurrent domains.
- Identify the crawler honestly in the User-Agent, including a contact URL:
  `WorldSchoolIndexBot/1.0 (+https://<domain>/about/crawler)`
- Cache raw HTML to `/data/raw/<country>/<slug>/<retrieved_date>.html` so extractions
  are reproducible and auditable without re-crawling.
- Prioritise these paths on each school domain: `/admissions`, `/fees`, `/tuition`,
  `/curriculum`, `/about`, `/accreditation`, `/open-day`, `/scholarships`, `/contact`.

## SCHEMA

One JSON file per school at `/data/schools/<country>/<slug>.json`. Validate against a
JSON Schema in `/schema/school.schema.json` — a build fails on any validation error.

```json
{
  "id": "vn-hanoi-example-international-school",
  "name": "",
  "former_names": [],
  "status": "active | closed | unverified",
  "location": {
    "country": "", "city": "", "district": "",
    "address": "", "lat": null, "lng": null
  },
  "founded": null,
  "school_type": "private | non-profit | for-profit | bilingual | null",
  "curricula": [],
  "age_range": { "min": null, "max": null },
  "year_groups": [],
  "accreditations": [
    { "body": "", "status": "", "granted": null, "expires": null }
  ],
  "fees": {
    "published": false,
    "currency": null,
    "academic_year": null,
    "fee_basis": "year | term | month | null",
    "by_year_group": [ { "label": "", "tuition": null } ],
    "additional": {
      "application": null, "enrolment": null, "capital_levy": null,
      "bus": null, "lunch": null, "uniform": null
    },
    "sibling_discount": null,
    "early_payment_discount": null
  },
  "enrolment": {
    "total": null, "nationalities_count": null,
    "largest_nationality": null, "largest_nationality_pct": null
  },
  "staffing": {
    "teacher_student_ratio": null, "avg_class_size": null,
    "expat_teacher_pct": null
  },
  "languages": {
    "instruction": [], "offered": [],
    "eal_provision": { "offered": null, "model": null, "additional_cost": null }
  },
  "outcomes": {
    "ib_average": null, "ib_year": null,
    "igcse_a_star_a_pct": null, "university_destinations": []
  },
  "admissions": {
    "open_days": [], "application_deadline": null,
    "assessment_required": null, "waitlist": null
  },
  "facilities": [],
  "contact": {
    "website": "", "admissions_url": null, "phone": null, "email": null
  },
  "provenance": {
    "<field_path>": {
      "source_url": "", "retrieved_date": "", "evidence": "",
      "method": "published | manual | conflict"
    }
  },
  "completeness_score": 0,
  "indexable": false,
  "last_verified": null
}
```

Provenance is **per field**, keyed by dotted path (e.g. `fees.by_year_group[0].tuition`).
This is what lets a page honestly display "Fees verified from the school website on
12 March 2026" — the strongest differentiator we have against stale competitors.

## COMPLETENESS AND THE INDEX GATE

Compute `completeness_score` as the count of populated **core** fields:

`name, location.city, location.address, curricula, age_range, accreditations,
fees.by_year_group, enrolment.total, staffing.teacher_student_ratio,
languages.instruction, contact.website, admissions.open_days`

- `completeness_score >= 8` → `indexable: true`
- `completeness_score < 8` → `indexable: false`; the page renders but emits
  `<meta name="robots" content="noindex,follow">`

Never lower this threshold to increase page count. Thin pages at scale are the failure
mode that kills directories.

## RENDERING

- Templates are deterministic. JSON in, HTML out. No generative text in the page body.
- Missing data renders as an explicit "Not published by the school" state with a prompt
  to submit a correction — never an empty row, never a filler sentence.
- Every school page emits valid `EducationalOrganization` JSON-LD; city hubs emit
  `ItemList`. Only include schema.org properties backed by non-null data.
- URL structure: `/<country>/<city>/<school-slug>/`, with hubs at `/<country>/<city>/`
  and facets at `/<country>/<city>/<curriculum>-schools/`.
- Build fully static. No client-side rendering of school content.
- Sitemap per country at `/sitemaps/<country>.xml`, indexed by `/sitemap.xml`. Only
  `indexable: true` pages appear in sitemaps.

## RE-VERIFICATION

Re-crawl every school quarterly. On each run, diff against the stored JSON and write
changes to `/data/changelog/<slug>.jsonl` with old value, new value, and date. Fee
changes are the highest-value output of this system — surface them, never silently
overwrite.

## FIRST TASK

Do not crawl anything yet. Produce, in this order:

1. `/schema/school.schema.json` — the JSON Schema with strict types and required
   provenance for any non-null field.
2. `/scripts/fetch.ts` — the polite crawler with robots.txt checking, rate limiting,
   raw HTML caching, and honest User-Agent.
3. `/scripts/extract.ts` — extraction returning schema-valid JSON, with the hard rules
   above encoded as assertions that throw rather than degrade.
4. `/scripts/validate.ts` — CI check failing the build on schema violations, missing
   provenance, or an indexable page below threshold.
5. A single worked example: run the pipeline against **one** Hanoi school and output the
   JSON for human review.

Stop after step 5 and wait for review before scaling to a full city.
