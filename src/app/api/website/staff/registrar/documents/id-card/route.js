import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';
import { logActivity } from '@/lib/activity_logger';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-staff')?.value || cookieStore.get('fit-admin')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const { student_id, student_ids, expiry_date } = await request.json();

    const targetStudentIds = student_ids && Array.isArray(student_ids) && student_ids.length > 0
      ? student_ids
      : (student_id ? [student_id] : []);

    if (targetStudentIds.length === 0) {
      return NextResponse.json({ success: false, error: 'student_id or student_ids is required.' }, { status: 400 });
    }

    const expDate = expiry_date || `${new Date().getFullYear()}-12-31`;

    const studentsRes = await query(`
      SELECT s.*, c.name AS class_name, sec.name AS section_name
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      WHERE s.id = ANY($1::bigint[])
    `, [targetStudentIds]);

    if (studentsRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Students not found.' }, { status: 404 });
    }

    const issuedCards = [];

    for (const student of studentsRes.rows) {
      const idCardNo = `IDC-${new Date().getFullYear()}-${String(student.id).padStart(4, '0')}`;
      
      const cardRes = await query(`
        INSERT INTO student_id_cards (
          id_card_no, student_id, issue_date, expiry_date, status, issued_by_type, issued_by_id
        ) VALUES ($1, $2, CURRENT_DATE, $3, 'active', $4, $5)
        ON CONFLICT (id_card_no) DO UPDATE SET expiry_date = EXCLUDED.expiry_date, issue_date = CURRENT_DATE, status = 'active'
        RETURNING *
      `, [idCardNo, student.id, expDate, decoded.role || 'staff', decoded.id]);

      issuedCards.push({
        id_card: cardRes.rows[0],
        student
      });
    }

    await logActivity({
      userId: decoded.id,
      userType: decoded.role || 'staff',
      action: 'ISSUE_ID_CARD',
      details: {
        student_count: issuedCards.length,
        student_ids: targetStudentIds,
        expiry_date: expDate
      }
    });

    return NextResponse.json({
      success: true,
      message: `Issued/updated ${issuedCards.length} Student ID Card(s).`,
      paylod: {
        id_cards: issuedCards,
        id_card: issuedCards[0]?.id_card,
        student: issuedCards[0]?.student
      }
    });

  } catch (error) {
    console.error('Error issuing ID card:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-staff')?.value || cookieStore.get('fit-admin')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJWT(token);

    const { student_id, student_ids } = await request.json();

    const targetStudentIds = student_ids && Array.isArray(student_ids) && student_ids.length > 0
      ? student_ids
      : (student_id ? [student_id] : []);

    if (targetStudentIds.length === 0) {
      return NextResponse.json({ success: false, error: 'student_id or student_ids is required.' }, { status: 400 });
    }

    await query(`
      DELETE FROM student_id_cards
      WHERE student_id = ANY($1::bigint[])
    `, [targetStudentIds]);

    await logActivity({
      userId: decoded?.id,
      userType: decoded?.role || 'staff',
      action: 'REVOKE_ID_CARD',
      details: {
        student_ids: targetStudentIds
      }
    });

    return NextResponse.json({
      success: true,
      message: `Revoked/Removed ID Cards for ${targetStudentIds.length} student(s).`
    });

  } catch (error) {
    console.error('Error removing ID card:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
