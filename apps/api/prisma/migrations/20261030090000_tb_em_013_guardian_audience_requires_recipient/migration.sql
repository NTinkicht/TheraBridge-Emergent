-- Follow-up to TB-EM-012: never rewrite an already-applied Prisma migration.
-- Existing guardian-audience threads were created with an active recipient link.
-- Reject invalid pre-existing synthetic rows rather than silently assigning a recipient.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM message_thread
    WHERE audience = 'GUARDIAN' AND guardian_link_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot strengthen guardian audience constraint: guardian thread missing recipient';
  END IF;
END $$;

ALTER TABLE "message_thread"
  DROP CONSTRAINT "message_thread_audience_scope_check";

ALTER TABLE "message_thread"
  ADD CONSTRAINT "message_thread_audience_scope_check"
  CHECK (
    ("audience" = 'GUARDIAN' AND "service" IS NULL AND "guardian_link_id" IS NOT NULL)
    OR ("audience" = 'CARE_TEAM' AND "service" IS NULL AND "guardian_link_id" IS NULL)
    OR ("audience" = 'SPECIALTY' AND "service" IS NOT NULL AND "guardian_link_id" IS NULL)
  );
