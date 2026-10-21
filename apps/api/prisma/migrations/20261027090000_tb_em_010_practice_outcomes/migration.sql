-- CreateTable
CREATE TABLE "practice_outcome" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "guardian_link_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "service" VARCHAR(32) NOT NULL,
    "practice_date" DATE NOT NULL,
    "choice" VARCHAR(16) NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "recorded_by_id" UUID NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL,
    "acknowledged_at" TIMESTAMPTZ(3),
    "acknowledged_by_id" UUID,

    CONSTRAINT "practice_outcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "practice_outcome_idempotency_key_key" ON "practice_outcome"("idempotency_key");

-- CreateIndex
CREATE INDEX "practice_outcome_center_id_child_id_idx" ON "practice_outcome"("center_id", "child_id");

-- CreateIndex
CREATE UNIQUE INDEX "practice_outcome_guardian_link_id_template_id_practice_date_key" ON "practice_outcome"("guardian_link_id", "template_id", "practice_date");

-- AddForeignKey
ALTER TABLE "practice_outcome" ADD CONSTRAINT "practice_outcome_guardian_link_id_fkey" FOREIGN KEY ("guardian_link_id") REFERENCES "guardian_link"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_outcome" ADD CONSTRAINT "practice_outcome_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "activity_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Fixed choices only, and every outcome is synthetic until clinical and privacy approvals exist.
ALTER TABLE "practice_outcome" ADD CONSTRAINT "practice_outcome_choice_check" CHECK ("choice" IN ('COMPLETED', 'NEEDED_HELP', 'NOT_COMPLETED', 'SKIPPED'));
ALTER TABLE "practice_outcome" ADD CONSTRAINT "practice_outcome_synthetic_check" CHECK ("synthetic" = true);
