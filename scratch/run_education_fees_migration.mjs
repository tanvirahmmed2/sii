import { queryDb } from '../src/lib/database/db.js';

async function runMigration() {
  console.log('Running education fees tables migration...');
  
  const sql = `
  CREATE TABLE IF NOT EXISTS website_education_fees (
      id BIGSERIAL PRIMARY KEY,
      website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
      class_id BIGINT NOT NULL REFERENCES website_classes(id) ON DELETE CASCADE,
      session_id BIGINT REFERENCES website_sessions(id) ON DELETE SET NULL,
      fee_title VARCHAR(255) NOT NULL,
      fee_type VARCHAR(100) NOT NULL DEFAULT 'tuition',
      frequency VARCHAR(50) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'term', 'quarterly', 'yearly', 'one_time')),
      amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
      late_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (late_fee >= 0),
      due_day_of_month INT DEFAULT 10 CHECK (due_day_of_month BETWEEN 1 AND 31),
      description TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  DROP TRIGGER IF EXISTS update_website_education_fees_updated_at ON website_education_fees;
  CREATE TRIGGER update_website_education_fees_updated_at
      BEFORE UPDATE ON website_education_fees
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  CREATE INDEX IF NOT EXISTS idx_ws_edu_fees_web ON website_education_fees(website_id);
  CREATE INDEX IF NOT EXISTS idx_ws_edu_fees_class ON website_education_fees(website_id, class_id);
  CREATE INDEX IF NOT EXISTS idx_ws_edu_fees_sess ON website_education_fees(website_id, session_id);
  CREATE INDEX IF NOT EXISTS idx_ws_edu_fees_status ON website_education_fees(website_id, status);

  CREATE TABLE IF NOT EXISTS website_education_fee_payments (
      id BIGSERIAL PRIMARY KEY,
      website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
      education_fee_id BIGINT REFERENCES website_education_fees(id) ON DELETE SET NULL,
      student_id BIGINT NOT NULL REFERENCES website_students(id) ON DELETE CASCADE,
      class_id BIGINT REFERENCES website_classes(id) ON DELETE SET NULL,
      section_id BIGINT REFERENCES website_sections(id) ON DELETE SET NULL,
      session_id BIGINT REFERENCES website_sessions(id) ON DELETE SET NULL,
      invoice_no VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      fee_type VARCHAR(100) NOT NULL DEFAULT 'tuition',
      month_name VARCHAR(50),
      amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
      fine_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (fine_amount >= 0),
      paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
      due_date DATE,
      payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'partially_paid', 'waived', 'failed')),
      payment_method VARCHAR(50) DEFAULT 'online',
      transaction_id VARCHAR(100),
      paid_date TIMESTAMPTZ,
      received_by VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  DROP TRIGGER IF EXISTS update_website_education_fee_payments_updated_at ON website_education_fee_payments;
  CREATE TRIGGER update_website_education_fee_payments_updated_at
      BEFORE UPDATE ON website_education_fee_payments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  CREATE INDEX IF NOT EXISTS idx_ws_edu_pay_web ON website_education_fee_payments(website_id);
  CREATE INDEX IF NOT EXISTS idx_ws_edu_pay_fee ON website_education_fee_payments(website_id, education_fee_id);
  CREATE INDEX IF NOT EXISTS idx_ws_edu_pay_stu ON website_education_fee_payments(website_id, student_id);
  CREATE INDEX IF NOT EXISTS idx_ws_edu_pay_class ON website_education_fee_payments(website_id, class_id);
  CREATE INDEX IF NOT EXISTS idx_ws_edu_pay_status ON website_education_fee_payments(website_id, payment_status);
  CREATE INDEX IF NOT EXISTS idx_ws_edu_pay_inv ON website_education_fee_payments(website_id, invoice_no);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_edu_pay_uniq_due ON website_education_fee_payments(website_id, student_id, education_fee_id, month_name) WHERE education_fee_id IS NOT NULL;
  `;

  await queryDb(sql);
  console.log('Migration completed successfully!');

  const check = await queryDb(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name IN ('website_education_fees', 'website_education_fee_payments')
  `);
  console.log('Verified tables:', check.rows.map(r => r.table_name));
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
