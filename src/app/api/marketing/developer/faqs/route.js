import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'faqs');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const res = await queryDb('SELECT * FROM faqs WHERE id = $1 LIMIT 1', [Number(id)]);
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'FAQ not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, record: res.rows[0] });
    }

    const res = await queryDb('SELECT * FROM faqs ORDER BY id ASC').catch(() => ({ rows: [] }));
    return NextResponse.json({ success: true, table: 'faqs', records: res.rows });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// CREATE FAQ
export async function POST(request) {
  try {
    const authCheck = await hasModulePermission(request, 'faqs');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message || 'Access denied: Permission faqs required.' },
        { status: authCheck.status || 403 }
      );
    }

    const body = await request.json();
    const question = body.question?.trim();
    const answer = body.answer?.trim();

    if (!question || !answer) {
      return NextResponse.json({ success: false, error: 'Both question and answer are required.' }, { status: 400 });
    }

    const res = await queryDb(
      `INSERT INTO faqs (question, answer) VALUES ($1, $2) RETURNING *`,
      [question, answer]
    );

    return NextResponse.json(
      { success: true, record: res.rows[0], message: 'FAQ created successfully.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating FAQ:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// UPDATE FAQ
export async function PUT(request) {
  try {
    const authCheck = await hasModulePermission(request, 'faqs');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message || 'Access denied: Permission faqs required.' },
        { status: authCheck.status || 403 }
      );
    }

    const body = await request.json();
    const id = body.id || body.faqId;
    const question = body.question?.trim();
    const answer = body.answer?.trim();

    if (!id) {
      return NextResponse.json({ success: false, error: 'FAQ ID is required for update.' }, { status: 400 });
    }
    if (!question || !answer) {
      return NextResponse.json({ success: false, error: 'Both question and answer are required.' }, { status: 400 });
    }

    const res = await queryDb(
      `UPDATE faqs SET question = $1, answer = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
      [question, answer, Number(id)]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'FAQ item not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, record: res.rows[0], message: 'FAQ updated successfully.' });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE FAQ
export async function DELETE(request) {
  try {
    const authCheck = await hasModulePermission(request, 'faqs');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message || 'Access denied: Permission faqs required.' },
        { status: authCheck.status || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id || body.faqId;
    }
    if (!id) {
      return NextResponse.json({ success: false, error: 'FAQ ID is required.' }, { status: 400 });
    }

    const res = await queryDb('DELETE FROM faqs WHERE id = $1 RETURNING id', [Number(id)]);
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'FAQ item not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'FAQ deleted successfully.' });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
