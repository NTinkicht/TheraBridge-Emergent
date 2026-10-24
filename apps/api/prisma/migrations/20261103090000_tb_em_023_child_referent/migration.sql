-- TB-EM-023: explicit child-wide referent. Does not authorize clinical access.
-- Apply after immutable report-suggestion ledger migration; no old migrations edited.
ALTER TABLE "child"
  ADD COLUMN "referent_membership_id" UUID,
  ADD COLUMN "referent_revision" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "child" ADD CONSTRAINT "child_referent_membership_id_fkey"
  FOREIGN KEY ("referent_membership_id") REFERENCES "membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "child_referent_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "center_id" UUID NOT NULL,
  "child_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "previous_membership_id" UUID,
  "next_membership_id" UUID,
  "reason" VARCHAR(500) NOT NULL,
  "revision" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "child_referent_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "child_referent_history_child_id_fkey" FOREIGN KEY ("child_id")
    REFERENCES "child"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "child_referent_history_revision_check" CHECK ("revision" >= 1),
  CONSTRAINT "child_referent_history_reason_check" CHECK (length(trim("reason")) >= 3)
);
CREATE UNIQUE INDEX "child_referent_history_child_id_revision_key" ON "child_referent_history" ("child_id", "revision");
CREATE INDEX "child_referent_history_center_id_child_id_created_at_idx" ON "child_referent_history" ("center_id", "child_id", "created_at");

-- Fail closed if a direct database write attempts a cross-tenant, inactive or
-- unassigned referent, even if application checks are accidentally omitted.
CREATE FUNCTION child_referent_validity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referent_membership_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "care_assignment" a
    JOIN "membership" m ON m.id = a.membership_id
    JOIN "user" u ON u.id = m.user_id
    WHERE a.child_id = NEW.id AND a.center_id = NEW.center_id
      AND a.membership_id = NEW.referent_membership_id AND a.ended_at IS NULL
      AND m.center_id = NEW.center_id AND m.status = 'ACTIVE'
      AND u.status = 'ACTIVE' AND a.service = ANY (m.specialties)
      AND EXISTS (SELECT 1 FROM "role_assignment" ra WHERE ra.membership_id = m.id AND ra.role = 'THERAPIST')
  ) THEN
    RAISE EXCEPTION 'referent must be a current, active therapist assigned to this child';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER child_referent_validate
  BEFORE INSERT OR UPDATE OF referent_membership_id ON "child"
  FOR EACH ROW EXECUTE FUNCTION child_referent_validity_guard();

CREATE FUNCTION child_referent_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "child" c WHERE c.id = NEW.child_id AND c.center_id = NEW.center_id)
    OR (NEW.previous_membership_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "membership" m WHERE m.id = NEW.previous_membership_id AND m.center_id = NEW.center_id))
    OR (NEW.next_membership_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "membership" m WHERE m.id = NEW.next_membership_id AND m.center_id = NEW.center_id))
  THEN RAISE EXCEPTION 'referent history scope mismatch';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER child_referent_history_scope
  BEFORE INSERT ON "child_referent_history"
  FOR EACH ROW EXECUTE FUNCTION child_referent_history_guard();

CREATE FUNCTION child_referent_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'referent history is immutable';
END $$;
CREATE TRIGGER child_referent_history_no_change
  BEFORE UPDATE OR DELETE ON "child_referent_history"
  FOR EACH ROW EXECUTE FUNCTION child_referent_history_immutable();
