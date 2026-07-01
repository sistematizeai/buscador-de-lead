import { SetMetadata } from "@nestjs/common";

export const REQUIRED_PERMISSIONS_KEY = "requiredPermissions";

export type Permission =
  | "analytics.read"
  | "campaigns.read"
  | "campaigns.create"
  | "campaigns.update"
  | "campaigns.delete"
  | "campaigns.run"
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
  | "settings.read"
  | "settings.manage_integrations"
  | "settings.manage_api_keys"
  | "tenant.read"
  | "tenant.update"
  | "tenant.manage_users"
  | "admin.access"
  | "admin.audit_logs"
  | "admin.security_settings";

const rolePermissions: Record<string, Permission[]> = {
  owner: [
    "analytics.read",
    "campaigns.read",
    "campaigns.create",
    "campaigns.update",
    "campaigns.delete",
    "campaigns.run",
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
    "settings.read",
    "settings.manage_integrations",
    "settings.manage_api_keys",
    "tenant.read",
    "tenant.update",
    "tenant.manage_users",
    "admin.access",
    "admin.audit_logs",
    "admin.security_settings",
  ],
  admin: [
    "analytics.read",
    "campaigns.read",
    "campaigns.create",
    "campaigns.update",
    "campaigns.delete",
    "campaigns.run",
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
    "settings.read",
    "settings.manage_integrations",
    "settings.manage_api_keys",
    "tenant.read",
    "tenant.update",
    "tenant.manage_users",
    "admin.access",
    "admin.audit_logs",
    "admin.security_settings",
  ],
  member: [
    "analytics.read",
    "campaigns.read",
    "campaigns.create",
    "campaigns.update",
    "campaigns.run",
    "company_search.use",
    "company_search.save_to_crm",
    "crm.read",
    "crm.create",
    "crm.update",
    "settings.read",
    "tenant.read",
  ],
};

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

export function resolvePermissions(role?: string | null) {
  return rolePermissions[role || ""] ?? [];
}
