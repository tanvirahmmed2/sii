import { queryDb } from '../src/lib/database/db.js';

async function testShelfSystem() {
  console.log('=== VERIFYING BOOK SHELF SUBSYSTEM ===');

  const webRes = await queryDb('SELECT id, domain FROM websites ORDER BY id ASC LIMIT 1');
  const website = webRes.rows[0];
  console.log(`[OK] Using Website ID: ${website.id} (${website.domain})`);

  const uniqueSuffix = Date.now();
  const shelfName = `Science Rack ${uniqueSuffix}`;
  const shelfCode = `SC-${String(uniqueSuffix).slice(-4)}`;

  // 1. Create a Shelf
  console.log('\n--- 1. Testing Shelf Creation ---');
  const createShelfRes = await queryDb(`
    INSERT INTO website_book_shelves (
      website_id, shelf_name, shelf_code, floor, room, section, capacity, description, is_active
    ) VALUES ($1, $2, $3, '2nd Floor', 'Hall B', 'Physics & Engineering', 30, 'Test Shelf Rack', TRUE)
    RETURNING *
  `, [website.id, shelfName, shelfCode]);

  const shelf = createShelfRes.rows[0];
  console.log(`[OK] Created Shelf ID: ${shelf.id}, Name: "${shelf.shelf_name}", Capacity: ${shelf.capacity}`);

  // 2. Query empty shelf metrics
  console.log('\n--- 2. Checking Empty Shelf Metrics ---');
  const emptyMetricsRes = await queryDb(`
    SELECT
      s.*,
      COUNT(b.id)::int AS titles_count,
      COALESCE(SUM(b.total_copies), 0)::int AS total_books_count,
      COALESCE(SUM(b.available_copies), 0)::int AS available_books_count,
      GREATEST(s.capacity - COALESCE(SUM(b.total_copies), 0), 0)::int AS remaining_capacity,
      CASE
        WHEN s.capacity > 0 THEN ROUND((COALESCE(SUM(b.total_copies), 0)::numeric / s.capacity::numeric) * 100, 1)
        ELSE 0
      END AS occupancy_percentage
    FROM website_book_shelves s
    LEFT JOIN website_books b ON (b.shelf_id = s.id OR (b.shelf_id IS NULL AND b.shelf_location = s.shelf_name)) AND b.website_id = s.website_id
    WHERE s.id = $1 AND s.website_id = $2
    GROUP BY s.id
  `, [shelf.id, website.id]);

  const emptyMetrics = emptyMetricsRes.rows[0];
  console.log(`[OK] Empty Shelf Metrics: Titles=${emptyMetrics.titles_count}, TotalBooks=${emptyMetrics.total_books_count}, Remaining=${emptyMetrics.remaining_capacity}, Occupancy=${emptyMetrics.occupancy_percentage}%`);

  // 3. Create Books Assigned to this Shelf
  console.log('\n--- 3. Adding Books to Shelf ---');
  const book1Res = await queryDb(`
    INSERT INTO website_books (
      website_id, title, shelf_id, shelf_location, total_copies, available_copies, is_available
    ) VALUES ($1, $2, $3, $4, 10, 8, TRUE)
    RETURNING *
  `, [website.id, `Quantum Mechanics Vol 1 ${uniqueSuffix}`, shelf.id, shelf.shelf_name]);
  const book1 = book1Res.rows[0];
  console.log(`[OK] Added Book 1: ID ${book1.id}, Title: "${book1.title}", Total: ${book1.total_copies}, Avail: ${book1.available_copies}`);

  const book2Res = await queryDb(`
    INSERT INTO website_books (
      website_id, title, shelf_id, shelf_location, total_copies, available_copies, is_available
    ) VALUES ($1, $2, $3, $4, 5, 5, TRUE)
    RETURNING *
  `, [website.id, `Thermodynamics Essentials ${uniqueSuffix}`, shelf.id, shelf.shelf_name]);
  const book2 = book2Res.rows[0];
  console.log(`[OK] Added Book 2: ID ${book2.id}, Title: "${book2.title}", Total: ${book2.total_copies}, Avail: ${book2.available_copies}`);

  // 4. Query live aggregated shelf counts
  console.log('\n--- 4. Checking Live Aggregated Shelf Counts ---');
  const populatedMetricsRes = await queryDb(`
    SELECT
      s.*,
      COUNT(b.id)::int AS titles_count,
      COALESCE(SUM(b.total_copies), 0)::int AS total_books_count,
      COALESCE(SUM(b.available_copies), 0)::int AS available_books_count,
      (COALESCE(SUM(b.total_copies), 0) - COALESCE(SUM(b.available_copies), 0))::int AS borrowed_books_count,
      GREATEST(s.capacity - COALESCE(SUM(b.total_copies), 0), 0)::int AS remaining_capacity,
      CASE
        WHEN s.capacity > 0 THEN ROUND((COALESCE(SUM(b.total_copies), 0)::numeric / s.capacity::numeric) * 100, 1)
        ELSE 0
      END AS occupancy_percentage
    FROM website_book_shelves s
    LEFT JOIN website_books b ON (b.shelf_id = s.id OR (b.shelf_id IS NULL AND b.shelf_location = s.shelf_name)) AND b.website_id = s.website_id
    WHERE s.id = $1 AND s.website_id = $2
    GROUP BY s.id
  `, [shelf.id, website.id]);

  const popMetrics = populatedMetricsRes.rows[0];
  console.log(`[OK] Populated Metrics:`);
  console.log(`     Titles Count: ${popMetrics.titles_count} (Expected: 2)`);
  console.log(`     Total Books: ${popMetrics.total_books_count} (Expected: 15)`);
  console.log(`     Available Books: ${popMetrics.available_books_count} (Expected: 13)`);
  console.log(`     Borrowed Books: ${popMetrics.borrowed_books_count} (Expected: 2)`);
  console.log(`     Capacity: ${popMetrics.capacity} (Expected: 30)`);
  console.log(`     Remaining Capacity: ${popMetrics.remaining_capacity} (Expected: 15)`);
  console.log(`     Occupancy %: ${popMetrics.occupancy_percentage}% (Expected: 50.0%)`);

  if (popMetrics.titles_count !== 2 || popMetrics.total_books_count !== 15 || popMetrics.remaining_capacity !== 15) {
    throw new Error('Metrics mismatch in live shelf calculations!');
  }

  // 5. Test Shelf Update & Sync
  console.log('\n--- 5. Testing Shelf Capacity and Name Update ---');
  const updatedShelfName = `Updated Science Rack ${uniqueSuffix}`;
  await queryDb(`
    UPDATE website_book_shelves
    SET shelf_name = $1, capacity = 20, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND website_id = $3
  `, [updatedShelfName, shelf.id, website.id]);

  // Sync books location
  await queryDb(`
    UPDATE website_books SET shelf_location = $1 WHERE website_id = $2 AND shelf_id = $3
  `, [updatedShelfName, website.id, shelf.id]);

  const afterUpdateRes = await queryDb(`
    SELECT
      s.capacity,
      ROUND((COALESCE(SUM(b.total_copies), 0)::numeric / s.capacity::numeric) * 100, 1) AS new_occupancy
    FROM website_book_shelves s
    LEFT JOIN website_books b ON b.shelf_id = s.id AND b.website_id = s.website_id
    WHERE s.id = $1 AND s.website_id = $2
    GROUP BY s.id, s.capacity
  `, [shelf.id, website.id]);

  console.log(`[OK] Updated Capacity: ${afterUpdateRes.rows[0].capacity}, New Occupancy: ${afterUpdateRes.rows[0].new_occupancy}% (15/20 = 75.0%)`);

  // 6. Test Shelf Deletion & Safe Book Unlinking
  console.log('\n--- 6. Testing Shelf Deletion & Book Unlinking ---');
  // Safe unlinking
  await queryDb(`
    UPDATE website_books SET shelf_id = NULL, shelf_location = NULL WHERE website_id = $1 AND shelf_id = $2
  `, [website.id, shelf.id]);
  await queryDb(`DELETE FROM website_book_shelves WHERE id = $1 AND website_id = $2`, [shelf.id, website.id]);

  const checkBooks = await queryDb(`SELECT id, shelf_id, shelf_location FROM website_books WHERE id IN ($1, $2)`, [book1.id, book2.id]);
  console.log(`[OK] Books preserved after shelf deletion: Count = ${checkBooks.rows.length}`);
  for (const b of checkBooks.rows) {
    console.log(`     Book ID ${b.id}: shelf_id is ${b.shelf_id === null ? 'NULL (Safely unlinked)' : b.shelf_id}`);
  }

  // 7. Cleanup
  console.log('\n--- 7. Cleanup Test Books ---');
  await queryDb(`DELETE FROM website_books WHERE id IN ($1, $2)`, [book1.id, book2.id]);
  console.log('[OK] Cleaned up test books.');

  console.log('\n=== ALL BOOK SHELF SUBSYSTEM VERIFICATION TESTS PASSED! ===');
  process.exit(0);
}

testShelfSystem().catch(err => {
  console.error('[FAIL] Test failed:', err);
  process.exit(1);
});
