import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
  database: process.env.PG_DATABASE,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_sms_gateways (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          provider VARCHAR(50) NOT NULL DEFAULT 'mimsms',
          sender_id VARCHAR(100) NOT NULL,
          sender_type VARCHAR(50) NOT NULL DEFAULT 'masking' CHECK (sender_type IN ('masking', 'non-masking', 'voice')),
          api_key TEXT NOT NULL,
          client_id VARCHAR(100),
          endpoint_url TEXT,
          default_encoding VARCHAR(20) DEFAULT 'unicode' CHECK (default_encoding IN ('unicode', 'gsm')),
          balance NUMERIC(12, 2) DEFAULT 0.00,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(website_id)
      );

      CREATE INDEX IF NOT EXISTS idx_ws_sms_gw_web ON website_sms_gateways(website_id);
    `);
    console.log('website_sms_gateways table created successfully.');
  } catch (e) {
    console.error('Error creating table:', e);
  } finally {
    await pool.end();
  }
}

main();
