import type { useAuth } from "@/contexts/AuthContext";

export type AppRole = "owner" | "editor" | "viewer";

export function canEditBusiness(role: AppRole | null | undefined): boolean {
  return role === "owner" || role === "editor";
}

export function canManageBusiness(role: AppRole | null | undefined): boolean {
  return role === "owner";
}

export function isViewer(role: AppRole | null | undefined): boolean {
  return role === "viewer";
}

export const READ_ONLY_TOOLTIP =
  "Read-only access — ask an owner to upgrade your role.";

// Re-export type so consumers can `import type { AppRole } from "@/lib/roles"`.
export type { useAuth };
