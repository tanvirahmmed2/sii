import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET assignments for a club and options
export async function GET(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_286 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_286?.error || res_err_286?.message || 'An error occurred',
        error: res_err_286?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('club_id');

    // Load static lookups
    const teachersPromise = query('SELECT id, name, email FROM teachers ORDER BY name ASC');
    const studentsPromise = query('SELECT id, name, registration_number FROM students ORDER BY name ASC');

    const [teachersRes, studentsRes] = await Promise.all([
      teachersPromise,
      studentsPromise
    ]);

    let assignedAdmins = [];
    let assignedMembers = [];

    if (clubId) {
      const adminsPromise = query(
        `SELECT teacher_id AS id, designation FROM club_admin WHERE club_id = $1`,
        [clubId]
      );
      const membersPromise = query(
        `SELECT student_id AS id FROM club_member WHERE club_id = $1`,
        [clubId]
      );

      const [adminsRes, membersRes] = await Promise.all([
        adminsPromise,
        membersPromise
      ]);

      assignedAdmins = adminsRes.rows.map(r => ({ teacher_id: parseInt(r.id, 10), designation: r.designation || '' }));
      assignedMembers = membersRes.rows.map(r => r.id);
    }

    const res_data_1521 = {
      teachers: teachersRes.rows,
      students: studentsRes.rows,
      assignedAdmins,
      assignedMembers
    };
      return NextResponse.json({
        success: true,
        message: res_data_1521?.message || 'Successfully fecthed data',
        paylod: res_data_1521
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching assignments details:', error);
    const res_err_2219 = { error: 'Failed to retrieve assignment data. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_2219?.error || res_err_2219?.message || 'An error occurred',
        error: res_err_2219?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// POST update assignments
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_2722 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_2722?.error || res_err_2722?.message || 'An error occurred',
        error: res_err_2722?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const body = await request.json();
    const { club_id, teachers, teacher_ids, student_ids } = body;

    if (!club_id) {
      const res_err_3177 = { error: 'Parameter club_id is required.' };
      return NextResponse.json({
        success: false,
        message: res_err_3177?.error || res_err_3177?.message || 'An error occurred',
        error: res_err_3177?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // 1. Wipe old assignments
    await query('DELETE FROM club_admin WHERE club_id = $1', [club_id]);

    // 2. Insert new ones
    if (teachers && Array.isArray(teachers)) {
      for (const entry of teachers) {
        const tId = typeof entry === 'object' ? entry.teacher_id : entry;
        const des = typeof entry === 'object' ? entry.designation : null;
        await query(
          'INSERT INTO club_admin (club_id, teacher_id, designation) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [club_id, tId, des ? des.trim() : null]
        );
      }
    } else if (teacher_ids && Array.isArray(teacher_ids)) {
      for (const tId of teacher_ids) {
        await query(
          'INSERT INTO club_admin (club_id, teacher_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [club_id, tId]
        );
      }
    }

    if (student_ids && Array.isArray(student_ids)) {
      for (const stId of student_ids) {
        await query(
          "INSERT INTO club_member (club_id, student_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING",
          [club_id, stId]
        );
      }
    }

    const res_data_3808 = {
      message: 'Club administrative and member roles updated successfully.'
    };
      return NextResponse.json({
        success: true,
        message: res_data_3808?.message || 'Successfully fecthed data',
        paylod: res_data_3808
      }, { status: 200 });
  } catch (error) {
    console.error('Error updating club assignments:', error);
    const res_err_5163 = { error: 'Failed to process assignments. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_5163?.error || res_err_5163?.message || 'An error occurred',
        error: res_err_5163?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
