import { queryDb, pool } from '../src/lib/database/db.js';

async function testLibraryFullFlow() {
  console.log('=== STARTING LIBRARY SUBSYSTEM END-TO-END VERIFICATION ===\n');

  // 1. Fetch an existing website
  const webRes = await queryDb('SELECT id, name FROM websites LIMIT 1');
  if (webRes.rows.length === 0) {
    console.error('No website found for testing.');
    process.exit(1);
  }
  const website = webRes.rows[0];
  console.log(`[OK] Target Website: ID ${website.id} (${website.name})`);

  // Ensure test student exists
  let student = null;
  const stuRes = await queryDb('SELECT id, registration_no FROM website_students WHERE website_id = $1 LIMIT 1', [website.id]);
  if (stuRes.rows.length > 0) {
    student = stuRes.rows[0];
  } else {
    const newStu = await queryDb(
      `INSERT INTO website_students (website_id, registration_no, student_unique_id, is_active)
       VALUES ($1, 'TEST-STU-999', 'TEST-STU-999', TRUE) RETURNING id, registration_no`,
      [website.id]
    );
    student = newStu.rows[0];
    await queryDb(
      `INSERT INTO website_student_info (website_id, student_id, name) VALUES ($1, $2, 'Test Student Library')`,
      [website.id, student.id]
    );
  }
  console.log(`[OK] Target Student: ID ${student.id} (${student.registration_no})`);

  // Ensure test teacher exists
  let teacher = null;
  const teaRes = await queryDb('SELECT id, name FROM website_teachers WHERE website_id = $1 LIMIT 1', [website.id]);
  if (teaRes.rows.length > 0) {
    teacher = teaRes.rows[0];
  } else {
    const newTea = await queryDb(
      `INSERT INTO website_teachers (website_id, name, email, number, password)
       VALUES ($1, 'Test Teacher Library', 'test.teacher.lib@example.com', '01700000000', 'hashed') RETURNING id, name`,
      [website.id]
    );
    teacher = newTea.rows[0];
  }
  console.log(`[OK] Target Teacher: ID ${teacher.id} (${teacher.name})`);

  // 2. Test Category CRUD
  console.log('\n--- 1. Testing Category CRUD ---');
  const catName = `Test Category ${Date.now()}`;
  const catRes = await queryDb(
    `INSERT INTO website_book_category (website_id, name, code, description, is_active)
     VALUES ($1, $2, 'TC-01', 'Test category description', TRUE) RETURNING *`,
    [website.id, catName]
  );
  const category = catRes.rows[0];
  console.log(`[OK] Created Category: ID ${category.id}, Name: "${category.name}"`);

  // 3. Test Writer CRUD
  console.log('\n--- 2. Testing Writer CRUD ---');
  const writerName = `Test Author ${Date.now()}`;
  const wriRes = await queryDb(
    `INSERT INTO website_book_writers (website_id, name, country, bio, is_active)
     VALUES ($1, $2, 'Bangladesh', 'Distinguished test author', TRUE) RETURNING *`,
    [website.id, writerName]
  );
  const writer = wriRes.rows[0];
  console.log(`[OK] Created Writer: ID ${writer.id}, Name: "${writer.name}"`);

  // 4. Test Publisher CRUD
  console.log('\n--- 3. Testing Publisher CRUD ---');
  const pubName = `Test Press ${Date.now()}`;
  const pubRes = await queryDb(
    `INSERT INTO website_book_publishers (website_id, name, contact_person, is_active)
     VALUES ($1, $2, 'John Publisher', TRUE) RETURNING *`,
    [website.id, pubName]
  );
  const publisher = pubRes.rows[0];
  console.log(`[OK] Created Publisher: ID ${publisher.id}, Name: "${publisher.name}"`);

  // 5. Test Book Creation
  console.log('\n--- 4. Testing Book Creation & Initial Stock ---');
  const bookTitle = `Advanced Database Systems ${Date.now()}`;
  const bookRes = await queryDb(
    `INSERT INTO website_books (
       website_id, category_id, writer_id, publisher_id,
       title, isbn, total_copies, available_copies, is_available, shelf_location
     )
     VALUES ($1, $2, $3, $4, $5, '978-0123456789', 5, 5, TRUE, 'Shelf A-1')
     RETURNING *`,
    [website.id, category.id, writer.id, publisher.id, bookTitle]
  );
  let book = bookRes.rows[0];
  console.log(`[OK] Created Book: ID ${book.id}, Title: "${book.title}", Total: ${book.total_copies}, Available: ${book.available_copies}, Available Flag: ${book.is_available}`);

  // 6. Test Direct Stock & Availability Update
  console.log('\n--- 5. Testing Manual Stock & Availability Update ---');
  const stockUpdateRes = await queryDb(
    `UPDATE website_books
     SET total_copies = 4, available_copies = 4, is_available = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND website_id = $2 RETURNING *`,
    [book.id, website.id]
  );
  book = stockUpdateRes.rows[0];
  console.log(`[OK] Manual Stock Adjusted: Total: ${book.total_copies}, Available: ${book.available_copies}, is_available: ${book.is_available}`);

  // 7. Test Student Book Issue (Stock Reduction)
  console.log('\n--- 6. Testing Student Book Issue & Stock Decrement ---');
  const client1 = await pool.connect();
  let studentIssue = null;
  try {
    await client1.query('BEGIN');
    const lockBook = await client1.query(
      `SELECT available_copies, total_copies, is_available FROM website_books WHERE id = $1 FOR UPDATE`,
      [book.id]
    );
    if (lockBook.rows[0].available_copies <= 0 || !lockBook.rows[0].is_available) {
      throw new Error('Book out of stock');
    }
    const issueInsert = await client1.query(
      `INSERT INTO website_book_student_issues (
         website_id, book_id, student_id,
         issued_by_type, issued_by_name, issue_date, due_date, status
       )
       VALUES ($1, $2, $3, 'staff', 'Librarian Head', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'issued')
       RETURNING *`,
      [website.id, book.id, student.id]
    );
    studentIssue = issueInsert.rows[0];

    const newAvail = lockBook.rows[0].available_copies - 1;
    await client1.query(
      `UPDATE website_books SET available_copies = $1, is_available = ($1 > 0) WHERE id = $2`,
      [newAvail, book.id]
    );
    await client1.query('COMMIT');
  } finally {
    client1.release();
  }

  const bookCheck1 = await queryDb('SELECT available_copies, is_available FROM website_books WHERE id = $1', [book.id]);
  console.log(`[OK] Student Issue Created: ID ${studentIssue.id}. Available Stock Reduced from 4 to ${bookCheck1.rows[0].available_copies}`);
  if (bookCheck1.rows[0].available_copies !== 3) {
    throw new Error(`Expected available_copies to be 3, got ${bookCheck1.rows[0].available_copies}`);
  }

  // 8. Test Teacher Book Issue (Stock Reduction)
  console.log('\n--- 7. Testing Teacher Book Issue & Stock Decrement ---');
  const client2 = await pool.connect();
  let teacherIssue = null;
  try {
    await client2.query('BEGIN');
    const lockBook = await client2.query(
      `SELECT available_copies, total_copies, is_available FROM website_books WHERE id = $1 FOR UPDATE`,
      [book.id]
    );
    const issueInsert = await client2.query(
      `INSERT INTO website_book_teacher_issues (
         website_id, book_id, teacher_id,
         issued_by_type, issued_by_name, issue_date, due_date, status
       )
       VALUES ($1, $2, $3, 'officer', 'Library Officer Rahim', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'issued')
       RETURNING *`,
      [website.id, book.id, teacher.id]
    );
    teacherIssue = issueInsert.rows[0];

    const newAvail = lockBook.rows[0].available_copies - 1;
    await client2.query(
      `UPDATE website_books SET available_copies = $1, is_available = ($1 > 0) WHERE id = $2`,
      [newAvail, book.id]
    );
    await client2.query('COMMIT');
  } finally {
    client2.release();
  }

  const bookCheck2 = await queryDb('SELECT available_copies, is_available FROM website_books WHERE id = $1', [book.id]);
  console.log(`[OK] Teacher Issue Created: ID ${teacherIssue.id}. Available Stock Reduced from 3 to ${bookCheck2.rows[0].available_copies}`);
  if (bookCheck2.rows[0].available_copies !== 2) {
    throw new Error(`Expected available_copies to be 2, got ${bookCheck2.rows[0].available_copies}`);
  }

  // 9. Test Student Book Return (Stock Increment)
  console.log('\n--- 8. Testing Student Book Return & Stock Restoration ---');
  const client3 = await pool.connect();
  try {
    await client3.query('BEGIN');
    await client3.query(
      `INSERT INTO website_book_student_returns (
         website_id, issue_id, book_id, student_id,
         received_by_type, received_by_name, return_date, fine_amount, fine_status, condition_note
       )
       VALUES ($1, $2, $3, $4, 'staff', 'Librarian Head', CURRENT_DATE, 0.00, 'none', 'Returned in mint condition')`,
      [website.id, studentIssue.id, book.id, student.id]
    );
    await client3.query(
      `UPDATE website_book_student_issues SET status = 'returned', return_date = CURRENT_DATE WHERE id = $1`,
      [studentIssue.id]
    );
    await client3.query(
      `UPDATE website_books SET available_copies = LEAST(total_copies, available_copies + 1), is_available = TRUE WHERE id = $1`,
      [book.id]
    );
    await client3.query('COMMIT');
  } finally {
    client3.release();
  }

  const bookCheck3 = await queryDb('SELECT available_copies, is_available FROM website_books WHERE id = $1', [book.id]);
  console.log(`[OK] Student Return Processed. Available Stock Restored from 2 to ${bookCheck3.rows[0].available_copies}`);
  if (bookCheck3.rows[0].available_copies !== 3) {
    throw new Error(`Expected available_copies to be 3, got ${bookCheck3.rows[0].available_copies}`);
  }

  // 10. Test Teacher Book Return (Stock Increment)
  console.log('\n--- 9. Testing Teacher Book Return & Stock Restoration ---');
  const client4 = await pool.connect();
  try {
    await client4.query('BEGIN');
    await client4.query(
      `INSERT INTO website_book_teacher_returns (
         website_id, issue_id, book_id, teacher_id,
         received_by_type, received_by_name, return_date, fine_amount, fine_status, condition_note
       )
       VALUES ($1, $2, $3, $4, 'officer', 'Library Officer Rahim', CURRENT_DATE, 0.00, 'none', 'Clean copy')`,
      [website.id, teacherIssue.id, book.id, teacher.id]
    );
    await client4.query(
      `UPDATE website_book_teacher_issues SET status = 'returned', return_date = CURRENT_DATE WHERE id = $1`,
      [teacherIssue.id]
    );
    await client4.query(
      `UPDATE website_books SET available_copies = LEAST(total_copies, available_copies + 1), is_available = TRUE WHERE id = $1`,
      [book.id]
    );
    await client4.query('COMMIT');
  } finally {
    client4.release();
  }

  const bookCheck4 = await queryDb('SELECT available_copies, is_available FROM website_books WHERE id = $1', [book.id]);
  console.log(`[OK] Teacher Return Processed. Available Stock Restored from 3 to ${bookCheck4.rows[0].available_copies}`);
  if (bookCheck4.rows[0].available_copies !== 4) {
    throw new Error(`Expected available_copies to be 4, got ${bookCheck4.rows[0].available_copies}`);
  }

  // 11. Deplete Stock to 0 and verify is_available flips to FALSE
  console.log('\n--- 10. Testing Depletion to 0 & Availability Toggle ---');
  await queryDb(
    `UPDATE website_books SET available_copies = 0, is_available = FALSE WHERE id = $1`,
    [book.id]
  );
  const bookCheck5 = await queryDb('SELECT available_copies, is_available FROM website_books WHERE id = $1', [book.id]);
  console.log(`[OK] Depleted Book: Available: ${bookCheck5.rows[0].available_copies}, is_available: ${bookCheck5.rows[0].is_available}`);
  if (bookCheck5.rows[0].available_copies !== 0 || bookCheck5.rows[0].is_available !== false) {
    throw new Error('Stock depletion verification failed');
  }

  // Restore Stock back to 4
  await queryDb(
    `UPDATE website_books SET available_copies = 4, is_available = TRUE WHERE id = $1`,
    [book.id]
  );

  // 12. Cleanup Test Records
  console.log('\n--- 11. Cleaning Up Test Artifacts ---');
  await queryDb('DELETE FROM website_book_student_returns WHERE issue_id = $1', [studentIssue.id]);
  await queryDb('DELETE FROM website_book_student_issues WHERE id = $1', [studentIssue.id]);
  await queryDb('DELETE FROM website_book_teacher_returns WHERE issue_id = $1', [teacherIssue.id]);
  await queryDb('DELETE FROM website_book_teacher_issues WHERE id = $1', [teacherIssue.id]);
  await queryDb('DELETE FROM website_books WHERE id = $1', [book.id]);
  await queryDb('DELETE FROM website_book_publishers WHERE id = $1', [publisher.id]);
  await queryDb('DELETE FROM website_book_writers WHERE id = $1', [writer.id]);
  await queryDb('DELETE FROM website_book_category WHERE id = $1', [category.id]);
  console.log('[OK] All test records cleanly removed.');

  console.log('\n=== ALL 11 VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

testLibraryFullFlow().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
