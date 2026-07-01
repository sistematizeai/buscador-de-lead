import { SetMetadata } from "@nestjs/common";

export const REQUIRED_PERMISSIONS_KEY = "requiredPermissions";

export type Permission =
  | "company_search.use"
  | "company_search.view_history"
  | "company_search.save_to_crm"
  | "crm.read"
  | "crm.create"
  | "crm.update"
  | "crm.delete"
  | "crm.export"
  | "crm.manage_status"
  | "crm.assign_owner"
  | "crm.view_sensitive_data"
  | "settings.manage_api_keys";

const rolePermissions: Record<string, Permission[]> = {
  owner: [
    "company_search.use",
    "company_search.view_history",
    "company_search.save_to_crm",
    "crm.read",
    "crm.create",
    "crm.update",
    "crm.delete",
    "crm.export",
    "crm.manage_status",
    "crm.assign_owner",
    "crm.view_sensitive_data",
    "settings.manage_api_keys",
  ],
  admin: [
    "company_search.use",
    "company_search.view_history",
    "company_search.save_to_crm",
    "crm.read",
    "crm.create",
    "crm.update",
    "crm.delete",
    "crm.export",
    "crm.manage_status",
    "crm.assign_owner",
    "crm.view_sensitive_data",
    "settings.manage_api_keys",
  ],
  member: [
    "company_search.use",
    "company_search.save_to_crm",
    "crm.read",
    "crm.create",
    "crm.update",
  ],
};

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

export function resolvePermissions(role?: string | null) {
  return rolePermissions[role || ""] ?? [];
}
