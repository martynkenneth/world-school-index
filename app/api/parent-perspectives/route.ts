import { createParentPerspective, countRecentParentSubmissions } from "@/db/parent-perspectives";
import { getSchool } from "@/data/schools";
import { validateParentPerspectiveInput } from "@/lib/parent-perspectives";

export async function POST(request: Request) {
  const form = await request.formData();
  const result = validateParentPerspectiveInput({
    schoolSlug: form.get("schoolSlug"),
    relationship: form.get("relationship"),
    yearGroup: form.get("yearGroup"),
    attendancePeriod: form.get("attendancePeriod"),
    topics: form.getAll("topics"),
    comment: form.get("comment"),
    parentEmail: form.get("parentEmail"),
    consentToPublish: form.get("consentToPublish"),
    website: form.get("website"),
  });

  const fallbackSlug = String(form.get("schoolSlug") ?? "");
  if (!result.ok) {
    const state = result.isHoneypot ? "submitted" : "invalid";
    return redirectToSchool(request, fallbackSlug, state);
  }

  const school = getSchool(result.value.schoolSlug);
  if (!school) return redirectToSchool(request, fallbackSlug, "invalid");

  try {
    if (await countRecentParentSubmissions(result.value.parentEmail) >= 3) {
      return redirectToSchool(request, school.slug, "rate-limited");
    }
    await createParentPerspective(result.value);
    return redirectToSchool(request, school.slug, "submitted");
  } catch {
    return redirectToSchool(request, school.slug, "unavailable");
  }
}

function redirectToSchool(request: Request, slug: string, state: string): Response {
  const safeSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : "";
  const target = new URL(safeSlug ? `/schools/${safeSlug}` : "/", request.url);
  target.searchParams.set("parent_perspective", state);
  target.hash = "parent-perspectives";
  return Response.redirect(target, 303);
}
