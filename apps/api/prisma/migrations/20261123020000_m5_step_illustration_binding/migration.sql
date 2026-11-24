-- Exact source-version step binding for private artwork proposals, without approval/read grants.
ALTER TABLE "activity_media_draft" ADD COLUMN "step_number" INTEGER;
ALTER TABLE "activity_media_draft" ADD CONSTRAINT "activity_media_draft_step_number_check"
  CHECK ("step_number" IS NULL OR ("step_number" BETWEEN 1 AND 64));
