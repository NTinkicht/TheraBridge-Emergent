-- M2-H04 / #120: forward-only integrity hardening for the CURRENT split schema.
-- The legacy audited ClinicalGoal/TherapySession/CenterTransfer models were
-- superseded; these are the current center/child/draft equivalents.

CREATE FUNCTION audit_event_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_event is append-only' USING ERRCODE = '55000';
END $$;
CREATE TRIGGER audit_event_no_mutation BEFORE UPDATE OR DELETE ON audit_event
  FOR EACH ROW EXECUTE FUNCTION audit_event_immutable();

-- Validate historical rows: do not silently accept orphaned synthetic data.
-- Restrict deletions so immutable clinical and governance evidence survives.
ALTER TABLE assessment ADD CONSTRAINT assessment_center_fk FOREIGN KEY (center_id) REFERENCES center(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE assessment ADD CONSTRAINT assessment_child_fk FOREIGN KEY (child_id) REFERENCES child(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE therapy_plan ADD CONSTRAINT therapy_plan_center_fk FOREIGN KEY (center_id) REFERENCES center(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE therapy_plan ADD CONSTRAINT therapy_plan_child_fk FOREIGN KEY (child_id) REFERENCES child(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE plan_version ADD CONSTRAINT plan_version_center_fk FOREIGN KEY (center_id) REFERENCES center(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE session_note ADD CONSTRAINT session_note_center_fk FOREIGN KEY (center_id) REFERENCES center(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE session_note ADD CONSTRAINT session_note_child_fk FOREIGN KEY (child_id) REFERENCES child(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE observation ADD CONSTRAINT observation_center_fk FOREIGN KEY (center_id) REFERENCES center(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE observation ADD CONSTRAINT observation_child_fk FOREIGN KEY (child_id) REFERENCES child(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE progress_report ADD CONSTRAINT progress_report_center_fk FOREIGN KEY (center_id) REFERENCES center(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE progress_report ADD CONSTRAINT progress_report_child_fk FOREIGN KEY (child_id) REFERENCES child(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE governance_snapshot ADD CONSTRAINT governance_snapshot_center_fk FOREIGN KEY (center_id) REFERENCES center(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE governance_snapshot ADD CONSTRAINT governance_snapshot_child_fk FOREIGN KEY (child_id) REFERENCES child(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE consent_record_draft ADD CONSTRAINT consent_record_draft_center_fk FOREIGN KEY (center_id) REFERENCES center(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE consent_record_draft ADD CONSTRAINT consent_record_draft_child_fk FOREIGN KEY (child_id) REFERENCES child(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE caseload_transfer_draft ADD CONSTRAINT caseload_transfer_draft_center_fk FOREIGN KEY (center_id) REFERENCES center(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE caseload_transfer_draft ADD CONSTRAINT caseload_transfer_draft_child_fk FOREIGN KEY (child_id) REFERENCES child(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE assessment ADD CONSTRAINT assessment_membership_fk FOREIGN KEY (membership_id) REFERENCES membership(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE therapy_plan ADD CONSTRAINT therapy_plan_creator_fk FOREIGN KEY (created_by_id) REFERENCES app_user(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE plan_version ADD CONSTRAINT plan_version_author_fk FOREIGN KEY (author_id) REFERENCES app_user(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE session_note ADD CONSTRAINT session_note_membership_fk FOREIGN KEY (membership_id) REFERENCES membership(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE observation ADD CONSTRAINT observation_membership_fk FOREIGN KEY (membership_id) REFERENCES membership(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE progress_report ADD CONSTRAINT progress_report_membership_fk FOREIGN KEY (membership_id) REFERENCES membership(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE governance_snapshot ADD CONSTRAINT governance_snapshot_author_fk FOREIGN KEY (author_id) REFERENCES app_user(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE governance_snapshot ADD CONSTRAINT governance_snapshot_generator_fk FOREIGN KEY (generated_by_id) REFERENCES app_user(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE consent_record_draft ADD CONSTRAINT consent_record_draft_creator_fk FOREIGN KEY (created_by_id) REFERENCES app_user(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE caseload_transfer_draft ADD CONSTRAINT caseload_transfer_draft_creator_fk FOREIGN KEY (created_by_id) REFERENCES app_user(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE caseload_transfer_draft ADD CONSTRAINT caseload_transfer_draft_from_fk FOREIGN KEY (from_membership_id) REFERENCES membership(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE caseload_transfer_draft ADD CONSTRAINT caseload_transfer_draft_to_fk FOREIGN KEY (to_membership_id) REFERENCES membership(id) ON DELETE RESTRICT NOT VALID;

ALTER TABLE assessment VALIDATE CONSTRAINT assessment_center_fk;
ALTER TABLE assessment VALIDATE CONSTRAINT assessment_child_fk;
ALTER TABLE therapy_plan VALIDATE CONSTRAINT therapy_plan_center_fk;
ALTER TABLE therapy_plan VALIDATE CONSTRAINT therapy_plan_child_fk;
ALTER TABLE plan_version VALIDATE CONSTRAINT plan_version_center_fk;
ALTER TABLE session_note VALIDATE CONSTRAINT session_note_center_fk;
ALTER TABLE session_note VALIDATE CONSTRAINT session_note_child_fk;
ALTER TABLE observation VALIDATE CONSTRAINT observation_center_fk;
ALTER TABLE observation VALIDATE CONSTRAINT observation_child_fk;
ALTER TABLE progress_report VALIDATE CONSTRAINT progress_report_center_fk;
ALTER TABLE progress_report VALIDATE CONSTRAINT progress_report_child_fk;
ALTER TABLE governance_snapshot VALIDATE CONSTRAINT governance_snapshot_center_fk;
ALTER TABLE governance_snapshot VALIDATE CONSTRAINT governance_snapshot_child_fk;
ALTER TABLE consent_record_draft VALIDATE CONSTRAINT consent_record_draft_center_fk;
ALTER TABLE consent_record_draft VALIDATE CONSTRAINT consent_record_draft_child_fk;
ALTER TABLE caseload_transfer_draft VALIDATE CONSTRAINT caseload_transfer_draft_center_fk;
ALTER TABLE caseload_transfer_draft VALIDATE CONSTRAINT caseload_transfer_draft_child_fk;
ALTER TABLE assessment VALIDATE CONSTRAINT assessment_membership_fk;
ALTER TABLE therapy_plan VALIDATE CONSTRAINT therapy_plan_creator_fk;
ALTER TABLE plan_version VALIDATE CONSTRAINT plan_version_author_fk;
ALTER TABLE session_note VALIDATE CONSTRAINT session_note_membership_fk;
ALTER TABLE observation VALIDATE CONSTRAINT observation_membership_fk;
ALTER TABLE progress_report VALIDATE CONSTRAINT progress_report_membership_fk;
ALTER TABLE governance_snapshot VALIDATE CONSTRAINT governance_snapshot_author_fk;
ALTER TABLE governance_snapshot VALIDATE CONSTRAINT governance_snapshot_generator_fk;
ALTER TABLE consent_record_draft VALIDATE CONSTRAINT consent_record_draft_creator_fk;
ALTER TABLE caseload_transfer_draft VALIDATE CONSTRAINT caseload_transfer_draft_creator_fk;
ALTER TABLE caseload_transfer_draft VALIDATE CONSTRAINT caseload_transfer_draft_from_fk;
ALTER TABLE caseload_transfer_draft VALIDATE CONSTRAINT caseload_transfer_draft_to_fk;

ALTER TABLE caseload_transfer_draft ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX care_assignment_center_member_active_idx ON care_assignment(center_id, membership_id, ended_at);
CREATE INDEX appointment_center_child_status_start_idx ON appointment(center_id, child_id, status, starts_at);
CREATE INDEX appointment_series_center_status_idx ON appointment_series(center_id, status);
CREATE INDEX progress_report_center_child_status_idx ON progress_report(center_id, child_id, status);
CREATE INDEX governance_history_center_doc_created_idx ON governance_history(center_id, kind, document_id, created_at);
