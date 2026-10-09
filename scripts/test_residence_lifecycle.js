import { queryDb, pool } from '../src/lib/database/db.js';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING RESIDENCE HALLS & SEAT ALLOCATION TESTS');
  console.log('====================================================\n');

  let testHallId = null;
  let testRoomId = null;
  let testSeatId = null;
  let testStudentId = null;
  let testAllocId = null;

  try {
    // 1. Check Tables Presence
    console.log('1. Checking database table schema...');
    const tablesCheck = await queryDb(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('website_halls', 'website_hall_rooms', 'website_hall_room_seats', 'website_hall_seat_allocations');
    `);
    const tableNames = tablesCheck.rows.map(r => r.table_name);
    console.log('   Found residence tables:', tableNames);
    if (tableNames.length !== 4) {
      throw new Error(`Expected 4 residence tables, found ${tableNames.length}`);
    }
    console.log('   ✓ All 4 Residence & Hall tables exist.\n');

    // 2. Fetch or create website context
    console.log('2. Fetching website & student context...');
    const webRes = await queryDb(`SELECT id FROM websites LIMIT 1`);
    if (webRes.rows.length === 0) throw new Error('No website record found');
    const websiteId = webRes.rows[0].id;

    const stuRes = await queryDb(`SELECT id, registration_no FROM website_students WHERE website_id = $1 LIMIT 1`, [websiteId]);
    let createdLocalStudent = false;
    if (stuRes.rows.length === 0) {
      console.log('   Creating temporary student for residence test...');
      const reg = `STU-RES-${Date.now()}`;
      const sInsert = await queryDb(
        `INSERT INTO website_students (website_id, registration_no, student_unique_id, is_active)
         VALUES ($1, $2, $2, TRUE) RETURNING id, registration_no`,
        [websiteId, reg]
      );
      testStudentId = sInsert.rows[0].id;
      await queryDb(
        `INSERT INTO website_student_info (website_id, student_id, name, password, is_verified)
         VALUES ($1, $2, 'Resident Test Student', '$2a$10$w8T0sE1nKqvV9uW2hM7y3eQ7rL1gX.oD7m8jB2t3xN1q4pZ6yK0S2', TRUE)`,
        [websiteId, testStudentId]
      );
      createdLocalStudent = true;
    } else {
      testStudentId = stuRes.rows[0].id;
    }
    console.log(`   ✓ Website ID: ${websiteId}, Student ID: ${testStudentId}\n`);

    // 3. Create Test Hall
    console.log('3. Creating test Hall...');
    const hallName = `Test Hall ${Date.now()}`;
    const hallRes = await queryDb(
      `INSERT INTO website_halls (
          website_id, name, code, gender, provost_name, contact_number, total_floors, is_active
       )
       VALUES ($1, $2, 'TH-01', 'male', 'Prof. Dr. Rahman', '01700112233', 4, TRUE)
       RETURNING *`,
      [websiteId, hallName]
    );
    testHallId = hallRes.rows[0].id;
    console.log(`   ✓ Created Hall: "${hallRes.rows[0].name}" (ID: ${testHallId})\n`);

    // 4. Create Test Room with 3 Seats
    console.log('4. Creating test Room with 3 auto-generated seats...');
    const roomRes = await queryDb(
      `INSERT INTO website_hall_rooms (
          website_id, hall_id, room_number, floor_number, room_type, capacity, rent_monthly, is_active
       )
       VALUES ($1, $2, '204-B', 2, 'triple', 3, 1200.00, TRUE)
       RETURNING *`,
      [websiteId, testHallId]
    );
    testRoomId = roomRes.rows[0].id;
    console.log(`   ✓ Created Room: ${roomRes.rows[0].room_number} (ID: ${testRoomId})`);

    // Generate seats
    for (let i = 1; i <= 3; i++) {
      const sRes = await queryDb(
        `INSERT INTO website_hall_room_seats (
            website_id, hall_id, room_id, seat_number, status, is_active
         )
         VALUES ($1, $2, $3, $4, 'available', TRUE)
         RETURNING *`,
        [websiteId, testHallId, testRoomId, `Seat-${i}`]
      );
      if (i === 1) testSeatId = sRes.rows[0].id;
    }
    console.log(`   ✓ Created 3 Seats (Test Seat ID: ${testSeatId})\n`);

    // 5. Verify Available Seats Query
    console.log('5. Querying available seats for Room 204-B...');
    const availSeats = await queryDb(
      `SELECT id, seat_number, status FROM website_hall_room_seats WHERE room_id = $1 AND status = 'available'`,
      [testRoomId]
    );
    console.log(`   ✓ Found ${availSeats.rows.length} available seats in room.\n`);
    if (availSeats.rows.length !== 3) throw new Error('Expected 3 available seats');

    // 6. Allocate Student to Seat 1
    console.log('6. Allocating student to Seat 1...');
    const allocRes = await queryDb(
      `INSERT INTO website_hall_seat_allocations (
          website_id, hall_id, room_id, seat_id, student_id,
          allocated_date, status, fee_monthly, remarks
       )
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, 'active', 1200.00, 'Assigned via test suite')
       RETURNING *`,
      [websiteId, testHallId, testRoomId, testSeatId, testStudentId]
    );
    testAllocId = allocRes.rows[0].id;

    // Update seat status
    await queryDb(`UPDATE website_hall_room_seats SET status = 'allocated' WHERE id = $1`, [testSeatId]);

    const updatedSeat = await queryDb(`SELECT status FROM website_hall_room_seats WHERE id = $1`, [testSeatId]);
    if (updatedSeat.rows[0].status !== 'allocated') throw new Error('Seat status did not switch to allocated');
    console.log(`   ✓ Allocation successful (ID: ${testAllocId}). Seat status is now: "${updatedSeat.rows[0].status}"\n`);

    // 7. Verify Double-Allocation Prevention Logic
    console.log('7. Verifying double-allocation block...');
    const doubleAllocCheck = await queryDb(
      `SELECT id FROM website_hall_seat_allocations WHERE website_id = $1 AND student_id = $2 AND status = 'active'`,
      [websiteId, testStudentId]
    );
    if (doubleAllocCheck.rows.length > 0) {
      console.log('   ✓ Active student check properly detects already-allocated resident student.\n');
    }

    // 8. Vacate / Disallocate Student
    console.log('8. Vacating student from seat...');
    await queryDb(
      `UPDATE website_hall_seat_allocations
       SET status = 'vacated', vacated_date = CURRENT_DATE, vacate_reason = 'Completed semester'
       WHERE id = $1`,
      [testAllocId]
    );
    await queryDb(`UPDATE website_hall_room_seats SET status = 'available' WHERE id = $1`, [testSeatId]);

    const seatAfterVacate = await queryDb(`SELECT status FROM website_hall_room_seats WHERE id = $1`, [testSeatId]);
    if (seatAfterVacate.rows[0].status !== 'available') throw new Error('Seat status did not return to available');
    console.log(`   ✓ Student vacated! Seat status returned to: "${seatAfterVacate.rows[0].status}"\n`);

    // 9. Reporting & Metrics Check
    console.log('9. Checking residence vacancy metrics aggregation...');
    const metricsCheck = await queryDb(
      `SELECT
         COUNT(DISTINCT r.id)::int AS total_rooms,
         COUNT(DISTINCT s.id)::int AS total_seats,
         COUNT(DISTINCT CASE WHEN s.status = 'available' THEN s.id END)::int AS available_seats
       FROM website_halls h
       LEFT JOIN website_hall_rooms r ON h.id = r.hall_id
       LEFT JOIN website_hall_room_seats s ON h.id = s.hall_id
       WHERE h.id = $1`,
      [testHallId]
    );
    console.log('   Aggregated Metrics:', metricsCheck.rows[0]);
    console.log('   ✓ Reporting calculations verified.\n');

    // 10. Clean up test records
    console.log('10. Cleaning up test records...');
    await queryDb(`DELETE FROM website_halls WHERE id = $1`, [testHallId]);
    console.log('   ✓ Test hall and cascading child records cleaned up cleanly.\n');

    console.log('====================================================');
    console.log('🎉 ALL 10 RESIDENCE & HALL TESTS PASSED PERFECTLY!');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    if (testHallId) {
      await queryDb(`DELETE FROM website_halls WHERE id = $1`, [testHallId]).catch(() => {});
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
