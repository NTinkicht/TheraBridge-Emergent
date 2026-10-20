-- CreateTable
CREATE TABLE "feasibility_probe" (
    "id" UUID NOT NULL,
    "label" VARCHAR(64) NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feasibility_probe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feasibility_probe_created_at_idx" ON "feasibility_probe"("created_at");
