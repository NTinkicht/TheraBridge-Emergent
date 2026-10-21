-- CreateEnum
CREATE TYPE "SeriesStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "ThreadStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "appointment" ADD COLUMN     "is_exception" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "occurrence_date" DATE,
ADD COLUMN     "series_id" UUID;

-- AlterTable
ALTER TABLE "guardian_link" ADD COLUMN     "reminders_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "appointment_series" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "service" VARCHAR(32) NOT NULL,
    "room" VARCHAR(80),
    "start_time" VARCHAR(5) NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "weekdays" INTEGER[],
    "interval_weeks" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "until_date" DATE NOT NULL,
    "status" "SeriesStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "appointment_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_notice" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "guardian_link_id" UUID NOT NULL,
    "kind" VARCHAR(24) NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "sent_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "appointment_notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_thread" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "subject" VARCHAR(120) NOT NULL,
    "category" VARCHAR(24) NOT NULL,
    "status" "ThreadStatus" NOT NULL DEFAULT 'OPEN',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "last_message_at" TIMESTAMPTZ(3) NOT NULL,
    "closed_at" TIMESTAMPTZ(3),

    CONSTRAINT "message_thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "author_kind" VARCHAR(8) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_read" (
    "thread_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "last_read_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "thread_read_pkey" PRIMARY KEY ("thread_id","user_id")
);

-- CreateIndex
CREATE INDEX "appointment_series_center_id_child_id_idx" ON "appointment_series"("center_id", "child_id");

-- CreateIndex
CREATE INDEX "appointment_notice_appointment_id_idx" ON "appointment_notice"("appointment_id");

-- CreateIndex
CREATE INDEX "message_thread_center_id_child_id_idx" ON "message_thread"("center_id", "child_id");

-- CreateIndex
CREATE INDEX "message_thread_center_id_last_message_at_idx" ON "message_thread"("center_id", "last_message_at");

-- CreateIndex
CREATE INDEX "message_thread_id_created_at_idx" ON "message"("thread_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_series_id_occurrence_date_key" ON "appointment"("series_id", "occurrence_date");

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "appointment_series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_notice" ADD CONSTRAINT "appointment_notice_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "message_thread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_read" ADD CONSTRAINT "thread_read_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "message_thread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- One 24-hour reminder per appointment, guardian and start time (a moved appointment gets a fresh reminder).
CREATE UNIQUE INDEX "appointment_notice_reminder_once" ON "appointment_notice"("appointment_id", "guardian_link_id", "starts_at") WHERE "kind" = 'reminder_24h';
ALTER TABLE "appointment_series" ADD CONSTRAINT "appointment_series_interval" CHECK ("interval_weeks" BETWEEN 1 AND 4 AND "duration_min" BETWEEN 15 AND 480);
ALTER TABLE "message_thread" ADD CONSTRAINT "message_thread_category" CHECK ("category" IN ('scheduling', 'attendance', 'logistics', 'other'));
ALTER TABLE "message" ADD CONSTRAINT "message_author_kind" CHECK ("author_kind" IN ('FAMILY', 'STAFF'));

CREATE FUNCTION "message_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'message is append-only';
END;
$$;
CREATE TRIGGER "message_no_update" BEFORE UPDATE OR DELETE ON "message" FOR EACH ROW EXECUTE FUNCTION "message_immutable"();
