"use client";

import { useMemo, useState } from "react";
import type { School } from "@/data/schools";
import { SchoolCard } from "./SchoolCard";

export function DirectoryExplorer({ schools }: { schools: School[] }) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("All cities");
  const [curriculum, setCurriculum] = useState("All curricula");

  const cities = ["All cities", ...Array.from(new Set(schools.map((s) => s.city))).sort()];
  const curricula = [
    "All curricula",
    ...Array.from(new Set(schools.flatMap((s) => s.curricula))).sort(),
  ];

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return schools.filter((school) => {
      const matchesQuery = !normalized || [
        school.name,
        school.shortName,
        school.city,
        school.language,
        ...school.curricula,
      ].join(" ").toLowerCase().includes(normalized);
      const matchesCity = city === "All cities" || school.city === city;
      const matchesCurriculum =
        curriculum === "All curricula" || school.curricula.includes(curriculum);
      return matchesQuery && matchesCity && matchesCurriculum;
    });
  }, [schools, query, city, curriculum]);

  return (
    <section className="directory-explorer" aria-labelledby="directory-heading">
      <div className="directory-heading-row">
        <div>
          <span className="eyebrow">Verified seed directory</span>
          <h2 id="directory-heading">Explore schools in Vietnam</h2>
        </div>
        <p><strong>{filtered.length}</strong> of {schools.length} records</p>
      </div>
      <div className="filters" role="search">
        <label className="search-field">
          <span>Search schools</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, city, curriculum…"
          />
        </label>
        <label>
          <span>City</span>
          <select value={city} onChange={(event) => setCity(event.target.value)}>
            {cities.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Curriculum</span>
          <select value={curriculum} onChange={(event) => setCurriculum(event.target.value)}>
            {curricula.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      {filtered.length ? (
        <div className="school-grid">
          {filtered.map((school) => <SchoolCard key={school.slug} school={school} />)}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No schools match those filters</h3>
          <p>Try a broader search or reset one of the dropdowns.</p>
        </div>
      )}
    </section>
  );
}
