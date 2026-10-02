import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// PUBLIC SUBSCRIBE ENDPOINT
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body.email?.trim()?.toLowerCase();
    const source = (body.source || 'HOME_FOOTER').trim();
    const name = body.name?.trim() || null;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email address is required.' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Check if email already exists in subscribers table (Table 12)
    const existing = await queryDb(
      `SELECT id, email, name, source, is_active, created_at, updated_at,
              CASE WHEN is_active THEN 'SUBSCRIBED' ELSE 'UNSUBSCRIBED' END AS status
       FROM subscribers 
       WHERE LOWER(email) = LOWER($1) 
       LIMIT 1`,
      [email]
    ).catch(() => ({ rows: [] }));

    if (existing.rows.length > 0) {
      const sub = existing.rows[0];
      if (sub.is_active) {
        return NextResponse.json({
          success: true,
          alreadySubscribed: true,
          message: 'You are already subscribed to our newsletter!',
          record: sub,
        });
      }

      // Re-activate previously unsubscribed email
      const updated = await queryDb(
        `UPDATE subscribers 
         SET is_active = TRUE, source = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING id, email, is_active, source, created_at, updated_at, 'SUBSCRIBED' AS status`,
        [source, sub.id]
      );

      return NextResponse.json({
        success: true,
        message: 'Welcome back! Your subscription has been reactivated.',
        record: updated.rows[0],
      });
    }

    // Insert new subscriber record according to psql/schema.psql Table 12
    const res = await queryDb(
      `INSERT INTO subscribers (email, name, source, is_active) 
       VALUES ($1, $2, $3, TRUE) 
       RETURNING id, email, name, source, is_active, created_at, updated_at, 'SUBSCRIBED' AS status`,
      [email, name, source]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for subscribing to our newsletter!',
        record: res.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process subscription.' },
      { status: 500 }
    );
  }
}

// GET SUBSCRIBERS STATUS / STATS
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim()?.toLowerCase();

    if (email) {
      const res = await queryDb(
        `SELECT id, email, is_active, created_at 
         FROM subscribers 
         WHERE LOWER(email) = LOWER($1) 
         LIMIT 1`,
        [email]
      ).catch(() => ({ rows: [] }));

      if (res.rows.length === 0) {
        return NextResponse.json({ success: true, isSubscribed: false });
      }
      return NextResponse.json({
        success: true,
        isSubscribed: Boolean(res.rows[0].is_active),
        status: res.rows[0].is_active ? 'SUBSCRIBED' : 'UNSUBSCRIBED',
      });
    }

    const countRes = await queryDb(
      'SELECT count(*) FROM subscribers WHERE is_active = TRUE'
    ).catch(() => ({ rows: [{ count: '0' }] }));

    return NextResponse.json({
      success: true,
      totalSubscribers: parseInt(countRes.rows[0]?.count || '0', 10) || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
