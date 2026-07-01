-- RLS template for Buscador de Lead.
-- Do not run directly in production until the API sets app.workspace_id
-- inside every tenant-scoped database transaction and uses an app role
-- without BYPASSRLS.

BEGIN;

CREATE SCHEMA IF NOT EXISTS app_security;

CREATE OR REPLACE FUNCTION app_security.current_workspace_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.workspace_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app_security.same_workspace(workspace_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT workspace_id IS NOT NULL
     AND app_security.current_workspace_id() IS NOT NULL
     AND workspace_id = app_security.current_workspace_id()
$$;

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_rate_limit_buckets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaigns_tenant_isolation ON campaigns;
CREATE POLICY campaigns_tenant_isolation ON campaigns
  USING (app_security.same_workspace("workspaceId"))
  WITH CHECK (app_security.same_workspace("workspaceId"));

DROP POLICY IF EXISTS leads_tenant_isolation ON leads;
CREATE POLICY leads_tenant_isolation ON leads
  USING (app_security.same_workspace("workspaceId"))
  WITH CHECK (app_security.same_workspace("workspaceId"));

DROP POLICY IF EXISTS contacts_tenant_isolation ON contacts;
CREATE POLICY contacts_tenant_isolation ON contacts
  USING (app_security.same_workspace("workspaceId"))
  WITH CHECK (app_security.same_workspace("workspaceId"));

DROP POLICY IF EXISTS integrations_tenant_isolation ON integrations;
CREATE POLICY integrations_tenant_isolation ON integrations
  USING (app_security.same_workspace("workspaceId"))
  WITH CHECK (app_security.same_workspace("workspaceId"));

DROP POLICY IF EXISTS api_keys_tenant_isolation ON api_keys;
CREATE POLICY api_keys_tenant_isolation ON api_keys
  USING (app_security.same_workspace("workspaceId"))
  WITH CHECK (app_security.same_workspace("workspaceId"));

DROP POLICY IF EXISTS company_search_logs_tenant_isolation ON company_search_logs;
CREATE POLICY company_search_logs_tenant_isolation ON company_search_logs
  USING (app_security.same_workspace("workspaceId"))
  WITH CHECK (app_security.same_workspace("workspaceId"));

DROP POLICY IF EXISTS security_audit_logs_tenant_isolation ON security_audit_logs;
CREATE POLICY security_audit_logs_tenant_isolation ON security_audit_logs
  USING ("workspaceId" IS NULL OR app_security.same_workspace("workspaceId"))
  WITH CHECK ("workspaceId" IS NULL OR app_security.same_workspace("workspaceId"));

DROP POLICY IF EXISTS security_rate_limit_buckets_tenant_isolation ON security_rate_limit_buckets;
CREATE POLICY security_rate_limit_buckets_tenant_isolation ON security_rate_limit_buckets
  USING (workspace_id IS NULL OR app_security.same_workspace(workspace_id))
  WITH CHECK (workspace_id IS NULL OR app_security.same_workspace(workspace_id));

COMMIT;
