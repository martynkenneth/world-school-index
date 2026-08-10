import { getChatGPTUser } from "@/app/chatgpt-auth";
import { moderateParentPerspective } from "@/db/parent-perspectives";
import { isParentPerspectiveModerator } from "@/lib/parent-perspective-moderators";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user || !(await isParentPerspectiveModerator(user.email))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const id = String(form.get("id") ?? "").trim();
  const status = String(form.get("status") ?? "").trim();
  const moderationNote = String(form.get("moderationNote") ?? "").trim().slice(0, 500);

  if (!id || (status !== "approved" && status !== "rejected")) {
    return Response.json({ error: "Invalid moderation request" }, { status: 400 });
  }

  await moderateParentPerspective(id, status, user.email, moderationNote);
  return Response.redirect(new URL("/parent-perspectives/moderate?updated=1", request.url), 303);
}
