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

    const { searchParams } = new URL(request.url);
    const subjectIdParam = searchParams.get('subject_id') || searchParams.get('class_subject_id');

    // Fetch student's class
    const studentRes = await queryDb(
      `SELECT s.id, s.class_id, s.section_id, s.session_id
       FROM website_students s
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [session.id, website.id]
    );

    if (studentRes.rows.length === 0 || !studentRes.rows[0].class_id) {
      return NextResponse.json({ success: true, materials: [], payload: { materials: [] } });
    }

    const student = studentRes.rows[0];

    // Query notes, lectures, and syllabus
    let notesSql = `
      SELECT n.id, n.title, n.content AS description, n.file_url, n.created_at, 'Note' AS resource_type,
             sub.name AS subject_name, sub.code AS subject_code
      FROM website_classroom_notes n
      JOIN website_subjects sub ON sub.id = n.subject_id
      WHERE n.website_id = $1
    `;
    const notesParams = [website.id];

    let lecturesSql = `
      SELECT l.id, l.title, l.description, l.video_url AS file_url, l.created_at, 'Lecture' AS resource_type,
             sub.name AS subject_name, sub.code AS subject_code
      FROM website_classroom_lectures l
      JOIN website_subjects sub ON sub.id = l.subject_id
      WHERE l.website_id = $1
    `;
    const lecturesParams = [website.id];

    let syllabusSql = `
      SELECT syl.id, syl.title, syl.content AS description, syl.file_url, syl.created_at, 'Syllabus' AS resource_type,
             sub.name AS subject_name, sub.code AS subject_code
      FROM website_classroom_syllabus syl
      JOIN website_subjects sub ON sub.id = syl.subject_id
      WHERE syl.website_id = $1
    `;
    const syllabusParams = [website.id];

    let subjectId = null;
    if (subjectIdParam) {
      const parsedId = parseInt(subjectIdParam, 10);
      if (!isNaN(parsedId)) {
        // Check if this ID is a class_subject_id or direct subject_id
        const csCheck = await queryDb(
          `SELECT subject_id FROM website_class_subjects WHERE id = $1 AND website_id = $2 LIMIT 1`,
          [parsedId, website.id]
        );
        if (csCheck.rows.length > 0) {
          subjectId = csCheck.rows[0].subject_id;
        } else {
          subjectId = parsedId;
        }
      }
    }

    if (subjectId) {
      notesSql += ` AND n.subject_id = $2`;
      notesParams.push(subjectId);

      lecturesSql += ` AND l.subject_id = $2`;
      lecturesParams.push(subjectId);

      syllabusSql += ` AND syl.subject_id = $2`;
      syllabusParams.push(subjectId);
    }

    const [notesRes, lecturesRes, syllabusRes] = await Promise.all([
      queryDb(`${notesSql} ORDER BY n.id DESC LIMIT 50`, notesParams),
      queryDb(`${lecturesSql} ORDER BY l.id DESC LIMIT 50`, lecturesParams),
      queryDb(`${syllabusSql} ORDER BY syl.id DESC LIMIT 50`, syllabusParams),
    ]);

    const combined = [
      ...notesRes.rows,
      ...lecturesRes.rows,
      ...syllabusRes.rows,
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({
      success: true,
      materials: combined,
      study_materials: combined,
      payload: {
        materials: combined,
        study_materials: combined,
      },
      paylod: {
        materials: combined,
        study_materials: combined,
      },
    });
  } catch (error) {
    console.error('Error fetching student study materials:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
