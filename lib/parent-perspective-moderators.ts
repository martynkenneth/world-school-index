export async function isParentPerspectiveModerator(email: string): Promise<boolean> {
  const { env } = await import("cloudflare:workers");
  const configured = String(
    (env as unknown as Record<string, unknown>).PARENT_PERSPECTIVES_MODERATOR_EMAILS ?? "",
  );
  const allowed = configured
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
