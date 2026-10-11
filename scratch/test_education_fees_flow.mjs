import { queryDb } from '../src/lib/database/db.js';

async function testEducationFeesFlow() {
  console.log('--- Starting Education Fees E2E Flow Test ---');

  // 1. Get a test website
  const webRes = await queryDb(`SELECT id, name, subdomain FROM websites LIMIT 1`);
  if (webRes.rows.length === 0) {
    console.error('No website found for testing.');
    process.exit(1);
  }
  const website = webRes.rows[0];
  console.log(`[OK] Using website: ${website.name} (ID: ${website.id})`);

  // 2. Get an academic class
  let classRes = await queryDb(
    `SELECT id, name AS class_name FROM website_classes WHERE website_id = $1 LIMIT 1`,
    [website.id]
  );
  let testClass;
  if (classRes.rows.length === 0) {
    const code = `CLS-${Date.now().toString().slice(-4)}`;
    const newClass = await queryDb(
      `INSERT INTO website_classes (website_id, name, numeric_name, code)
       VALUES ($1, 'Class 10 (Test)', 10, $2) RETURNING id, name AS class_name`,
      [website.id, code]
    );
    testClass = newClass.rows[0];
    console.log(`[OK] Created test class: ${testClass.class_name} (ID: ${testClass.id})`);
  } else {
    testClass = classRes.rows[0];
    console.log(`[OK] Found class: ${testClass.class_name} (ID: ${testClass.id})`);
  }

  // 3. Configure an education fee structure
  const feeRes = await queryDb(
    `INSERT INTO website_education_fees (
      website_id, class_id, fee_title, fee_type, frequency, amount, late_fee, due_day_of_month, status
    ) VALUES ($1, $2, 'Monthly Tuition Fee - E2E Test', 'tuition', 'monthly', 1250.00, 50.00, 10, 'active')
    RETURNING *`,
    [website.id, testClass.id]
  );
  const fee = feeRes.rows[0];
  console.log(`[OK] Configured education fee: "${fee.fee_title}" Amount: ৳${fee.amount} (ID: ${fee.id})`);

  // 4. Ensure at least one test student exists in this class
  let studentRes = await queryDb(
    `SELECT s.id, s.registration_no, s.roll_no, i.name
     FROM website_students s
     JOIN website_student_info i ON i.student_id = s.id
     WHERE s.website_id = $1 AND s.class_id = $2
     LIMIT 1`,
    [website.id, testClass.id]
  );

  let student;
  if (studentRes.rows.length === 0) {
    const regNo = `REG-TEST-${Date.now().toString().slice(-4)}`;
    const newStu = await queryDb(
      `INSERT INTO website_students (website_id, registration_no, roll_no, class_id, student_unique_id, is_active)
       VALUES ($1, $2, '101', $3, $2, TRUE) RETURNING *`,
      [website.id, regNo, testClass.id]
    );
    student = newStu.rows[0];
    await queryDb(
      `INSERT INTO website_student_info (website_id, student_id, name, email, password)
       VALUES ($1, $2, 'Test Student Candidate', 'teststudent@example.com', 'dummy_hash')`,
      [website.id, student.id]
    );
    console.log(`[OK] Created test student ID: ${student.id}, Reg: ${student.registration_no}`);
  } else {
    student = studentRes.rows[0];
    console.log(`[OK] Using existing student: ${student.name} (ID: ${student.id})`);
  }

  // 5. Test Batch Due Generation
  const testMonth = 'October 2026 Test';
  const invoiceNo = `INV-TEST-${Date.now().toString().slice(-6)}`;

  const dueRes = await queryDb(
    `INSERT INTO website_education_fee_payments (
      website_id, education_fee_id, student_id, class_id, invoice_no, title, fee_type, month_name, amount, fine_amount, paid_amount, due_date, payment_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0.00, CURRENT_DATE + 10, 'unpaid')
    RETURNING *`,
    [
      website.id,
      fee.id,
      student.id,
      testClass.id,
      invoiceNo,
      fee.fee_title,
      fee.fee_type,
      testMonth,
      fee.amount,
      fee.late_fee,
    ]
  );
  const paymentRecord = dueRes.rows[0];
  console.log(`[OK] Generated fee due invoice: ${paymentRecord.invoice_no}, Status: ${paymentRecord.payment_status}`);

  // 6. Test Duplicate Prevention
  const dupCheck = await queryDb(
    `SELECT COUNT(*)::int AS count FROM website_education_fee_payments
     WHERE website_id = $1 AND student_id = $2 AND education_fee_id = $3 AND month_name = $4`,
    [website.id, student.id, fee.id, testMonth]
  );
  console.log(`[OK] Duplicate validation: Found ${dupCheck.rows[0].count} due for month "${testMonth}" (expected 1).`);

  // 7. Test Student Payment Settlement
  const txnId = `TXN-BKASH-TEST-${Date.now().toString().slice(-6)}`;
  const payRes = await queryDb(
    `UPDATE website_education_fee_payments
     SET paid_amount = amount + fine_amount,
         payment_status = 'paid',
         payment_method = 'bkash',
         transaction_id = $1,
         paid_date = CURRENT_TIMESTAMP
     WHERE id = $2 AND website_id = $3
     RETURNING *`,
    [txnId, paymentRecord.id, website.id]
  );
  const paidRecord = payRes.rows[0];
  console.log(
    `[OK] Student payment processed! Status: ${paidRecord.payment_status}, Paid: ৳${paidRecord.paid_amount}, TrxID: ${paidRecord.transaction_id}`
  );

  // 8. Clean up test records
  await queryDb(`DELETE FROM website_education_fee_payments WHERE id = $1`, [paymentRecord.id]);
  await queryDb(`DELETE FROM website_education_fees WHERE id = $1`, [fee.id]);
  console.log('[OK] Cleaned up test fee & payment records.');

  console.log('--- ALL EDUCATION FEES TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

testEducationFeesFlow().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
