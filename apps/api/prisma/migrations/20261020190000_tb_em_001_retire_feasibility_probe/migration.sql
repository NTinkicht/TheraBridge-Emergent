-- TB-EM-001 checkpoint 0: retire the TB-EM-000 feasibility probe table.
DROP TABLE "feasibility_probe";

-- Minimal non-domain table: Prisma cannot generate a client for a schema with zero models.
-- Holds no personal or clinical data. To be dropped once checkpoint A adds the identity models.
CREATE TABLE "schema_info" (
    "key" VARCHAR(64) NOT NULL,
    "value" VARCHAR(128) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "schema_info_pkey" PRIMARY KEY ("key")
);

INSERT INTO "schema_info" ("key", "value") VALUES ('checkpoint', 'TB-EM-001-cp0');
