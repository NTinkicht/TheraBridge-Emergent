-- Synthetic-only operational communication audiences. Existing threads are guardian-addressed.
ALTER TABLE "message_thread"
  ADD COLUMN "audience" VARCHAR(16) NOT NULL DEFAULT 'GUARDIAN',
  ADD COLUMN "service" VARCHAR(32);

ALTER TABLE "message_thread"
  ADD CONSTRAINT "message_thread_audience_scope_check"
  CHECK (
    ("audience" = 'GUARDIAN' AND "service" IS NULL AND "guardian_link_id" IS NOT NULL)
    OR ("audience" = 'CARE_TEAM' AND "service" IS NULL AND "guardian_link_id" IS NULL)
    OR ("audience" = 'SPECIALTY' AND "service" IS NOT NULL AND "guardian_link_id" IS NULL)
  );

CREATE INDEX "message_thread_center_id_child_id_audience_service_idx"
  ON "message_thread" ("center_id", "child_id", "audience", "service");
