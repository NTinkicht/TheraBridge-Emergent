-- TB-EM-021: forward-only synthetic report suggestion decision ledger.
-- Independent of clinical approvals, signatures, consent and releases.
CREATE TABLE "report_suggestion_decision" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "center_id" UUID NOT NULL,
 "child_id" UUID NOT NULL,
 "report_id" UUID NOT NULL,
 "service" VARCHAR(32) NOT NULL,
 "membership_id" UUID NOT NULL,
 "actor_user_id" UUID NOT NULL,
 "section" VARCHAR(16) NOT NULL,
 "action" VARCHAR(16) NOT NULL,
 "idempotency_key" UUID NOT NULL,
 "reason" VARCHAR(500),
 "request_hash" CHAR(64) NOT NULL,
 "generator" VARCHAR(32) NOT NULL,
 "source_manifest" JSONB NOT NULL,
 "source_hash" CHAR(64) NOT NULL,
 "claim_map" JSONB NOT NULL,
 "passage_hash" CHAR(64),
 "section_hash" CHAR(64) NOT NULL,
 "report_revision" INTEGER NOT NULL,
 "label" VARCHAR(32) NOT NULL DEFAULT 'NON_CLINICAL_DRAFT',
 "created_at" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "report_suggestion_decision_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "report_suggestion_decision_scope_fk" FOREIGN KEY ("report_id") REFERENCES "progress_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "report_suggestion_decision_section_check" CHECK ("section" IN ('assessment','goals','sessions')),
 CONSTRAINT "report_suggestion_decision_action_check" CHECK ("action" IN ('APPLIED','OMITTED','RECONSIDERED')),
 CONSTRAINT "report_suggestion_decision_label_check" CHECK ("label" = 'NON_CLINICAL_DRAFT'),
 CONSTRAINT "report_suggestion_decision_revision_check" CHECK ("report_revision" > 0),
 CONSTRAINT "report_suggestion_decision_manifest_array" CHECK (jsonb_typeof("source_manifest") = 'array'),
 CONSTRAINT "report_suggestion_decision_claim_array" CHECK (jsonb_typeof("claim_map") = 'array')
);
CREATE UNIQUE INDEX "report_suggestion_decision_report_id_idempotency_key_key" ON "report_suggestion_decision" ("report_id","idempotency_key");
CREATE INDEX "report_suggestion_decision_center_id_child_id_report_id_created_at_idx" ON "report_suggestion_decision" ("center_id","child_id","report_id","created_at");
-- Do not trust only the API to preserve report/child/tenant/specialty identity.
CREATE FUNCTION report_suggestion_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM progress_report r WHERE r.id = NEW.report_id
      AND r.center_id = NEW.center_id AND r.child_id = NEW.child_id
      AND r.service = NEW.service AND r.membership_id = NEW.membership_id)
    OR NOT EXISTS (SELECT 1 FROM membership m WHERE m.id = NEW.membership_id
      AND m.center_id = NEW.center_id AND m.user_id = NEW.actor_user_id AND m.status = 'ACTIVE') THEN
    RAISE EXCEPTION 'invalid suggestion decision scope';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER report_suggestion_scope BEFORE INSERT ON report_suggestion_decision
 FOR EACH ROW EXECUTE FUNCTION report_suggestion_scope_guard();
CREATE FUNCTION report_suggestion_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'report suggestion decisions are immutable';
END $$;
CREATE TRIGGER report_suggestion_no_update BEFORE UPDATE OR DELETE ON report_suggestion_decision
 FOR EACH ROW EXECUTE FUNCTION report_suggestion_immutable();
