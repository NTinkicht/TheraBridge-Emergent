-- Owner-approved TB-EM-053 synthetic-only workflow. Legacy clinical release
-- triggers and non-authorizing consent constraints are intentionally untouched.
CREATE TABLE "synthetic_family_approval" (
  "id" UUID NOT NULL PRIMARY KEY, "center_id" UUID NOT NULL, "child_id" UUID NOT NULL,
  "snapshot_id" UUID NOT NULL, "kind" VARCHAR(8) NOT NULL, "purpose" VARCHAR(32) NOT NULL,
  "rendering" JSONB NOT NULL, "rendering_hash" CHAR(64) NOT NULL,
  "approved_by_id" UUID NOT NULL, "approved_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "synthetic_family_approval_kind" CHECK ("kind" IN ('PLAN','REPORT')),
  CONSTRAINT "synthetic_family_approval_hash" CHECK ("rendering_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "synthetic_family_approval_purpose" CHECK ("purpose" IN ('FAMILY_PLAN','FAMILY_REPORT')),
  CONSTRAINT "synthetic_family_approval_center_fk" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE RESTRICT,
  CONSTRAINT "synthetic_family_approval_child_fk" FOREIGN KEY ("child_id") REFERENCES "child"("id") ON DELETE RESTRICT,
  CONSTRAINT "synthetic_family_approval_snapshot_fk" FOREIGN KEY ("snapshot_id") REFERENCES "governance_snapshot"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "synthetic_family_approval_identity_idx" ON "synthetic_family_approval" ("center_id","snapshot_id","rendering_hash");
CREATE INDEX "synthetic_family_approval_scope_idx" ON "synthetic_family_approval" ("center_id","child_id","snapshot_id");

CREATE TABLE "synthetic_family_consent" (
  "id" UUID NOT NULL PRIMARY KEY, "center_id" UUID NOT NULL, "child_id" UUID NOT NULL,
  "guardian_link_id" UUID NOT NULL, "purpose" VARCHAR(32) NOT NULL,
  "status" VARCHAR(12) NOT NULL DEFAULT 'ACTIVE', "actor_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "revoked_at" TIMESTAMPTZ(3),
  CONSTRAINT "synthetic_family_consent_status" CHECK ("status" IN ('ACTIVE','REVOKED')),
  CONSTRAINT "synthetic_family_consent_purpose" CHECK ("purpose" IN ('FAMILY_PLAN','FAMILY_REPORT')),
  CONSTRAINT "synthetic_family_consent_center_fk" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE RESTRICT,
  CONSTRAINT "synthetic_family_consent_child_fk" FOREIGN KEY ("child_id") REFERENCES "child"("id") ON DELETE RESTRICT,
  CONSTRAINT "synthetic_family_consent_guardian_fk" FOREIGN KEY ("guardian_link_id") REFERENCES "guardian_link"("id") ON DELETE RESTRICT
);
CREATE INDEX "synthetic_family_consent_scope_idx" ON "synthetic_family_consent" ("center_id","child_id","guardian_link_id","purpose","status");

CREATE TABLE "synthetic_family_grant" (
  "id" UUID NOT NULL PRIMARY KEY, "center_id" UUID NOT NULL, "child_id" UUID NOT NULL,
  "approval_id" UUID NOT NULL, "guardian_link_id" UUID NOT NULL,
  "purpose" VARCHAR(32) NOT NULL, "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  "released_by_id" UUID NOT NULL, "released_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "changed_by_id" UUID, "changed_at" TIMESTAMPTZ(3),
  CONSTRAINT "synthetic_family_grant_status" CHECK ("status" IN ('ACTIVE','REVOKED','WITHDRAWN','SUPERSEDED')),
  CONSTRAINT "synthetic_family_grant_purpose" CHECK ("purpose" IN ('FAMILY_PLAN','FAMILY_REPORT')),
  CONSTRAINT "synthetic_family_grant_center_fk" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE RESTRICT,
  CONSTRAINT "synthetic_family_grant_child_fk" FOREIGN KEY ("child_id") REFERENCES "child"("id") ON DELETE RESTRICT,
  CONSTRAINT "synthetic_family_grant_approval_fk" FOREIGN KEY ("approval_id") REFERENCES "synthetic_family_approval"("id") ON DELETE RESTRICT,
  CONSTRAINT "synthetic_family_grant_guardian_fk" FOREIGN KEY ("guardian_link_id") REFERENCES "guardian_link"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "synthetic_family_grant_identity_idx" ON "synthetic_family_grant" ("center_id","approval_id","guardian_link_id");
CREATE INDEX "synthetic_family_grant_scope_idx" ON "synthetic_family_grant" ("center_id","child_id","guardian_link_id","status");

-- Immutable clinician approval, consent audit preserved across withdrawal.
CREATE TRIGGER "synthetic_family_approval_immutable" BEFORE UPDATE OR DELETE ON "synthetic_family_approval" FOR EACH ROW EXECUTE FUNCTION governance_immutable();
