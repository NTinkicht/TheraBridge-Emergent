-- M5 owner observation 09: optional public-operational centre contact details.
-- Nullable additive columns preserve all existing centers, provisioning,
-- and demo fixtures. No patient, guardian or clinical data is persisted.
ALTER TABLE "center"
  ADD COLUMN "contact_email" VARCHAR(254),
  ADD COLUMN "contact_phone" VARCHAR(40);
