import { query } from './db';
import { MONTHLY_FEE_DUE_DAY } from './secret';

/**
 * Automatically checks and generates monthly fee invoices for active/registered students.
 * Generates:
 * 1. Monthly Tuition Fee ("Monthly Fee (Month Year)").
 * 2. Monthly Hostel Seat Fee ("Hostel Monthly Fee (Month Year) - Seat 101A").
 * Due date: 6th day of the current calendar month (configurable via MONTHLY_FEE_DUE_DAY).
 * Status: 'unpaid'.
 */
export async function triggerMonthlyFeeGeneration(targetStudentId = null) {
  try {
    const today = new Date();
    const monthName = today.toLocaleString('en-US', { month: 'long' });
    const year = today.getFullYear();
    const monthYearTag = `${monthName} ${year}`;
    const feeTitle = `Monthly Fee (${monthYearTag})`;

    const dueDay = Math.min(Math.max(MONTHLY_FEE_DUE_DAY || 6, 1), 28);
    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    const dayStr = String(dueDay).padStart(2, '0');
    const formattedDueDate = `${year}-${monthStr}-${dayStr}`;

    // 1. Generate Class Monthly Tuition Fees
    let insertSql = `
      INSERT INTO student_fees (student_id, title, amount, due_date, status)
      SELECT 
        s.id AS student_id,
        $1::varchar AS title,
        COALESCE(cmf.amount, 0.00) AS amount,
        $2::date AS due_date,
        'unpaid' AS status
      FROM students s
      JOIN class_monthly_fees cmf ON s.class_id = cmf.class_id
      WHERE s.is_registered = TRUE
        AND s.is_active = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM student_fees sf 
          WHERE sf.student_id = s.id 
            AND LOWER(sf.title) = LOWER($1::varchar)
        )
    `;

    const params = [feeTitle, formattedDueDate];

    if (targetStudentId) {
      params.push(parseInt(targetStudentId, 10));
      insertSql += ` AND s.id = $3`;
    }

    const res = await query(insertSql, params);
    if (res.rowCount > 0) {
      console.log(`Generated ${res.rowCount} new monthly tuition fee invoices for ${monthYearTag}.`);
    }

    // 2. Generate Monthly Hostel Seat Fees for Allocated Students
    let hostelFeeSql = `
      INSERT INTO student_fees (student_id, title, amount, due_date, status)
      SELECT 
        ha.student_id,
        ('Hostel Monthly Fee (' || $1 || ') - Seat ' || hs.seat_code)::varchar AS title,
        hs.monthly_fee AS amount,
        $2::date AS due_date,
        'unpaid' AS status
      FROM hostel_allocations ha
      JOIN hostel_seats hs ON ha.seat_id = hs.id
      JOIN students s ON ha.student_id = s.id
      WHERE ha.status = 'active'
        AND s.is_active = TRUE
        AND hs.monthly_fee > 0
        AND NOT EXISTS (
          SELECT 1 FROM student_fees sf 
          WHERE sf.student_id = ha.student_id 
            AND LOWER(sf.title) = LOWER('Hostel Monthly Fee (' || $1 || ') - Seat ' || hs.seat_code)
        )
    `;

    const hostelParams = [monthYearTag, formattedDueDate];

    if (targetStudentId) {
      hostelParams.push(parseInt(targetStudentId, 10));
      hostelFeeSql += ` AND ha.student_id = $3`;
    }

    const hostelRes = await query(hostelFeeSql, hostelParams);
    if (hostelRes.rowCount > 0) {
      console.log(`Generated ${hostelRes.rowCount} new monthly hostel seat fee invoices for ${monthYearTag}.`);
    }

  } catch (err) {
    console.error('Error in triggerMonthlyFeeGeneration:', err);
  }
}
