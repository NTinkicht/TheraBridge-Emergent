-- CreateEnum
CREATE TYPE "ChildStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- AlterEnum
ALTER TYPE "InvitationKind" ADD VALUE 'GUARDIAN';

-- AlterTable
ALTER TABLE "center" ADD COLUMN     "trial_ends_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "invitation" ADD COLUMN     "guardian_link_id" UUID;

-- CreateTable
CREATE TABLE "child" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "first_name" VARCHAR(80) NOT NULL,
    "last_name" VARCHAR(80) NOT NULL,
    "preferred_name" VARCHAR(80),
    "date_of_birth" DATE NOT NULL,
    "services" VARCHAR(32)[],
    "status" "ChildStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardian_link" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "email_norm" VARCHAR(254) NOT NULL,
    "relationship" VARCHAR(32) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID,
    "removed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "guardian_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_assignment" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "service" VARCHAR(32) NOT NULL,
    "is_lead" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "ended_at" TIMESTAMPTZ(3),

    CONSTRAINT "care_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "service" VARCHAR(32) NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "room" VARCHAR(80),
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "status_reason" VARCHAR(500),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "child_center_id_status_idx" ON "child"("center_id", "status");

-- CreateIndex
CREATE INDEX "guardian_link_user_id_idx" ON "guardian_link"("user_id");

-- CreateIndex
CREATE INDEX "care_assignment_membership_id_idx" ON "care_assignment"("membership_id");

-- CreateIndex
CREATE INDEX "appointment_center_id_starts_at_idx" ON "appointment"("center_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointment_membership_id_starts_at_idx" ON "appointment"("membership_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointment_child_id_starts_at_idx" ON "appointment"("child_id", "starts_at");

-- AddForeignKey
ALTER TABLE "child" ADD CONSTRAINT "child_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_link" ADD CONSTRAINT "guardian_link_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_link" ADD CONSTRAINT "guardian_link_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_assignment" ADD CONSTRAINT "care_assignment_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- TB-EM-005: every V1 center is a 30-day trial (no billing). Existing centers start from their creation date.
UPDATE "center" SET "trial_ends_at" = "created_at" + interval '30 days' WHERE "trial_ends_at" IS NULL;

-- Guardian invitations carry exactly the GUARDIAN role and a guardian link.
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_roles_valid";
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_roles_valid" CHECK (
  cardinality("roles") BETWEEN 1 AND 4
  AND NOT ('PLATFORM_ADMIN' = ANY ("roles"))
  AND (("kind"::text = 'FIRST_ADMIN') = ('CENTER_ADMIN' = ANY ("roles")))
  AND (("kind"::text = 'GUARDIAN') = ('GUARDIAN' = ANY ("roles")))
  AND ("kind"::text <> 'GUARDIAN' OR (cardinality("roles") = 1 AND "guardian_link_id" IS NOT NULL))
);

CREATE UNIQUE INDEX "guardian_link_active_email" ON "guardian_link" ("child_id", "email_norm") WHERE "removed_at" IS NULL;
CREATE UNIQUE INDEX "guardian_link_one_primary" ON "guardian_link" ("child_id") WHERE "removed_at" IS NULL AND "is_primary";
CREATE UNIQUE INDEX "care_assignment_active" ON "care_assignment" ("child_id", "membership_id", "service") WHERE "ended_at" IS NULL;
ALTER TABLE "child" ADD CONSTRAINT "child_dob_range" CHECK ("date_of_birth" >= DATE '1990-01-01');
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_time_order" CHECK ("ends_at" > "starts_at" AND "ends_at" <= "starts_at" + interval '8 hours');
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_status_reason" CHECK ("status" NOT IN ('CANCELLED', 'NO_SHOW') OR "status_reason" IS NOT NULL);
