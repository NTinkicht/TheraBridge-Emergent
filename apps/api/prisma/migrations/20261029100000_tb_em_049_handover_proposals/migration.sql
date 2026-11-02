-- TB-EM-049: permit only narrowly enumerated non-authorizing operational statuses.
-- Preserve legacy SIMULATION_ONLY semantics and the different-staff constraint.
ALTER TABLE "caseload_transfer_draft" DROP CONSTRAINT "caseload_transfer_draft_check";
ALTER TABLE "caseload_transfer_draft" ADD CONSTRAINT "caseload_transfer_draft_check"
  CHECK (
    from_membership_id <> to_membership_id
    AND (status = 'SIMULATION_ONLY'
      OR (status IN ('PENDING_ACK','ACKNOWLEDGED','CANCELLED')
          AND reason IN ('STAFF_CHANGE','AVAILABILITY','FAMILY_REQUEST')))
  );
-- Enforce one open operational handover per source assignment even outside the API.
CREATE UNIQUE INDEX "caseload_transfer_draft_one_open_handover"
  ON "caseload_transfer_draft" ("center_id","child_id","from_membership_id","service")
  WHERE "status" IN ('PENDING_ACK','ACKNOWLEDGED');
CREATE INDEX "caseload_transfer_draft_center_status_created_idx"
  ON "caseload_transfer_draft" ("center_id","status","created_at");
CREATE INDEX "caseload_transfer_draft_center_target_status_created_idx"
  ON "caseload_transfer_draft" ("center_id","to_membership_id","status","created_at");
