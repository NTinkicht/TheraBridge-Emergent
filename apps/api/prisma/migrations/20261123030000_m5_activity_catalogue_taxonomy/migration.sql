-- M5-12: optional staff-authored catalogue filters; do not invent clinical classifications.
ALTER TABLE "activity_template"
  ADD COLUMN "category" VARCHAR(80),
  ADD COLUMN "skill" VARCHAR(80),
  ADD COLUMN "equipment" VARCHAR(120)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(120)[];
