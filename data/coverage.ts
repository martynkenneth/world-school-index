export type CoverageStage = "published" | "research" | "queued";

export type CountryCoverage = {
  name: string;
  slug: string;
  code: string;
  region: string;
  stage: CoverageStage;
  stageLabel: string;
  nextStep: string;
  wave: number;
};

export const countryCoverage: CountryCoverage[] = [
  { name: "Vietnam", slug: "vietnam", code: "VN", region: "Southeast Asia", stage: "published", stageLabel: "Published · expanding", nextStep: "Complete the national candidate inventory and secondary-city review.", wave: 0 },
  { name: "Thailand", slug: "thailand", code: "TH", region: "Southeast Asia", stage: "published", stageLabel: "Published · expanding", nextStep: "Expand the national candidate inventory beyond the first major-city collection.", wave: 1 },
  { name: "Singapore", slug: "singapore", code: "SG", region: "Southeast Asia", stage: "research", stageLabel: "Research next", nextStep: "Reconcile regulator, curriculum and accreditation directories.", wave: 1 },
  { name: "Malaysia", slug: "malaysia", code: "MY", region: "Southeast Asia", stage: "queued", stageLabel: "Queued", nextStep: "Prepare source registry and city coverage map.", wave: 2 },
  { name: "Cambodia", slug: "cambodia", code: "KH", region: "Southeast Asia", stage: "queued", stageLabel: "Queued", nextStep: "Prepare source registry and city coverage map.", wave: 2 },
  { name: "Indonesia", slug: "indonesia", code: "ID", region: "Southeast Asia", stage: "queued", stageLabel: "Queued", nextStep: "Prepare source registry and city coverage map.", wave: 2 },
  { name: "Philippines", slug: "philippines", code: "PH", region: "Southeast Asia", stage: "queued", stageLabel: "Queued", nextStep: "Prepare source registry and city coverage map.", wave: 2 },
  { name: "Brunei", slug: "brunei", code: "BN", region: "Southeast Asia", stage: "queued", stageLabel: "Queued", nextStep: "Prepare source registry and candidate inventory.", wave: 3 },
  { name: "Laos", slug: "laos", code: "LA", region: "Southeast Asia", stage: "queued", stageLabel: "Queued", nextStep: "Prepare source registry and candidate inventory.", wave: 3 },
  { name: "Myanmar", slug: "myanmar", code: "MM", region: "Southeast Asia", stage: "queued", stageLabel: "Queued", nextStep: "Prepare source registry and candidate inventory.", wave: 3 },
  { name: "Timor-Leste", slug: "timor-leste", code: "TL", region: "Southeast Asia", stage: "queued", stageLabel: "Queued", nextStep: "Prepare source registry and candidate inventory.", wave: 3 },
];

export const coverageSummary = {
  totalCountries: countryCoverage.length,
  published: countryCoverage.filter((country) => country.stage === "published").length,
  researching: countryCoverage.filter((country) => country.stage === "research").length,
  queued: countryCoverage.filter((country) => country.stage === "queued").length,
};
