-- TB-EM-048 synthetic structured home-plan consideration requests.
-- NO access to clinical plan data, no release, and no free-text content.
CREATE TABLE "home_plan_request" (
  "id" UUID NOT NULL,
  "center_id" UUID NOT NULL,
  "child_id" UUID NOT NULL,
  "guardian_link_id" UUID NOT NULL,
  "request_key" UUID NOT NULL,
  "service" VARCHAR(32) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ(3) NOT NULL,
  "responded_at" TIMESTAMPTZ(3),
  "responded_by_id" UUID,
  CONSTRAINT "home_plan_request_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "home_plan_request_status_check" CHECK ("status" IN ('PENDING','ACKNOWLEDGED','CLOSED_UNAVAILABLE')),
  CONSTRAINT "home_plan_request_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "home_plan_request_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "child"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "home_plan_request_guardian_link_id_fkey" FOREIGN KEY ("guardian_link_id") REFERENCES "guardian_link"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "home_plan_request_responded_by_id_fkey" FOREIGN KEY ("responded_by_id") REFERENCES "membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "home_plan_request_request_key_key" ON "home_plan_request" ("request_key");
CREATE INDEX "home_plan_request_center_id_child_id_service_status_idx" ON "home_plan_request" ("center_id","child_id","service","status");
CREATE INDEX "home_plan_request_guardian_link_id_created_at_idx" ON "home_plan_request" ("guardian_link_id","created_at");
-- One pending request per current guardian link and specialty, including concurrent submissions.
CREATE UNIQUE INDEX "home_plan_request_one_pending" ON "home_plan_request" ("guardian_link_id","service") WHERE "status" = 'PENDING';
