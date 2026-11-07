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

    const promotionsRes = await queryDb(
      `SELECT p.*, s.name as student_name
       FROM website_student_promotions p
       JOIN website_students s ON s.id = p.student_id
       WHERE p.website_id = $1
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [websiteId]
    );

    const devicesRes = await queryDb(
      `SELECT * FROM website_attendance_devices WHERE website_id = $1 ORDER BY created_at DESC`,
      [websiteId]
    );

    const punchesRes = await queryDb(
      `SELECT b.*, d.device_name
       FROM website_biometric_logs b
       LEFT JOIN website_attendance_devices d ON d.id = b.device_id
       WHERE b.website_id = $1
       ORDER BY b.punch_time DESC
       LIMIT 50`,
      [websiteId]
    );

    const alumniRes = await queryDb(
      `SELECT * FROM website_alumni_records WHERE website_id = $1 ORDER BY graduation_year DESC, name ASC`,
      [websiteId]
    );

    return NextResponse.json({
      success: true,
      promotions: promotionsRes.rows || [],
      devices: devicesRes.rows || [],
      biometric_logs: punchesRes.rows || [],
      alumni: alumniRes.rows || [],
    });
  } catch (error) {
    console.error('Error in academic-progression GET:', error);
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

    if (action === 'record_promotion') {
      const { student_id, to_class_id, to_section_id, new_roll, previous_roll, remarks } = body;
      if (!student_id) {
        return NextResponse.json({ success: false, error: 'Student ID required' }, { status: 400 });
      }

      const res = await queryDb(
        `INSERT INTO website_student_promotions (website_id, student_id, to_class_id, to_section_id, new_roll, previous_roll, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [websiteId, student_id, to_class_id || null, to_section_id || null, new_roll || null, previous_roll || null, remarks || null]
      );
      return NextResponse.json({ success: true, message: 'Student promotion logged', promotion: res.rows[0] });
    }

    if (action === 'register_device') {
      const { device_name, device_ip, device_port, serial_number, device_type, location } = body;
      if (!device_name) {
        return NextResponse.json({ success: false, error: 'Device name is required' }, { status: 400 });
      }

      const res = await queryDb(
        `INSERT INTO website_attendance_devices (website_id, device_name, device_ip, device_port, serial_number, device_type, location, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'online')
         RETURNING *`,
        [websiteId, device_name.trim(), device_ip || null, parseInt(device_port || 4370, 10), serial_number || null, device_type || 'zkteco', location || null]
      );
      return NextResponse.json({ success: true, message: 'Biometric hardware registered', device: res.rows[0] });
    }

    if (action === 'add_alumni') {
      const { name, graduation_year, passing_class, email, phone, current_profession, company_name } = body;
      if (!name || !graduation_year) {
        return NextResponse.json({ success: false, error: 'Name and graduation year required' }, { status: 400 });
      }

      const res = await queryDb(
        `INSERT INTO website_alumni_records (website_id, name, graduation_year, passing_class, email, phone, current_profession, company_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [websiteId, name.trim(), parseInt(graduation_year, 10), passing_class || null, email || null, phone || null, current_profession || null, company_name || null]
      );
      return NextResponse.json({ success: true, message: 'Alumni profile saved', alumni: res.rows[0] });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });
  } catch (error) {
    console.error('Error in academic-progression POST:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('device_id');
    const alumniId = searchParams.get('alumni_id');
    const websiteId = auth.website.id;

    if (deviceId) {
      await queryDb(`DELETE FROM website_attendance_devices WHERE id = $1 AND website_id = $2`, [deviceId, websiteId]);
      return NextResponse.json({ success: true, message: 'Device removed' });
    }

    if (alumniId) {
      await queryDb(`DELETE FROM website_alumni_records WHERE id = $1 AND website_id = $2`, [alumniId, websiteId]);
      return NextResponse.json({ success: true, message: 'Alumni record removed' });
    }

    return NextResponse.json({ success: false, error: 'Target ID not provided' }, { status: 400 });
  } catch (error) {
    console.error('Error in academic-progression DELETE:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

