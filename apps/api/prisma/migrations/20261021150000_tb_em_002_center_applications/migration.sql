-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "center_application" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(16) NOT NULL,
    "organization_name" VARCHAR(160) NOT NULL,
    "country" VARCHAR(80) NOT NULL,
    "city" VARCHAR(80) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "contact_name" VARCHAR(120) NOT NULL,
    "contact_email" VARCHAR(254) NOT NULL,
    "contact_email_norm" VARCHAR(254) NOT NULL,
    "contact_phone" VARCHAR(40),
    "specialties" VARCHAR(32)[],
    "therapist_estimate" INTEGER NOT NULL,
    "child_estimate" INTEGER NOT NULL,
    "message" VARCHAR(2000),
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL,
    "review_started_at" TIMESTAMPTZ(3),
    "review_started_by_id" UUID,
    "decided_at" TIMESTAMPTZ(3),
    "decided_by_id" UUID,
    "decision_rationale" VARCHAR(2000),

    CONSTRAINT "center_application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_event" (
    "id" BIGSERIAL NOT NULL,
    "application_id" UUID NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "actor_user_id" UUID,
    "from_status" "ApplicationStatus",
    "to_status" "ApplicationStatus" NOT NULL,
    "note" VARCHAR(2000),
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "application_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "center_application_reference_key" ON "center_application"("reference");

-- CreateIndex
CREATE INDEX "center_application_status_submitted_at_idx" ON "center_application"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "application_event_application_id_id_idx" ON "application_event"("application_id", "id");

-- AddForeignKey
ALTER TABLE "application_event" ADD CONSTRAINT "application_event_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "center_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- TB-EM-002 data integrity: one open application per contact email; decisions require a rationale and decider.
CREATE UNIQUE INDEX "center_application_one_open_per_email" ON "center_application" ("contact_email_norm") WHERE "status" IN ('SUBMITTED', 'UNDER_REVIEW');
ALTER TABLE "center_application" ADD CONSTRAINT "center_application_decision_complete" CHECK (
  ("status" IN ('SUBMITTED', 'UNDER_REVIEW') AND "decided_at" IS NULL AND "decided_by_id" IS NULL AND "decision_rationale" IS NULL)
  OR ("status" IN ('APPROVED', 'REJECTED') AND "decided_at" IS NOT NULL AND "decided_by_id" IS NOT NULL AND length(trim("decision_rationale")) >= 10)
);
ALTER TABLE "center_application" ADD CONSTRAINT "center_application_estimates_range" CHECK ("therapist_estimate" BETWEEN 1 AND 500 AND "child_estimate" BETWEEN 0 AND 5000);

-- Append-only history: block UPDATE and DELETE on application_event.
CREATE FUNCTION "application_event_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'application_event is append-only';
END;
$$;
CREATE TRIGGER "application_event_no_update" BEFORE UPDATE OR DELETE ON "application_event" FOR EACH ROW EXECUTE FUNCTION "application_event_immutable"();

