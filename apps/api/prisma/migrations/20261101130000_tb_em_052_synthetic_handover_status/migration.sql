-- TB-EM-052 additive synthetic-only approval/commit status expansion.
-- Existing migrations remain immutable. This does not authorize clinical use.
ALTER TABLE "caseload_transfer_draft" DROP CONSTRAINT "caseload_transfer_draft_check";
ALTER TABLE "caseload_transfer_draft" ADD CONSTRAINT "caseload_transfer_draft_check"
  CHECK (
    from_membership_id <> to_membership_id
    AND (status = 'SIMULATION_ONLY'
      OR (status IN ('PENDING_ACK','ACKNOWLEDGED','CANCELLED',
                    'SYNTHETIC_APPROVED','SYNTHETIC_COMPLETED')
          AND reason IN ('STAFF_CHANGE','AVAILABILITY','FAMILY_REQUEST')))
  );
DROP INDEX "caseload_transfer_draft_one_open_handover";
CREATE UNIQUE INDEX "caseload_transfer_draft_one_open_handover"
  ON "caseload_transfer_draft" ("center_id","child_id","from_membership_id","service")
  WHERE "status" IN ('PENDING_ACK','ACKNOWLEDGED','SYNTHETIC_APPROVED');
