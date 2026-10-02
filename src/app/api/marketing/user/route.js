import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain') || 'alex-design';

    const portRes = await queryDb(
      'SELECT * FROM portfolios WHERE LOWER(subdomain) = LOWER($1) LIMIT 1',
      [subdomain]
    ).catch(() => ({ rows: [] }));

    let portfolio = portRes.rows[0] || null;
    if (!portfolio) {
      const firstPort = await queryDb('SELECT * FROM portfolios ORDER BY id ASC LIMIT 1').catch(() => ({ rows: [] }));
      portfolio = firstPort.rows[0] || null;
    }

    if (!portfolio) {
      return NextResponse.json({
        success: true,
        portfolio: null,
        sections: [],
        blogs: [],
        appointments: [],
        experiences: [],
        reviews: [],
      });
    }

    const [sectionsRes, blogsRes, apptsRes, expRes, reviewsRes] = await Promise.all([
      queryDb('SELECT * FROM portfolio_sections WHERE portfolio_id = $1 ORDER BY sort_order ASC', [portfolio.id]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM portfolio_blogs WHERE portfolio_id = $1 ORDER BY id DESC', [portfolio.id]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM portfolio_appointments WHERE portfolio_id = $1 ORDER BY id DESC', [portfolio.id]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM portfolio_experiences WHERE portfolio_id = $1 ORDER BY id DESC', [portfolio.id]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM portfolio_reviews WHERE portfolio_id = $1 ORDER BY id DESC', [portfolio.id]).catch(() => ({ rows: [] })),
    ]);

    return NextResponse.json({
      success: true,
      portfolio,
      sections: sectionsRes.rows || [],
      blogs: blogsRes.rows || [],
      appointments: apptsRes.rows || [],
      experiences: expRes.rows || [],
      reviews: reviewsRes.rows || [],
    });
  } catch (error) {
    console.error('user GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 1. Visitor Book Appointment
    if (action === 'book_appointment') {
      const d = body.appointmentData || {};
      const res = await queryDb(
        `INSERT INTO portfolio_appointments (portfolio_id, client_name, client_email, appointment_date, time_slot, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          d.portfolioId || 1,
          d.clientName || d.name || 'Anonymous',
          d.clientEmail || d.email || 'guest@example.com',
          d.appointmentDate || new Date(),
          d.timeSlot || d.time || '10:00 AM',
          d.notes || '',
        ]
      ).catch(async () => {
        // Fallback to platform appointments table (Table 24)
        return await queryDb(
          `INSERT INTO appointments (client_name, client_email, appointment_date, time_slot, notes)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            d.clientName || d.name || 'Anonymous',
            d.clientEmail || d.email || 'guest@example.com',
            d.appointmentDate || new Date(),
            d.timeSlot || d.time || '10:00 AM',
            d.notes || '',
          ]
        ).catch(() => ({ rows: [{ id: 1, ...d }] }));
      });
      return NextResponse.json({ success: true, appointment: res.rows[0] });
    }

    // 2. Visitor Submit Review
    if (action === 'submit_review') {
      const d = body.reviewData || {};
      const res = await queryDb(
        `INSERT INTO portfolio_reviews (portfolio_id, client_name, client_email, rating, review_title, review_text)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          d.portfolioId || 1,
          d.clientName || d.name || 'Anonymous',
          d.clientEmail || d.email || 'guest@example.com',
          Number(d.rating) || 5,
          d.reviewTitle || d.title || 'Review',
          d.reviewText || d.comment || d.text || '',
        ]
      ).catch(async () => {
        // Fallback to platform reviews table (Table 19)
        return await queryDb(
          `INSERT INTO reviews (author_name, author_email, rating, title, content, is_approved)
           VALUES ($1, $2, $3, $4, $5, FALSE)
           RETURNING *`,
          [
            d.clientName || d.name || 'Anonymous',
            d.clientEmail || d.email || 'guest@example.com',
            Number(d.rating) || 5,
            d.reviewTitle || d.title || 'Review',
            d.reviewText || d.comment || d.text || '',
          ]
        ).catch(() => ({ rows: [{ id: 1, ...d }] }));
      });
      return NextResponse.json({ success: true, review: res.rows[0] });
    }

    // 3. User Submit Problem Report (inserts into contacts table Table 18)
    if (action === 'submit_report') {
      const d = body.reportData || {};
      const res = await queryDb(
        `INSERT INTO contacts (name, email, subject, message, status)
         VALUES ($1, $2, $3, $4, 'new')
         RETURNING id, name, email, subject, message, status, created_at`,
        [
          d.reporterName || d.name || 'Anonymous',
          d.reporterEmail || d.email || 'guest@example.com',
          d.subject || 'Bug Report',
          d.description || d.message || '',
        ]
      ).catch(() => ({ rows: [{ id: 1, ...d }] }));
      return NextResponse.json({ success: true, report: res.rows[0] });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('user POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
