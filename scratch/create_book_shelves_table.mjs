import { queryDb } from '../src/lib/database/db.js';

async function migrateBookShelves() {
  console.log('--- Migrating website_book_shelves Table ---');

  // 1. Create website_book_shelves table
  await queryDb(`
    CREATE TABLE IF NOT EXISTS website_book_shelves (
      id BIGSERIAL PRIMARY KEY,
      website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
      shelf_name VARCHAR(255) NOT NULL,
      shelf_code VARCHAR(100),
      floor VARCHAR(100),
      room VARCHAR(100),
      section VARCHAR(100),
      capacity INT NOT NULL DEFAULT 50 CHECK (capacity >= 0),
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(website_id, shelf_name)
    );
  `);
  console.log('[OK] website_book_shelves table verified/created.');

  // 2. Trigger for updated_at
  await queryDb(`
    DROP TRIGGER IF EXISTS update_website_book_shelves_updated_at ON website_book_shelves;
    CREATE TRIGGER update_website_book_shelves_updated_at
      BEFORE UPDATE ON website_book_shelves
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
  console.log('[OK] Trigger update_website_book_shelves_updated_at applied.');

  // 3. Index
  await queryDb(`
    CREATE INDEX IF NOT EXISTS idx_ws_bk_shelves_web ON website_book_shelves(website_id);
  `);
  console.log('[OK] Index idx_ws_bk_shelves_web created.');

  // 4. Add shelf_id column to website_books if it does not exist
  await queryDb(`
    ALTER TABLE website_books 
    ADD COLUMN IF NOT EXISTS shelf_id BIGINT REFERENCES website_book_shelves(id) ON DELETE SET NULL;
  `);
  console.log('[OK] Column shelf_id added to website_books.');

  // 5. Index on website_books(shelf_id)
  await queryDb(`
    CREATE INDEX IF NOT EXISTS idx_ws_bk_shelf ON website_books(shelf_id);
  `);
  console.log('[OK] Index idx_ws_bk_shelf created.');

  // 6. Migrate any existing distinct shelf_location into website_book_shelves
  const distinctShelves = await queryDb(`
    SELECT DISTINCT website_id, shelf_location
    FROM website_books
    WHERE shelf_location IS NOT NULL AND TRIM(shelf_location) != ''
  `);

  for (const row of distinctShelves.rows) {
    const shelfName = row.shelf_location.trim();
    const inserted = await queryDb(`
      INSERT INTO website_book_shelves (website_id, shelf_name, shelf_code, capacity, description)
      VALUES ($1, $2, $3, 100, 'Auto-migrated from existing book shelf locations')
      ON CONFLICT (website_id, shelf_name) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [row.website_id, shelfName, shelfName.toUpperCase().replace(/\s+/g, '-').slice(0, 20)]);

    if (inserted.rows[0]) {
      await queryDb(`
        UPDATE website_books
        SET shelf_id = $1
        WHERE website_id = $2 AND shelf_location = $3 AND shelf_id IS NULL
      `, [inserted.rows[0].id, row.website_id, row.shelf_location]);
    }
  }
  console.log(`[OK] Migrated ${distinctShelves.rowCount} existing shelf locations into shelf records.`);

  console.log('=== MIGRATION COMPLETED SUCCESSFULLY ===');
  process.exit(0);
}

migrateBookShelves().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
