-- TB-EM-053 v1.1: additive, default-deny schema foundation for synthetic family release.
-- Existing clinical authorization records and blocked recipient releases remain blocked.
ALTER TABLE "center" ADD COLUMN "synthetic_family_release_enabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "guardian_link"
  ADD COLUMN "family_release_restriction" VARCHAR(16) NOT NULL DEFAULT 'UNRESOLVED',
  ADD COLUMN "household_reference" VARCHAR(80);
ALTER TABLE "guardian_link" ADD CONSTRAINT "guardian_family_release_restriction_check"
  CHECK ("family_release_restriction" IN ('CLEAR', 'RESTRICTED', 'UNRESOLVED'));

ALTER TABLE "recipient_release"
  ADD COLUMN "kind" VARCHAR(8) NOT NULL DEFAULT 'REPORT',
  ADD COLUMN "purpose" VARCHAR(120) NOT NULL DEFAULT '',
  ADD COLUMN "approved_rendering_hash" CHAR(64),
  ADD COLUMN "approved_by_id" UUID,
  ADD COLUMN "released_by_id" UUID,
  ADD COLUMN "released_at" TIMESTAMPTZ(3),
  ADD COLUMN "revoked_at" TIMESTAMPTZ(3),
  ADD COLUMN "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "recipient_release" ADD CONSTRAINT "recipient_release_kind_check" CHECK ("kind" IN ('PLAN', 'REPORT'));
ALTER TABLE "recipient_release" ADD CONSTRAINT "recipient_release_hash_check"
  CHECK ("approved_rendering_hash" IS NULL OR "approved_rendering_hash" ~ '^[0-9a-f]{64}$');
CREATE INDEX "recipient_release_center_child_guardian_status_idx"
  ON "recipient_release" ("center_id", "child_id", "guardian_link_id", "status");
CREATE INDEX "recipient_release_center_snapshot_status_idx"
  ON "recipient_release" ("center_id", "snapshot_id", "status");
