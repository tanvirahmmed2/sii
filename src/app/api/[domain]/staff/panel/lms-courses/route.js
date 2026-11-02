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

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// GET: Load LMS courses, modules, video streaming assets, live classes, student progress
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const websiteId = auth.website.id;

    // 1. Courses
    const coursesRes = await queryDb(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM website_course_modules m WHERE m.course_id = c.id) AS module_count,
              (SELECT COUNT(*) FROM website_course_lessons l 
               JOIN website_course_modules m ON m.id = l.module_id 
               WHERE m.course_id = c.id) AS lesson_count
       FROM website_courses c
       WHERE c.website_id = $1
       ORDER BY c.created_at DESC`,
      [websiteId]
    );

    // 2. Scheduled Live Classes (Zoom / Meet)
    const liveRes = await queryDb(
      `SELECT lc.*, c.title as course_title, t.name as teacher_name
       FROM website_live_classes lc
       LEFT JOIN website_courses c ON c.id = lc.course_id
       LEFT JOIN website_teachers t ON t.id = lc.teacher_id
       WHERE lc.website_id = $1
       ORDER BY lc.start_time DESC`,
      [websiteId]
    );

    // 3. Video Assets
    const videosRes = await queryDb(
      `SELECT * FROM website_video_assets WHERE website_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [websiteId]
    );

    // 4. Classes & Teachers for dropdowns
    const classesRes = await queryDb(`SELECT id, name FROM website_classes WHERE website_id = $1 ORDER BY id`, [websiteId]);
    const teachersRes = await queryDb(`SELECT id, name FROM website_teachers WHERE website_id = $1 ORDER BY name ASC`, [websiteId]);

    return NextResponse.json({
      success: true,
      courses: coursesRes.rows || [],
      live_classes: liveRes.rows || [],
      video_assets: videosRes.rows || [],
      classes: classesRes.rows || [],
      teachers: teachersRes.rows || [],
    });
  } catch (error) {
    console.error('Error in lms-courses GET:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Create course, module, live class
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { action } = body;
    const websiteId = auth.website.id;

    if (action === 'create_course') {
      const { title, slug, class_id, instructor_id, description, thumbnail_url, is_published } = body;
      if (!title) {
        return NextResponse.json({ success: false, error: 'Course title is required' }, { status: 400 });
      }

      const courseSlug = slug ? slugify(slug) : slugify(title);

      const res = await queryDb(
        `INSERT INTO website_courses (website_id, title, slug, class_id, instructor_id, description, thumbnail_url, is_published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [websiteId, title.trim(), courseSlug, class_id || null, instructor_id || null, description || null, thumbnail_url || null, Boolean(is_published)]
      );
      return NextResponse.json({ success: true, message: 'Course created', course: res.rows[0] });
    }

    if (action === 'schedule_live_class') {
      const { title, course_id, class_id, teacher_id, provider, join_url, meeting_id, meeting_password, start_time, duration_minutes } = body;
      if (!title || !join_url || !start_time) {
        return NextResponse.json({ success: false, error: 'Title, join URL, and start time are required' }, { status: 400 });
      }

      const res = await queryDb(
        `INSERT INTO website_live_classes (website_id, title, course_id, class_id, teacher_id, provider, join_url, meeting_id, meeting_password, start_time, duration_minutes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'scheduled')
         RETURNING *`,
        [
          websiteId,
          title.trim(),
          course_id || null,
          class_id || null,
          teacher_id || null,
          provider || 'zoom',
          join_url.trim(),
          meeting_id || null,
          meeting_password || null,
          start_time,
          parseInt(duration_minutes || 45, 10),
        ]
      );
      return NextResponse.json({ success: true, message: 'Live class scheduled', live_class: res.rows[0] });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });
  } catch (error) {
    console.error('Error in lms-courses POST:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove course or live class
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const liveId = searchParams.get('live_id');
    const websiteId = auth.website.id;

    if (courseId) {
      await queryDb(`DELETE FROM website_courses WHERE id = $1 AND website_id = $2`, [courseId, websiteId]);
      return NextResponse.json({ success: true, message: 'Course deleted' });
    }

    if (liveId) {
      await queryDb(`DELETE FROM website_live_classes WHERE id = $1 AND website_id = $2`, [liveId, websiteId]);
      return NextResponse.json({ success: true, message: 'Live class removed' });
    }

    return NextResponse.json({ success: false, error: 'Target ID not provided' }, { status: 400 });
  } catch (error) {
    console.error('Error in lms-courses DELETE:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

