BEGIN;

-- 1. Upgrade Master Field Catalog (website_form_fields)
ALTER TABLE website_form_fields
  ADD COLUMN IF NOT EXISTS is_required_in_admission BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_required_in_student BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS carry_over_to_student BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_editable_by_student BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_website_form_fields_scope_key'
  ) THEN
    ALTER TABLE website_form_fields
      ADD CONSTRAINT uq_website_form_fields_scope_key UNIQUE (website_id, target_scope, field_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_form_fields_tenant_lifecycle
  ON website_form_fields (website_id, target_scope, is_visible_in_admission, is_visible_in_student);

-- 2. Create Per-Circular Form Field Mapping Table (Decouples Circulars from Master Catalog)
CREATE TABLE IF NOT EXISTS website_admission_form_configs (
    id BIGSERIAL PRIMARY KEY,
    website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    admission_id BIGINT NOT NULL REFERENCES website_admissions(id) ON DELETE CASCADE,
    form_field_id BIGINT NOT NULL REFERENCES website_form_fields(id) ON DELETE CASCADE,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (admission_id, form_field_id)
);

CREATE INDEX IF NOT EXISTS idx_adm_form_configs_lookup
  ON website_admission_form_configs (website_id, admission_id, sort_order);

-- 3. Add Frozen Form Snapshot & Eligibility Criteria AST to website_admissions
ALTER TABLE website_admissions
  ADD COLUMN IF NOT EXISTS form_schema_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS criteria_rules JSONB NOT NULL DEFAULT '{
    "age": { "enabled": false, "min_years": null, "max_years": null, "as_of_date": null },
    "rules": { "all": [] }
  }'::jsonb;

-- 4. Add Immutable Admission Snapshot to website_student_info
ALTER TABLE website_student_info
  ADD COLUMN IF NOT EXISTS admission_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Compatibility: Ensure website_students has phone and website_admission_applicants has name
ALTER TABLE website_students
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

ALTER TABLE website_admission_applicants
  ADD COLUMN IF NOT EXISTS name VARCHAR(255);

UPDATE website_admission_applicants
SET name = applicant_name
WHERE name IS NULL AND applicant_name IS NOT NULL;

-- 5. Add GIN Indexes for High-Speed JSONB Uniqueness & Filtering
CREATE INDEX IF NOT EXISTS idx_applicant_info_jsonb_gin
  ON website_admission_applicant_info USING GIN (data jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_student_info_jsonb_gin
  ON website_student_info USING GIN (data jsonb_path_ops);

COMMIT;
