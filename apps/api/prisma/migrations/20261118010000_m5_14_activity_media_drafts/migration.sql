-- M5-14: private activity-illustration metadata proposals only.
-- Deliberately no public URL, object key, approved state, or family release path.
-- Future storage/provider and independent clinical approval require separate migrations.
CREATE TABLE "activity_media_draft" (
  "id" UUID NOT NULL,
  "center_id" UUID NOT NULL,
  "template_id" UUID NOT NULL,
  "template_version" INTEGER NOT NULL,
  "service" VARCHAR(32) NOT NULL,
  "state" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
  "source_type" VARCHAR(16) NOT NULL,
  "style_version" VARCHAR(120) NOT NULL,
  "scene_type" VARCHAR(80) NOT NULL,
  "alt_text" VARCHAR(600) NOT NULL,
  "license" VARCHAR(160) NOT NULL,
  "source_reference" VARCHAR(500) NOT NULL,
  "provider_terms" VARCHAR(500),
  "rejection_reason" VARCHAR(500),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "activity_media_draft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "activity_media_draft_state_check" CHECK ("state" IN ('DRAFT','REJECTED')),
  CONSTRAINT "activity_media_draft_source_check" CHECK ("source_type" IN ('ORIGINAL','GENERATED','LICENSED')),
  CONSTRAINT "activity_media_draft_version_check" CHECK ("template_version" >= 1 AND "version" >= 1)
);
CREATE INDEX "activity_media_draft_center_id_template_id_created_at_idx"
  ON "activity_media_draft" ("center_id", "template_id", "created_at" DESC);
ALTER TABLE "activity_media_draft" ADD CONSTRAINT "activity_media_draft_center_id_fkey"
  FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activity_media_draft" ADD CONSTRAINT "activity_media_draft_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "activity_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activity_media_draft" ADD CONSTRAINT "activity_media_draft_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
