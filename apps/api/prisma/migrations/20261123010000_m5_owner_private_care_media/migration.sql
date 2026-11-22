-- M5 #11/#13/#25 — encrypted sensitive intake and scan-only media candidates.
-- Additive. The database never persists plaintext medical context or raw media.
CREATE TABLE "child_care_intake" (
  "id" UUID NOT NULL,
  "center_id" UUID NOT NULL,
  "child_id" UUID NOT NULL,
  "encrypted_body" BYTEA NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "source" VARCHAR(36) NOT NULL DEFAULT 'FAMILY_REPORTED_UNVERIFIED',
  "modified_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "child_care_intake_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "child_care_intake_child_id_key" UNIQUE ("child_id"),
  CONSTRAINT "care_intake_version_positive" CHECK ("version" > 0),
  CONSTRAINT "care_intake_cipher_minimum" CHECK (octet_length("encrypted_body") >= 29),
  CONSTRAINT "care_intake_source_fixed" CHECK ("source" = 'FAMILY_REPORTED_UNVERIFIED')
);
CREATE INDEX "child_care_intake_center_id_updated_at_idx" ON "child_care_intake" ("center_id", "updated_at");
ALTER TABLE "child_care_intake" ADD CONSTRAINT "child_care_intake_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "child_care_intake" ADD CONSTRAINT "child_care_intake_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "private_media_candidate" (
  "id" UUID NOT NULL,
  "center_id" UUID NOT NULL,
  "kind" VARCHAR(28) NOT NULL,
  "child_id" UUID,
  "template_id" UUID,
  "template_version" INTEGER,
  "encrypted_bytes" BYTEA NOT NULL,
  "digest_sha256" VARCHAR(64) NOT NULL,
  "scanner_name" VARCHAR(80) NOT NULL,
  "scanner_version" VARCHAR(80) NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'QUARANTINED',
  "consent_state" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "rights_state" VARCHAR(20) NOT NULL DEFAULT 'UNVERIFIED',
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ(3),
  CONSTRAINT "private_media_candidate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "private_media_subject_one" CHECK (
    ("kind" = 'CHILD_PHOTO' AND "child_id" IS NOT NULL AND "template_id" IS NULL AND "template_version" IS NULL)
    OR ("kind" = 'ACTIVITY_IMAGE' AND "child_id" IS NULL AND "template_id" IS NOT NULL AND "template_version" > 0)
  ),
  CONSTRAINT "private_media_never_approved" CHECK ("status" IN ('QUARANTINED', 'REVOKED')),
  CONSTRAINT "private_media_never_consent_granted_by_staff" CHECK ("consent_state" = 'PENDING'),
  CONSTRAINT "private_media_never_rights_granted_by_upload" CHECK ("rights_state" = 'UNVERIFIED'),
  CONSTRAINT "private_media_cipher_minimum" CHECK (octet_length("encrypted_bytes") >= 29),
  CONSTRAINT "private_media_dimension_bounds" CHECK ("width" BETWEEN 1 AND 4096 AND "height" BETWEEN 1 AND 4096 AND "width"::bigint*"height" <= 12000000)
);
CREATE INDEX "private_media_candidate_center_id_child_id_created_at_idx" ON "private_media_candidate" ("center_id", "child_id", "created_at");
CREATE INDEX "private_media_candidate_center_id_template_id_created_at_idx" ON "private_media_candidate" ("center_id", "template_id", "created_at");
ALTER TABLE "private_media_candidate" ADD CONSTRAINT "private_media_candidate_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "private_media_candidate" ADD CONSTRAINT "private_media_candidate_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "private_media_candidate" ADD CONSTRAINT "private_media_candidate_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "activity_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
