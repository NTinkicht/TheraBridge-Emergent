-- AlterTable
ALTER TABLE "plan_version" ALTER COLUMN "status" SET DATA TYPE VARCHAR(32);

-- AlterTable
ALTER TABLE "progress_report" ALTER COLUMN "status" SET DATA TYPE VARCHAR(32);

-- CreateTable
CREATE TABLE "governance_snapshot" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "kind" VARCHAR(8) NOT NULL,
    "document_id" UUID NOT NULL,
    "source_version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,
    "author_id" UUID NOT NULL,
    "generated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governance_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_history" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "kind" VARCHAR(8) NOT NULL,
    "document_id" UUID NOT NULL,
    "source_version" INTEGER NOT NULL,
    "from_status" VARCHAR(32) NOT NULL,
    "to_status" VARCHAR(32) NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "actor_id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governance_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_policy_draft" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "purpose" VARCHAR(120) NOT NULL,
    "number" INTEGER NOT NULL,
    "restrictions" JSONB NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT_NON_AUTHORIZING',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_policy_draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_record_draft" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "guardian_link_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "previous_id" UUID,
    "effective_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "restrictions" JSONB NOT NULL,
    "authorization_evidence" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT_NON_AUTHORIZING',
    "authorizes" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_record_draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_authorization_decision" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'BLOCKED_POLICY',

    CONSTRAINT "clinical_authorization_decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipient_release" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "decision_id" UUID NOT NULL,
    "guardian_link_id" UUID NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'BLOCKED_POLICY',

    CONSTRAINT "recipient_release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipient_release_history" (
    "id" UUID NOT NULL,
    "release_id" UUID NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "actor_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipient_release_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caseload_transfer_draft" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "from_membership_id" UUID NOT NULL,
    "to_membership_id" UUID NOT NULL,
    "service" VARCHAR(32) NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'SIMULATION_ONLY',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caseload_transfer_draft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "governance_snapshot_center_id_kind_document_id_idx" ON "governance_snapshot"("center_id", "kind", "document_id");

-- CreateIndex
CREATE INDEX "governance_history_center_id_kind_document_id_idx" ON "governance_history"("center_id", "kind", "document_id");

-- CreateIndex
CREATE UNIQUE INDEX "consent_policy_draft_center_id_purpose_number_key" ON "consent_policy_draft"("center_id", "purpose", "number");

-- CreateIndex
CREATE UNIQUE INDEX "consent_record_draft_previous_id_key" ON "consent_record_draft"("previous_id");

-- CreateIndex
CREATE INDEX "consent_record_draft_center_id_child_id_guardian_link_id_idx" ON "consent_record_draft"("center_id", "child_id", "guardian_link_id");

-- CreateIndex
CREATE INDEX "caseload_transfer_draft_center_id_idx" ON "caseload_transfer_draft"("center_id");

-- Expand only NON-authorizing lifecycle states. No approval/sign/release value is accepted.
ALTER TABLE plan_version DROP CONSTRAINT plan_version_status;
ALTER TABLE plan_version ADD CONSTRAINT plan_version_status CHECK (status IN ('DRAFT','IN_REVIEW','SUPERSEDED','RETURNED_FOR_REVISION','WITHDRAWN','FROZEN_INTERNAL'));
ALTER TABLE progress_report DROP CONSTRAINT progress_report_status_check;
ALTER TABLE progress_report ADD CONSTRAINT progress_report_status_check CHECK (status IN ('DRAFT','IN_REVIEW','RETURNED_FOR_REVISION','WITHDRAWN','FROZEN_INTERNAL'));
CREATE FUNCTION governance_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'governance history is immutable'; END $$;
CREATE TRIGGER governance_snapshot_immutable BEFORE UPDATE OR DELETE ON governance_snapshot FOR EACH ROW EXECUTE FUNCTION governance_immutable();
CREATE TRIGGER governance_history_immutable BEFORE UPDATE OR DELETE ON governance_history FOR EACH ROW EXECUTE FUNCTION governance_immutable();
CREATE TRIGGER consent_policy_immutable BEFORE UPDATE OR DELETE ON consent_policy_draft FOR EACH ROW EXECUTE FUNCTION governance_immutable();
CREATE TRIGGER consent_record_immutable BEFORE UPDATE OR DELETE ON consent_record_draft FOR EACH ROW EXECUTE FUNCTION governance_immutable();
CREATE TRIGGER report_version_no_delete BEFORE DELETE ON report_version FOR EACH ROW EXECUTE FUNCTION report_version_immutable();
ALTER TABLE consent_policy_draft ADD CHECK (status = 'DRAFT_NON_AUTHORIZING');
ALTER TABLE consent_record_draft ADD CHECK (status IN ('DRAFT_NON_AUTHORIZING','REVOKED') AND authorizes = false AND authorization_evidence = '{}'::jsonb AND (expires_at IS NULL OR effective_at IS NULL OR expires_at > effective_at));
ALTER TABLE clinical_authorization_decision ADD CHECK (status = 'BLOCKED_POLICY');
ALTER TABLE recipient_release ADD CHECK (status = 'BLOCKED_POLICY');
CREATE TRIGGER clinical_authorization_locked BEFORE INSERT OR UPDATE ON clinical_authorization_decision FOR EACH ROW EXECUTE FUNCTION report_release_locked();
CREATE TRIGGER recipient_release_locked BEFORE INSERT OR UPDATE ON recipient_release FOR EACH ROW EXECUTE FUNCTION report_release_locked();
CREATE TRIGGER recipient_release_history_locked BEFORE INSERT OR UPDATE OR DELETE ON recipient_release_history FOR EACH ROW EXECUTE FUNCTION report_release_locked();
ALTER TABLE caseload_transfer_draft ADD CHECK (status = 'SIMULATION_ONLY' AND from_membership_id <> to_membership_id);
ALTER TABLE governance_snapshot ADD CHECK (kind IN ('PLAN','REPORT') AND source_version > 0 AND fingerprint ~ '^[a-f0-9]{64}$');
ALTER TABLE governance_history ADD CONSTRAINT governance_history_snapshot_fk FOREIGN KEY (snapshot_id) REFERENCES governance_snapshot(id);
-- Validate polymorphic source and all tenant/child associations without weakening existing constraints.
CREATE FUNCTION governance_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME = 'governance_snapshot' THEN
  IF NOT EXISTS (SELECT 1 FROM child WHERE id=NEW.child_id AND center_id=NEW.center_id) THEN RAISE EXCEPTION 'invalid child scope'; END IF;
  IF NEW.kind='PLAN' AND NOT EXISTS (SELECT 1 FROM plan_version v JOIN therapy_plan p ON p.id=v.plan_id WHERE v.id=NEW.document_id AND v.center_id=NEW.center_id AND p.center_id=NEW.center_id AND p.child_id=NEW.child_id) THEN RAISE EXCEPTION 'invalid plan scope'; END IF;
  IF NEW.kind='REPORT' AND NOT EXISTS (SELECT 1 FROM progress_report WHERE id=NEW.document_id AND center_id=NEW.center_id AND child_id=NEW.child_id) THEN RAISE EXCEPTION 'invalid report scope'; END IF;
 ELSIF TG_TABLE_NAME = 'governance_history' THEN
  IF NOT EXISTS (SELECT 1 FROM governance_snapshot WHERE id=NEW.snapshot_id AND center_id=NEW.center_id AND child_id=NEW.child_id AND kind=NEW.kind AND document_id=NEW.document_id AND source_version=NEW.source_version) THEN RAISE EXCEPTION 'invalid snapshot scope'; END IF;
 ELSIF TG_TABLE_NAME = 'consent_record_draft' THEN
  IF NOT EXISTS (SELECT 1 FROM guardian_link WHERE id=NEW.guardian_link_id AND center_id=NEW.center_id AND child_id=NEW.child_id) OR NOT EXISTS (SELECT 1 FROM consent_policy_draft WHERE id=NEW.policy_id AND center_id=NEW.center_id) THEN RAISE EXCEPTION 'invalid consent scope'; END IF;
  IF NEW.previous_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM consent_record_draft WHERE id=NEW.previous_id AND center_id=NEW.center_id AND child_id=NEW.child_id AND guardian_link_id=NEW.guardian_link_id) THEN RAISE EXCEPTION 'invalid consent revision'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER governance_snapshot_scope BEFORE INSERT ON governance_snapshot FOR EACH ROW EXECUTE FUNCTION governance_scope();
CREATE TRIGGER governance_history_scope BEFORE INSERT ON governance_history FOR EACH ROW EXECUTE FUNCTION governance_scope();
CREATE TRIGGER consent_record_scope BEFORE INSERT ON consent_record_draft FOR EACH ROW EXECUTE FUNCTION governance_scope();
-- Immutable clinical content after leaving an editable draft. Status/review notes may change explicitly.
CREATE FUNCTION clinical_content_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'clinical versions cannot be deleted'; END IF;
 IF TG_TABLE_NAME='plan_version' THEN
  IF NEW.author_id<>OLD.author_id OR NEW.plan_id<>OLD.plan_id OR NEW.center_id<>OLD.center_id OR NEW.number<>OLD.number THEN RAISE EXCEPTION 'immutable plan identity'; END IF;
  IF OLD.status NOT IN ('DRAFT','RETURNED_FOR_REVISION') AND (NEW.summary<>OLD.summary OR NEW.goals<>OLD.goals OR NEW.home_activities<>OLD.home_activities) THEN RAISE EXCEPTION 'clinical content is frozen'; END IF;
 ELSE
  IF NEW.membership_id<>OLD.membership_id OR NEW.center_id<>OLD.center_id OR NEW.child_id<>OLD.child_id THEN RAISE EXCEPTION 'immutable report identity'; END IF;
  IF OLD.status NOT IN ('DRAFT','RETURNED_FOR_REVISION') AND NEW.sections<>OLD.sections THEN RAISE EXCEPTION 'clinical content is frozen'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER plan_content_guard BEFORE UPDATE OR DELETE ON plan_version FOR EACH ROW EXECUTE FUNCTION clinical_content_guard();
CREATE TRIGGER report_content_guard BEFORE UPDATE OR DELETE ON progress_report FOR EACH ROW EXECUTE FUNCTION clinical_content_guard();
CREATE FUNCTION observed_goal_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.goals<>OLD.goals AND EXISTS (SELECT 1 FROM observation o WHERE o.plan_version_id=OLD.id AND (SELECT g FROM jsonb_array_elements(OLD.goals) g WHERE g->>'key'=o.goal_key) IS DISTINCT FROM (SELECT g FROM jsonb_array_elements(NEW.goals) g WHERE g->>'key'=o.goal_key)) THEN RAISE EXCEPTION 'observed goals require a new plan version'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER observed_goal_guard BEFORE UPDATE ON plan_version FOR EACH ROW EXECUTE FUNCTION observed_goal_guard();
-- Provenance associations are also checked for direct database writes (issue #39).
CREATE FUNCTION observation_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE plan_service text;
BEGIN
 SELECT p.service INTO plan_service FROM plan_version v JOIN therapy_plan p ON p.id=v.plan_id
 WHERE v.id=NEW.plan_version_id AND v.center_id=NEW.center_id AND p.center_id=NEW.center_id AND p.child_id=NEW.child_id;
 IF plan_service IS NULL THEN RAISE EXCEPTION 'invalid observation plan scope'; END IF;
 IF NEW.session_note_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM session_note n WHERE n.id=NEW.session_note_id AND n.center_id=NEW.center_id AND n.child_id=NEW.child_id AND n.membership_id=NEW.membership_id AND n.service=plan_service) THEN RAISE EXCEPTION 'invalid observation note scope'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER observation_scope_guard BEFORE INSERT OR UPDATE ON observation FOR EACH ROW EXECUTE FUNCTION observation_scope_guard();
CREATE FUNCTION transfer_draft_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM child WHERE id=NEW.child_id AND center_id=NEW.center_id) OR NOT EXISTS (SELECT 1 FROM membership WHERE id=NEW.from_membership_id AND center_id=NEW.center_id) OR NOT EXISTS (SELECT 1 FROM membership WHERE id=NEW.to_membership_id AND center_id=NEW.center_id) THEN RAISE EXCEPTION 'invalid transfer simulation scope'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER transfer_draft_scope_guard BEFORE INSERT OR UPDATE ON caseload_transfer_draft FOR EACH ROW EXECUTE FUNCTION transfer_draft_scope_guard();

-- Preserve the original one-open index and additionally include returned editable drafts.
CREATE UNIQUE INDEX plan_version_one_editable_or_review ON plan_version(plan_id) WHERE status IN ('DRAFT','IN_REVIEW','RETURNED_FOR_REVISION');
