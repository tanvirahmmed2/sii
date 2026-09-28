import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';

export async function POST(request) {
  let client;
  try {
    const authorized = (await isAdmin()) || (await isRegister());
    if (!authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const normStatus = status ? status.toLowerCase() : '';

    if (!Array.isArray(ids) || ids.length === 0 || !normStatus || !['approved', 'rejected'].includes(normStatus)) {
      return NextResponse.json({ success: false, error: 'Valid array of applicant IDs and status (approved/rejected) are required.' }, { status: 400 });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    let processedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const rawId of ids) {
      const id = parseInt(rawId, 10);
      if (isNaN(id)) continue;

      const admRes = await client.query('SELECT * FROM student_admissions WHERE id = $1', [id]);
      if (admRes.rows.length === 0) {
        skippedCount++;
        continue;
      }

      const admission = admRes.rows[0];

      if (normStatus === 'approved') {
        const feeCheck = await client.query('SELECT status FROM admission_fees WHERE student_admission_id = $1', [id]);
        const feeStatus = feeCheck.rows[0]?.status;
        
        if (!feeStatus || feeStatus.toLowerCase() !== 'paid') {
          skippedCount++;
          errors.push(`Applicant #${id} (${admission.applicant_name}) has not paid admission fee.`);
          continue;
        }

        await client.query(`
          INSERT INTO accepted_admissions (
            student_admission_id, admission_id, class_id, applicant_name, email, phone
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (student_admission_id) DO NOTHING
        `, [
          id,
          admission.admission_id,
          admission.applied_class_id,
          admission.applicant_name,
          admission.email,
          admission.phone
        ]);

        await client.query(`
          UPDATE student_admissions SET
            status = 'approved',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [id]);
        
        processedCount++;
      } else {
        await client.query(`
          DELETE FROM accepted_admissions 
          WHERE student_admission_id = $1
        `, [id]);

        await client.query(`
          UPDATE student_admissions SET
            status = 'rejected',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [id]);

        processedCount++;
      }
    }

    await client.query('COMMIT');
    client.release();

    return NextResponse.json({
      success: true,
      message: `Bulk operation completed: ${processedCount} applicants marked as ${status}.${skippedCount > 0 ? ` ${skippedCount} applicants skipped due to pending fee.` : ''}`,
      paylod: { processedCount, skippedCount, errors }
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Error during rollback:', rollbackErr);
      }
      client.release();
    }
    console.error('Error in bulk admission update:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
