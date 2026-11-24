CREATE TABLE "activity_artwork_approval" (
    "candidate_id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "template_version" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "digest_sha256" VARCHAR(64) NOT NULL,
    "context_sha256" VARCHAR(64) NOT NULL,
    "rights_evidence_sha256" VARCHAR(64) NOT NULL,
    "clinical_evidence_sha256" VARCHAR(64) NOT NULL,
    "rights_signature" VARCHAR(88) NOT NULL,
    "clinical_signature" VARCHAR(88) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_artwork_approval_pkey" PRIMARY KEY ("candidate_id"),
    CONSTRAINT "activity_artwork_approval_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "private_media_candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "activity_artwork_approval_scope_check" CHECK ("template_version" > 0 AND "slot" BETWEEN 0 AND 64),
    CONSTRAINT "activity_artwork_approval_digest_check" CHECK (
      "digest_sha256" ~ '^[a-f0-9]{64}$' AND "context_sha256" ~ '^[a-f0-9]{64}$' AND
      "rights_evidence_sha256" ~ '^[a-f0-9]{64}$' AND "clinical_evidence_sha256" ~ '^[a-f0-9]{64}$' AND
      "rights_evidence_sha256" <> "clinical_evidence_sha256"
    )
);
CREATE UNIQUE INDEX "activity_artwork_approval_slot_key" ON "activity_artwork_approval"("center_id", "template_id", "template_version", "slot");
