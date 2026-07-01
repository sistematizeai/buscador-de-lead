-- RLS policies for Buscador de Lead.
-- Safe to re-run. Requires the API to execute tenant-scoped operations through
-- PrismaService.withWorkspace(), which sets app.workspace_id inside a transaction.
--
-- The application role must be created separately with LOGIN and NOBYPASSRLS:
--   CREATE ROLE buscador_lead_app LOGIN PASSWORD '<generated>' NOBYPASSRLS;

BEGIN;

CREATE SCHEMA IF NOT EXISTS app_security;
REVOKE ALL ON SCHEMA app_security FROM PUBLIC;

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

CREATE OR REPLACE FUNCTION app_security.same_lead_workspace(lead_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.id = lead_id
      AND app_security.same_workspace(l."workspaceId")
  )
$$;

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;
ALTER TABLE contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE integrations FORCE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE company_search_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE security_rate_limit_buckets FORCE ROW LEVEL SECURITY;
ALTER TABLE lead_activities FORCE ROW LEVEL SECURITY;
ALTER TABLE follow_ups FORCE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS lead_activities_tenant_isolation ON lead_activities;
CREATE POLICY lead_activities_tenant_isolation ON lead_activities
  USING (app_security.same_lead_workspace("leadId"))
  WITH CHECK (app_security.same_lead_workspace("leadId"));

DROP POLICY IF EXISTS follow_ups_tenant_isolation ON follow_ups;
CREATE POLICY follow_ups_tenant_isolation ON follow_ups
  USING (app_security.same_lead_workspace("leadId"))
  WITH CHECK (app_security.same_lead_workspace("leadId"));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'buscador_lead_app') THEN
    GRANT USAGE ON SCHEMA public, app_security TO buscador_lead_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO buscador_lead_app;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_security TO buscador_lead_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO buscador_lead_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO buscador_lead_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO buscador_lead_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA app_security
      GRANT EXECUTE ON FUNCTIONS TO buscador_lead_app;
  END IF;
END $$;

COMMIT;
