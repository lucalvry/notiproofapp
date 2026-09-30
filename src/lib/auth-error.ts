/** Turns sign-in service errors into a readable message (never "{}"). */
export function authErrorMessage(error: unknown): string {
  const msg = (error as { message?: unknown } | null)?.message;
  const text = typeof msg === "string" ? msg.trim() : "";
  if (!text || text === "{}" || /fetch|network|timeout|timed out|gateway|50\d/i.test(text)) {
    return "We couldn't reach the sign-in service, please try again in a minute.";
  }
  return text;
}
