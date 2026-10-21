-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLATFORM_ADMIN', 'CENTER_ADMIN', 'COORDINATOR', 'THERAPIST', 'CLINICAL_SUPERVISOR', 'GUARDIAN');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CenterStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "session" ADD COLUMN     "active_membership_id" UUID,
ADD COLUMN     "active_platform" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "active_role" "Role";

-- CreateTable
CREATE TABLE "center" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "status" "CenterStatus" NOT NULL DEFAULT 'ACTIVE',
    "timezone" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "center_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_assignment" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_role_assignment" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PLATFORM_ADMIN',
    "source" VARCHAR(32) NOT NULL,
    "granted_by_user_id" UUID,
    "reason" VARCHAR(240) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "platform_role_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "center_slug_key" ON "center"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "membership_user_id_center_id_key" ON "membership"("user_id", "center_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_assignment_membership_id_role_key" ON "role_assignment"("membership_id", "role");

-- CreateIndex
CREATE INDEX "platform_role_assignment_user_id_revoked_at_idx" ON "platform_role_assignment"("user_id", "revoked_at");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_active_membership_id_fkey" FOREIGN KEY ("active_membership_id") REFERENCES "membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_role_assignment" ADD CONSTRAINT "platform_role_assignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- TB-EM-001 R4: escalation protection enforced by the database, not only by application code.
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_center_roles_only" CHECK ("role" <> 'PLATFORM_ADMIN');
ALTER TABLE "platform_role_assignment" ADD CONSTRAINT "platform_role_assignment_platform_only" CHECK ("role" = 'PLATFORM_ADMIN');
ALTER TABLE "platform_role_assignment" ADD CONSTRAINT "platform_role_assignment_no_self_grant" CHECK (
  ("source" IN ('bootstrap', 'synthetic_seed') AND "granted_by_user_id" IS NULL)
  OR ("source" = 'grant' AND "granted_by_user_id" IS NOT NULL AND "granted_by_user_id" <> "user_id")
);
CREATE UNIQUE INDEX "platform_role_assignment_single_bootstrap" ON "platform_role_assignment" ("source") WHERE "source" = 'bootstrap';
ALTER TABLE "session" ADD CONSTRAINT "session_context_shape" CHECK (
  ("active_platform" AND "active_membership_id" IS NULL AND "active_role" IS NULL)
  OR (NOT "active_platform" AND (("active_membership_id" IS NULL) = ("active_role" IS NULL)))
);
ALTER TABLE "session" ADD CONSTRAINT "session_active_role_not_platform" CHECK ("active_role" IS NULL OR "active_role" <> 'PLATFORM_ADMIN');

