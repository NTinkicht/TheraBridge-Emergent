ALTER TABLE session_note
 ADD COLUMN execution_status VARCHAR(16) NOT NULL DEFAULT 'IN_PROGRESS',
 ADD COLUMN actual_start TIMESTAMPTZ(3),
 ADD COLUMN actual_end TIMESTAMPTZ(3),
 ADD COLUMN attendance VARCHAR(16) NOT NULL DEFAULT 'PRESENT',
 ADD COLUMN activities JSONB NOT NULL DEFAULT '[]',
 ADD COLUMN start_key UUID,
 ADD COLUMN last_mutation_key UUID,
 ADD COLUMN last_mutation_hash VARCHAR(64),
 ADD CONSTRAINT session_execution_status CHECK (execution_status IN ('IN_PROGRESS','COMPLETED')),
 ADD CONSTRAINT session_attendance CHECK (attendance IN ('PRESENT','NO_SHOW')),
 ADD CONSTRAINT session_actual_times CHECK (actual_end IS NULL OR (actual_start IS NOT NULL AND actual_end >= actual_start)),
 ADD CONSTRAINT session_activity_array CHECK (jsonb_typeof(activities) = 'array');
CREATE UNIQUE INDEX session_note_start_key_key ON session_note(start_key);
-- Completion is operational, never a clinical signature. Existing status=DRAFT constraint remains.
CREATE FUNCTION protect_completed_session() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.execution_status = 'COMPLETED' THEN
  RAISE EXCEPTION 'Completed session evidence is read only';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER session_completed_read_only BEFORE UPDATE OR DELETE ON session_note
 FOR EACH ROW EXECUTE FUNCTION protect_completed_session();
