import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStudentSession } from 'src/lib/middleware/students.js';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const session = await getStudentSession(request);
    if (!session || !session.isActive || !session.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active verified student session required.' },
        { status: 401 }
      );
    }

    const studentId = session.id;

    // Fetch student info
    const studentRes = await queryDb(
      `SELECT s.id, s.registration_no, s.roll_no, s.class_id, s.section_id,
              COALESCE(s.name, i.data->>'name') AS name,
              COALESCE(g.data->>'father_name', '') AS father_name,
              COALESCE(g.data->>'mother_name', '') AS mother_name,
              COALESCE(s.gender, i.data->>'gender') AS gender,
              COALESCE(s.date_of_birth, (i.data->>'date_of_birth')::date) AS date_of_birth,
              c.name AS class_name,
              sec.name AS section_name
       FROM website_students s
       LEFT JOIN website_student_info i ON i.student_id = s.id
       LEFT JOIN website_student_guardians g ON g.student_id = s.id
       LEFT JOIN website_classes c ON c.id = s.class_id
       LEFT JOIN website_sections sec ON sec.id = s.section_id
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [studentId, website.id]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student not found.' }, { status: 404 });
    }

    const rawStudent = studentRes.rows[0];
    const student = {
      id: rawStudent.id,
      name: rawStudent.name,
      registration_number: rawStudent.registration_no,
      roll: rawStudent.roll_no,
      class_name: rawStudent.class_name || 'N/A',
      section_name: rawStudent.section_name || 'A',
      father_name: rawStudent.father_name || 'N/A',
      mother_name: rawStudent.mother_name || 'N/A',
      gender: rawStudent.gender || 'N/A',
      date_of_birth: rawStudent.date_of_birth
    };

    // Fetch testimonial requests
    let testimonials = [];
    try {
      const res = await queryDb(
        `SELECT t.*,
                s.registration_no, s.roll_no,
                COALESCE(s.name, i.data->>'name') AS student_name,
                c.name AS class_name
         FROM website_student_testimonials t
         JOIN website_students s ON s.id = t.student_id
         LEFT JOIN website_student_info i ON i.student_id = s.id
         LEFT JOIN website_classes c ON c.id = s.class_id
         WHERE t.website_id = $1 AND t.student_id = $2
         ORDER BY t.created_at DESC`,
        [website.id, studentId]
      );
      testimonials = res.rows;
    } catch (err) {
      console.error('Error fetching testimonials:', err);
    }

    // Determine latest or approved testimonial
    const approvedTestimonial = testimonials.find(t => t.status === 'approved' || t.status === 'issued') || testimonials[0] || null;
    const isProvided = approvedTestimonial ? (approvedTestimonial.status === 'approved' || approvedTestimonial.status === 'issued') : false;

    const testimonial = approvedTestimonial ? {
      testimonial_no: approvedTestimonial.certificate_no || `TEST-${String(approvedTestimonial.id).padStart(6, '0')}`,
      issue_date: approvedTestimonial.issue_date || approvedTestimonial.created_at,
      academic_character: approvedTestimonial.gpa >= 4.0 ? 'Outstanding' : 'Very Good',
      conduct: 'Satisfactory & Exemplary',
      remarks: approvedTestimonial.remarks || `Student has maintained satisfactory conduct and discipline throughout the session.`,
      status: approvedTestimonial.status,
      certificate_type: approvedTestimonial.certificate_type,
      purpose: approvedTestimonial.purpose
    } : null;

    const payload = {
      student,
      testimonials,
      testimonial,
      isProvided
    };

    return NextResponse.json({
      success: true,
      student,
      testimonials,
      testimonial,
      isProvided,
      payload,
      paylod: payload
    });
  } catch (error) {
    console.error('Error in student testimonial route:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const session = await getStudentSession(request);
    if (!session || !session.isActive || !session.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active verified student session required.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { certificate_type = 'Character Certificate', purpose, passing_year, gpa } = body;

    if (!purpose || !purpose.trim()) {
      return NextResponse.json({ success: false, error: 'Please describe the purpose of your certificate application.' }, { status: 400 });
    }

    const certRes = await queryDb(
      `INSERT INTO website_student_testimonials (
         website_id, student_id, certificate_type, purpose, passing_year, gpa, status
       ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [
        website.id,
        session.id,
        certificate_type,
        purpose.trim(),
        passing_year ? String(passing_year).trim() : null,
        gpa ? parseFloat(gpa) : null
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Certificate application submitted successfully! Registrar staff will review your request.',
      testimonial: certRes.rows[0]
    });
  } catch (error) {
    console.error('Error applying for testimonial:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
