import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession } from 'src/lib/middleware/staff.js';

async function verifyStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }
  const staffSession = await getStaffSession(request);
  if (!staffSession) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession };
}

export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const websiteId = auth.website.id;

    const banksRes = await queryDb(
      `SELECT qb.*, 
              (SELECT COUNT(*) FROM website_questions q WHERE q.bank_id = qb.id) AS question_count
       FROM website_question_banks qb 
       WHERE qb.website_id = $1 
       ORDER BY qb.created_at DESC`,
      [websiteId]
    );

    const papersRes = await queryDb(
      `SELECT ep.*, 
              (SELECT COUNT(*) FROM website_exam_attempts ea WHERE ea.paper_id = ep.id) AS attempt_count
       FROM website_exam_papers ep
       WHERE ep.website_id = $1
       ORDER BY ep.created_at DESC`,
      [websiteId]
    );

    const logsRes = await queryDb(
      `SELECT pl.*, ea.student_id, ep.title as paper_title
       FROM website_exam_proctor_logs pl
       JOIN website_exam_attempts ea ON ea.id = pl.attempt_id
       JOIN website_exam_papers ep ON ep.id = ea.paper_id
       WHERE pl.website_id = $1
       ORDER BY pl.logged_at DESC
       LIMIT 50`,
      [websiteId]
    );

    const classesRes = await queryDb(`SELECT id, name FROM website_classes WHERE website_id = $1 ORDER BY id`, [websiteId]);
    const subjectsRes = await queryDb(`SELECT id, name, code FROM website_subjects WHERE website_id = $1 ORDER BY id`, [websiteId]);

    return NextResponse.json({
      success: true,
      question_banks: banksRes.rows || [],
      exam_papers: papersRes.rows || [],
      proctor_logs: logsRes.rows || [],
      classes: classesRes.rows || [],
      subjects: subjectsRes.rows || [],
    });
  } catch (error) {
    console.error('Error in cbt-exams GET:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { action } = body;
    const websiteId = auth.website.id;

    if (action === 'create_bank') {
      const { title, subject_id, class_id, description } = body;
      if (!title) {
        return NextResponse.json({ success: false, error: 'Bank title is required' }, { status: 400 });
      }

      const res = await queryDb(
        `INSERT INTO website_question_banks (website_id, title, subject_id, class_id, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [websiteId, title.trim(), subject_id || null, class_id || null, description || null]
      );
      return NextResponse.json({ success: true, message: 'Question bank created', bank: res.rows[0] });
    }

    if (action === 'create_question') {
      const { bank_id, question_text, latex_formula, question_type, marks, negative_marks, explanation, options } = body;
      if (!bank_id || !question_text) {
        return NextResponse.json({ success: false, error: 'Bank ID and question text required' }, { status: 400 });
      }

      const qRes = await queryDb(
        `INSERT INTO website_questions (website_id, bank_id, question_text, latex_formula, question_type, marks, negative_marks, explanation)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [websiteId, bank_id, question_text, latex_formula || null, question_type || 'mcq', marks || 1, negative_marks || 0, explanation || null]
      );

      const questionId = qRes.rows[0].id;

      if (Array.isArray(options) && options.length > 0) {
        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          await queryDb(
            `INSERT INTO website_question_options (website_id, question_id, option_text, latex_formula, is_correct, order_no)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [websiteId, questionId, opt.text, opt.latex || null, Boolean(opt.is_correct), i + 1]
          );
        }
      }

      return NextResponse.json({ success: true, message: 'Question added with options', question: qRes.rows[0] });
    }

    if (action === 'create_paper') {
      const { title, class_id, subject_id, duration_minutes, total_marks, pass_marks, randomize_questions, randomize_options, proctoring_enabled, start_time, end_time, status } = body;
      if (!title) {
        return NextResponse.json({ success: false, error: 'Paper title is required' }, { status: 400 });
      }

      const res = await queryDb(
        `INSERT INTO website_exam_papers (website_id, title, class_id, subject_id, duration_minutes, total_marks, pass_marks, randomize_questions, randomize_options, proctoring_enabled, start_time, end_time, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          websiteId,
          title.trim(),
          class_id || null,
          subject_id || null,
          parseInt(duration_minutes || 60, 10),
          parseFloat(total_marks || 100),
          parseFloat(pass_marks || 40),
          randomize_questions !== false,
          randomize_options !== false,
          Boolean(proctoring_enabled),
          start_time || null,
          end_time || null,
          status || 'draft',
        ]
      );

      return NextResponse.json({ success: true, message: 'CBT Exam paper created', paper: res.rows[0] });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });
  } catch (error) {
    console.error('Error in cbt-exams POST:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get('bank_id');
    const paperId = searchParams.get('paper_id');
    const websiteId = auth.website.id;

    if (bankId) {
      await queryDb(`DELETE FROM website_question_banks WHERE id = $1 AND website_id = $2`, [bankId, websiteId]);
      return NextResponse.json({ success: true, message: 'Question bank deleted' });
    }

    if (paperId) {
      await queryDb(`DELETE FROM website_exam_papers WHERE id = $1 AND website_id = $2`, [paperId, websiteId]);
      return NextResponse.json({ success: true, message: 'Exam paper deleted' });
    }

    return NextResponse.json({ success: false, error: 'Target ID not provided' }, { status: 400 });
  } catch (error) {
    console.error('Error in cbt-exams DELETE:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

