-- CreateTable
CREATE TABLE "progress_report" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "service" VARCHAR(32) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    "sections" JSONB NOT NULL DEFAULT '{}',
    "review_notes" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "progress_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_version" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "sections" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "author_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "report_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_release" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "report_version_id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "audience" VARCHAR(32) NOT NULL,
    "released_by_id" UUID NOT NULL,
    "released_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "report_release_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "progress_report_center_id_child_id_idx" ON "progress_report"("center_id", "child_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_version_report_id_number_key" ON "report_version"("report_id", "number");

-- AddForeignKey
ALTER TABLE "report_version" ADD CONSTRAINT "report_version_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "progress_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_release" ADD CONSTRAINT "report_release_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "progress_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_release" ADD CONSTRAINT "report_release_report_version_id_fkey" FOREIGN KEY ("report_version_id") REFERENCES "report_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Report status values
ALTER TABLE "progress_report" ADD CONSTRAINT "progress_report_status_check" CHECK ("status" IN ('DRAFT', 'IN_REVIEW'));

-- Versions are an immutable history.
CREATE FUNCTION report_version_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'report_version rows are immutable';
END $$;
CREATE TRIGGER report_version_no_update BEFORE UPDATE ON "report_version" FOR EACH ROW EXECUTE FUNCTION report_version_immutable();

-- Report release is not authorized: refuse every insert until an owner-approved clinical policy replaces this trigger.
CREATE FUNCTION report_release_locked() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'report release is disabled until an owner-approved clinical policy exists';
END $$;
CREATE TRIGGER report_release_no_insert BEFORE INSERT ON "report_release" FOR EACH ROW EXECUTE FUNCTION report_release_locked();
