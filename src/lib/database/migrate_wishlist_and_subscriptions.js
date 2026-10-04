const { queryDb } = require('./db');

async function runMigration() {
  console.log('🚀 Running Wishlists & Subscriptions migration...');

  try {
    // 1. Wishlists Table
    await queryDb(`
      CREATE TABLE IF NOT EXISTS wishlists (
          id BIGSERIAL PRIMARY KEY,
          creator_id BIGINT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
          package_id BIGINT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(creator_id)
      );
    `);
    console.log('✅ Table wishlists created or verified.');

    await queryDb(`CREATE OR REPLACE VIEW wishlist AS SELECT * FROM wishlists;`);
    console.log('✅ View wishlist created or verified.');

    // 2. Subscriptions Table
    await queryDb(`
      CREATE TABLE IF NOT EXISTS subscriptions (
          id BIGSERIAL PRIMARY KEY,
          creator_id BIGINT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
          website_id BIGINT REFERENCES websites(id) ON DELETE SET NULL,
          package_id BIGINT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
          purchase_id BIGINT REFERENCES purchases(id) ON DELETE SET NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trailing', 'past_due', 'cancelled', 'expired')),
          billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime', 'custom')),
          current_period_start TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          current_period_end TIMESTAMPTZ,
          cancel_at_period_end BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table subscriptions created or verified.');

    await queryDb(`CREATE OR REPLACE VIEW subscription AS SELECT * FROM subscriptions;`);
    console.log('✅ View subscription created or verified.');

    // 3. Indexes
    await queryDb(`CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlists_creator_unique ON wishlists(creator_id);`);
    await queryDb(`CREATE INDEX IF NOT EXISTS idx_wishlists_package ON wishlists(package_id);`);
    await queryDb(`CREATE INDEX IF NOT EXISTS idx_subscriptions_creator ON subscriptions(creator_id);`);
    await queryDb(`CREATE INDEX IF NOT EXISTS idx_subscriptions_website ON subscriptions(website_id);`);
    await queryDb(`CREATE INDEX IF NOT EXISTS idx_subscriptions_package ON subscriptions(package_id);`);
    await queryDb(`CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);`);
    console.log('✅ Indexes created or verified.');

    // 4. Triggers
    await queryDb(`
      DROP TRIGGER IF EXISTS update_wishlists_updated_at ON wishlists;
      CREATE TRIGGER update_wishlists_updated_at
          BEFORE UPDATE ON wishlists
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await queryDb(`
      DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
      CREATE TRIGGER update_subscriptions_updated_at
          BEFORE UPDATE ON subscriptions
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Updated_at triggers created or verified.');

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration().then(() => process.exit(0));
