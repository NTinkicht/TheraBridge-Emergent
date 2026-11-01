-- Additive consent ordering: revisions are allocated after locking guardian_link.
-- Existing audit rows receive revision 0; new amendments receive strictly increasing revisions.
ALTER TABLE "synthetic_family_consent" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "synthetic_family_consent_revision_key" ON "synthetic_family_consent" ("center_id", "child_id", "guardian_link_id", "purpose", "revision");
