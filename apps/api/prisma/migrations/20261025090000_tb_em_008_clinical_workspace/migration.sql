-- AlterTable
ALTER TABLE "message_thread" ADD COLUMN     "guardian_link_id" UUID;

-- CreateTable
CREATE TABLE "assessment" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "service" VARCHAR(32) NOT NULL,
    "assessed_on" DATE NOT NULL,
    "summary" VARCHAR(4000) NOT NULL,
    "areas" JSONB NOT NULL DEFAULT '[]',
    "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_plan" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "service" VARCHAR(32) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "therapy_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_version" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    "summary" VARCHAR(4000) NOT NULL DEFAULT '',
    "goals" JSONB NOT NULL DEFAULT '[]',
    "home_activities" JSONB NOT NULL DEFAULT '[]',
    "review_notes" JSONB NOT NULL DEFAULT '[]',
    "author_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "plan_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_note" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "appointment_id" UUID,
    "service" VARCHAR(32) NOT NULL,
    "session_date" DATE NOT NULL,
    "sections" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "session_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observation" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "plan_version_id" UUID NOT NULL,
    "goal_key" VARCHAR(40) NOT NULL,
    "membership_id" UUID NOT NULL,
    "session_note_id" UUID,
    "value" DOUBLE PRECISION NOT NULL,
    "observed_on" DATE NOT NULL,
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_template" (
    "id" UUID NOT NULL,
    "center_id" UUID,
    "title" VARCHAR(120) NOT NULL,
    "service" VARCHAR(32) NOT NULL,
    "age_band" VARCHAR(32) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "materials" VARCHAR(120)[],
    "steps" VARCHAR(400)[],
    "safety" VARCHAR(400)[],
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "activity_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_center_id_child_id_idx" ON "assessment"("center_id", "child_id");

-- CreateIndex
CREATE INDEX "therapy_plan_center_id_child_id_idx" ON "therapy_plan"("center_id", "child_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_version_plan_id_number_key" ON "plan_version"("plan_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "session_note_appointment_id_key" ON "session_note"("appointment_id");

-- CreateIndex
CREATE INDEX "session_note_center_id_child_id_idx" ON "session_note"("center_id", "child_id");

-- CreateIndex
CREATE INDEX "observation_child_id_goal_key_observed_on_idx" ON "observation"("child_id", "goal_key", "observed_on");

-- CreateIndex
CREATE INDEX "activity_template_center_id_idx" ON "activity_template"("center_id");

-- AddForeignKey
ALTER TABLE "plan_version" ADD CONSTRAINT "plan_version_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "therapy_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Threads are recipient-specific: one guardian link per thread (existing synthetic threads have none and stay staff-only).
ALTER TABLE "message_thread" ADD CONSTRAINT "message_thread_guardian_link_id_fkey" FOREIGN KEY ("guardian_link_id") REFERENCES "guardian_link"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_status" CHECK ("status" IN ('DRAFT'));
ALTER TABLE "session_note" ADD CONSTRAINT "session_note_status" CHECK ("status" IN ('DRAFT'));
ALTER TABLE "plan_version" ADD CONSTRAINT "plan_version_status" CHECK ("status" IN ('DRAFT', 'IN_REVIEW', 'SUPERSEDED'));
CREATE UNIQUE INDEX "plan_version_one_open" ON "plan_version"("plan_id") WHERE "status" IN ('DRAFT', 'IN_REVIEW');

-- Synthetic platform activity library (center_id NULL). Not clinical guidance; for demonstration only.
INSERT INTO "activity_template" ("id", "center_id", "title", "service", "age_band", "minutes", "materials", "steps", "safety", "created_at") VALUES
(gen_random_uuid(), NULL, 'Bubble breath and sounds', 'speech', '3-6 years', 10, ARRAY['Bubble wand', 'Bubble liquid'], ARRAY['Sit face to face at your child''s eye level.', 'Blow one bubble and say "pop" as it bursts.', 'Pause and wait for your child to try "p" or "b" before blowing again.', 'Praise any attempt, then take turns five times.'], ARRAY['Use bubble liquid made for children and keep it out of reach.', 'Stop if your child seems tired or upset.'], now()),
(gen_random_uuid(), NULL, 'Snack-time choices', 'speech', '2-5 years', 10, ARRAY['Two small snacks your child already eats'], ARRAY['Hold up two snacks and name each one.', 'Ask "Which one?" and wait five seconds.', 'Give the snack your child points to or names, and name it again.'], ARRAY['Only use foods your child already eats safely.', 'Stay with your child while they eat.'], now()),
(gen_random_uuid(), NULL, 'Playdough pinch and roll', 'occupational', '3-7 years', 15, ARRAY['Playdough', 'Small toys to hide'], ARRAY['Roll a ball of playdough together.', 'Hide two small toys inside.', 'Ask your child to find them using pinching fingers.', 'Roll it back into a ball and repeat.'], ARRAY['Use toys too large to swallow.', 'Wash hands afterwards.'], now()),
(gen_random_uuid(), NULL, 'Pillow path balance walk', 'physical', '3-8 years', 10, ARRAY['3-5 cushions or pillows'], ARRAY['Lay the cushions in a line on a soft floor.', 'Hold your child''s hand as they step from one to the next.', 'Count each step together.', 'Let them try with less help when they feel ready.'], ARRAY['Clear the area of sharp edges and furniture.', 'Stay within arm''s reach at all times.'], now());
