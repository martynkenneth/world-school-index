export type DiscoverySource = {
  id: string;
  name: string;
  url: string;
  authority: "curriculum" | "accreditor" | "association" | "government";
  geographicScope: string;
  useFor: string[];
  reviewCadenceDays: number;
};

export const globalSourceRegistry: DiscoverySource[] = [
  {
    id: "isat-member-schools",
    name: "International Schools Association of Thailand member directory",
    url: "https://www.isat.or.th/search",
    authority: "association",
    geographicScope: "Thailand",
    useFor: ["candidate discovery", "operating and licence screening"],
    reviewCadenceDays: 90,
  },
  {
    id: "ib-world-schools",
    name: "International Baccalaureate World School directory",
    url: "https://www.ibo.org/programmes/find-an-ib-school/",
    authority: "curriculum",
    geographicScope: "Global",
    useFor: ["candidate discovery", "programme authorization"],
    reviewCadenceDays: 180,
  },
  {
    id: "cambridge-schools",
    name: "Cambridge International school directory",
    url: "https://www.cambridgeinternational.org/why-choose-us/find-a-cambridge-school/",
    authority: "curriculum",
    geographicScope: "Global",
    useFor: ["candidate discovery", "programme registration"],
    reviewCadenceDays: 180,
  },
  {
    id: "cis-members",
    name: "Council of International Schools membership directory",
    url: "https://www.cois.org/header-portals-microsite-membership-directory",
    authority: "association",
    geographicScope: "Global",
    useFor: ["candidate discovery", "membership verification"],
    reviewCadenceDays: 180,
  },
  {
    id: "cobis-members",
    name: "Council of British International Schools directory",
    url: "https://www.cobis.org.uk/our-network/search-for-cobis-members/cobis-school-search",
    authority: "association",
    geographicScope: "Global",
    useFor: ["candidate discovery", "membership verification"],
    reviewCadenceDays: 180,
  },
  {
    id: "neasc-schools",
    name: "NEASC directory of accredited and candidate schools",
    url: "https://www.neasc.org/school-directory",
    authority: "accreditor",
    geographicScope: "Global",
    useFor: ["candidate discovery", "accreditation verification"],
    reviewCadenceDays: 180,
  },
  {
    id: "wasc-schools",
    name: "Accrediting Commission for Schools, WASC",
    url: "https://acswasc.org/",
    authority: "accreditor",
    geographicScope: "Global",
    useFor: ["accreditation verification"],
    reviewCadenceDays: 180,
  },
  {
    id: "uk-bso",
    name: "UK Government British Schools Overseas register",
    url: "https://www.gov.uk/government/publications/british-schools-overseas-inspection-reports",
    authority: "government",
    geographicScope: "Global",
    useFor: ["candidate discovery", "inspection and registration verification"],
    reviewCadenceDays: 90,
  },
];
