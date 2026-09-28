import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const studentRes = await query('SELECT COUNT(*) as count FROM students');
    const teacherRes = await query('SELECT COUNT(*) as count FROM teachers');
    const classRes = await query('SELECT COUNT(*) as count FROM classes');
    
    return NextResponse.json({
      success: true,
      payload: {
        totalStudents: parseInt(studentRes.rows[0]?.count || '0', 10),
        totalTeachers: parseInt(teacherRes.rows[0]?.count || '0', 10),
        totalClasses: parseInt(classRes.rows[0]?.count || '0', 10),
      }
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}
