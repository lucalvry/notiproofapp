/** Shared "Add your business + website" rule: a website OR a saved domain counts. */
export function businessStepDone(input: { website_url?: string | null; domainCount?: number }): boolean {
  return !!(input.website_url && input.website_url.trim()) || (input.domainCount ?? 0) > 0;
}
