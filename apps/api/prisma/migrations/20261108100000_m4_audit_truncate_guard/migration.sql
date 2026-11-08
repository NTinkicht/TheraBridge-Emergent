-- M4-06 P1 / #277. PostgreSQL row triggers on UPDATE/DELETE do NOT
-- intercept TRUNCATE. An additional statement-level trigger closes that gap
-- for the operational application role. Applied forward-only.
--
-- Trusted table owners/superusers can still DISABLE triggers or change the
-- schema; protect migration credentials separately from runtime credentials.
-- Privileges are narrowed for PUBLIC, but table owners are not constrained
-- by REVOKE. Do not represent this trigger as protection from a DB owner.
REVOKE TRUNCATE ON TABLE public.audit_event FROM PUBLIC;

CREATE FUNCTION audit_event_truncate_forbidden() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_event is append-only; TRUNCATE prohibited'
    USING ERRCODE = '55000';
END $$;

CREATE TRIGGER audit_event_no_truncate BEFORE TRUNCATE ON public.audit_event
  FOR EACH STATEMENT EXECUTE FUNCTION audit_event_truncate_forbidden();
