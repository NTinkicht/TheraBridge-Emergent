-- CreateEnum
CREATE TYPE "CenterSource" AS ENUM ('APPLICATION', 'DIRECT');

-- CreateEnum
CREATE TYPE "InvitationKind" AS ENUM ('FIRST_ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'REPLACED');

-- AlterTable
ALTER TABLE "center" ADD COLUMN     "application_id" UUID,
ADD COLUMN     "city" VARCHAR(80),
ADD COLUMN     "country" VARCHAR(80),
ADD COLUMN     "created_by_id" UUID,
ADD COLUMN     "source" "CenterSource" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "specialties" VARCHAR(32)[],
ADD COLUMN     "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "membership" ADD COLUMN     "phone" VARCHAR(40),
ADD COLUMN     "responsibilities" VARCHAR(32)[],
ADD COLUMN     "specialties" VARCHAR(32)[],
ADD COLUMN     "status_changed_at" TIMESTAMPTZ(3),
ADD COLUMN     "status_reason" VARCHAR(500),
ADD COLUMN     "title" VARCHAR(80),
ADD COLUMN     "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "invitation" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "kind" "InvitationKind" NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "email_norm" VARCHAR(254) NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "roles" "Role"[],
    "specialties" VARCHAR(32)[],
    "responsibilities" VARCHAR(32)[],
    "title" VARCHAR(80),
    "token_hash" CHAR(64) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "send_count" INTEGER NOT NULL DEFAULT 1,
    "last_sent_at" TIMESTAMPTZ(3) NOT NULL,
    "invited_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "accepted_at" TIMESTAMPTZ(3),
    "accepted_user_id" UUID,
    "revoked_at" TIMESTAMPTZ(3),
    "revoked_by_id" UUID,
    "replaced_by_id" UUID,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_event" (
    "id" BIGSERIAL NOT NULL,
    "center_id" UUID NOT NULL,
    "type" VARCHAR(48) NOT NULL,
    "actor_user_id" UUID,
    "subject_user_id" UUID,
    "membership_id" UUID,
    "invitation_id" UUID,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "center_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_setup_step" (
    "center_id" UUID NOT NULL,
    "key" VARCHAR(32) NOT NULL,
    "completed_at" TIMESTAMPTZ(3) NOT NULL,
    "completed_by_id" UUID NOT NULL,

    CONSTRAINT "center_setup_step_pkey" PRIMARY KEY ("center_id","key")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitation_token_hash_key" ON "invitation"("token_hash");

-- CreateIndex
CREATE INDEX "invitation_center_id_status_idx" ON "invitation"("center_id", "status");

-- CreateIndex
CREATE INDEX "center_event_center_id_id_idx" ON "center_event"("center_id", "id");

-- CreateIndex
CREATE INDEX "center_event_membership_id_id_idx" ON "center_event"("membership_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "center_application_id_key" ON "center"("application_id");

-- AddForeignKey
ALTER TABLE "center" ADD CONSTRAINT "center_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "center_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_event" ADD CONSTRAINT "center_event_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_setup_step" ADD CONSTRAINT "center_setup_step_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- TB-EM-003/004 data integrity.
ALTER TABLE "center" ADD CONSTRAINT "center_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("slug") BETWEEN 3 AND 64);
ALTER TABLE "center" ADD CONSTRAINT "center_source_application" CHECK (("source" = 'APPLICATION') = ("application_id" IS NOT NULL));
CREATE UNIQUE INDEX "invitation_one_pending_per_email" ON "invitation" ("center_id", "email_norm") WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX "invitation_one_pending_first_admin" ON "invitation" ("center_id") WHERE "status" = 'PENDING' AND "kind" = 'FIRST_ADMIN';
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_roles_valid" CHECK (
  cardinality("roles") BETWEEN 1 AND 4
  AND NOT ('PLATFORM_ADMIN' = ANY ("roles")) AND NOT ('GUARDIAN' = ANY ("roles"))
  AND (("kind" = 'FIRST_ADMIN') = ('CENTER_ADMIN' = ANY ("roles")))
);
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_status_complete" CHECK (
  ("status" = 'PENDING' AND "accepted_at" IS NULL AND "revoked_at" IS NULL)
  OR ("status" = 'ACCEPTED' AND "accepted_at" IS NOT NULL AND "accepted_user_id" IS NOT NULL)
  OR ("status" IN ('REVOKED', 'REPLACED') AND "revoked_at" IS NOT NULL AND "revoked_by_id" IS NOT NULL)
);
ALTER TABLE "membership" ADD CONSTRAINT "membership_status_reason" CHECK ("status" = 'ACTIVE' OR "status_changed_at" IS NOT NULL OR "status_reason" IS NULL);

CREATE FUNCTION "center_event_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'center_event is append-only';
END;
$$;
CREATE TRIGGER "center_event_no_update" BEFORE UPDATE OR DELETE ON "center_event" FOR EACH ROW EXECUTE FUNCTION "center_event_immutable"();
