ALTER TABLE "private_media_candidate" ADD COLUMN "r2_cipher_sha256" VARCHAR(64), ADD COLUMN "r2_cipher_bytes" INTEGER;
ALTER TABLE "private_media_candidate" ADD CONSTRAINT "private_media_r2_pointer_check" CHECK (
  ("r2_cipher_sha256" IS NULL AND "r2_cipher_bytes" IS NULL) OR
  ("kind" = 'ACTIVITY_IMAGE' AND "r2_cipher_sha256" IS NOT NULL AND "r2_cipher_bytes" IS NOT NULL
    AND "r2_cipher_sha256" ~ '^[a-f0-9]{64}$' AND "r2_cipher_bytes" BETWEEN 30 AND 524317)
);
-- A committed pointer is immutable; a failed or revoked object is not replaced in place.
CREATE FUNCTION private_media_r2_pointer_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.r2_cipher_sha256 IS NOT NULL AND
    (NEW.r2_cipher_sha256 IS DISTINCT FROM OLD.r2_cipher_sha256 OR
     NEW.r2_cipher_bytes IS DISTINCT FROM OLD.r2_cipher_bytes OR
     NEW.center_id IS DISTINCT FROM OLD.center_id OR NEW.id IS DISTINCT FROM OLD.id) THEN
    RAISE EXCEPTION 'private media object pointer is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER private_media_r2_pointer_guard BEFORE UPDATE ON "private_media_candidate"
  FOR EACH ROW EXECUTE FUNCTION private_media_r2_pointer_immutable();
