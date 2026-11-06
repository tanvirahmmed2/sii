BEGIN;

-- 1. Add monthly email & SMS quotas to packages table
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS monthly_mail INT NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS monthly_sms INT NOT NULL DEFAULT 200;

-- Update existing default package tiers with realistic quotas
UPDATE packages
SET monthly_mail = 1000, monthly_sms = 200
WHERE slug = 'starter-academy' OR slug LIKE '%starter%';

UPDATE packages
SET monthly_mail = 5000, monthly_sms = 1000
WHERE slug = 'pro-school-campus' OR slug LIKE '%pro%';

UPDATE packages
SET monthly_mail = 25000, monthly_sms = 5000
WHERE slug = 'enterprise-university-chain' OR slug LIKE '%enterprise%';

-- 2. Create monthly usage tracking table for tenant websites
CREATE TABLE IF NOT EXISTS website_monthly_usages (
    id BIGSERIAL PRIMARY KEY,
    website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    year_month VARCHAR(7) NOT NULL, -- e.g. '2026-11'
    mail_count INT NOT NULL DEFAULT 0,
    sms_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(website_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_ws_monthly_usages_lookup
  ON website_monthly_usages(website_id, year_month);

DROP TRIGGER IF EXISTS update_website_monthly_usages_updated_at ON website_monthly_usages;
CREATE TRIGGER update_website_monthly_usages_updated_at
    BEFORE UPDATE ON website_monthly_usages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Drop legacy per-website mailer and SMS sender tables
DROP TABLE IF EXISTS website_brevo_mailer CASCADE;
DROP TABLE IF EXISTS website_sms_gateways CASCADE;

-- 4. Clean up any control panel modules referring to custom mailer / sms configs
DELETE FROM package_control_modules
WHERE control_module_id IN (
  SELECT id FROM website_control_modules WHERE slug IN ('configure-mailer', 'configure-sms', 'mailer', 'sms-gateway')
);

DELETE FROM website_control_modules
WHERE slug IN ('configure-mailer', 'configure-sms', 'mailer', 'sms-gateway');

COMMIT;

