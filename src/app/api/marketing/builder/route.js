import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');

    let portfolio = null;
    if (portfolioId && !isNaN(Number(portfolioId))) {
      const pRes = await queryDb('SELECT * FROM portfolios WHERE id = $1 LIMIT 1', [Number(portfolioId)]);
      portfolio = pRes.rows[0] || null;
    } else {
      const pRes = await queryDb('SELECT * FROM portfolios ORDER BY id ASC LIMIT 1');
      portfolio = pRes.rows[0] || null;
    }

    let sections = [];
    if (portfolio) {
      const sRes = await queryDb(
        'SELECT * FROM portfolio_sections WHERE portfolio_id = $1 ORDER BY sort_order ASC',
        [portfolio.id]
      );
      sections = sRes.rows;
    }

    return NextResponse.json({
      success: true,
      portfolio,
      sections,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, portfolioId } = body;

    // 1. Reorder sections
    if (action === 'reorder_sections') {
      const orderedIds = body.orderedSectionIds || [];
      for (let i = 0; i < orderedIds.length; i++) {
        await queryDb('UPDATE portfolio_sections SET sort_order = $1 WHERE id = $2', [i, orderedIds[i]]);
      }
      const sRes = await queryDb(
        'SELECT * FROM portfolio_sections WHERE portfolio_id = $1 ORDER BY sort_order ASC',
        [portfolioId]
      );
      return NextResponse.json({ success: true, sections: sRes.rows });
    }

    // 2. Add new section
    if (action === 'add_section') {
      const { moduleType = 'HERO', title = 'New Section', contentData = {}, styles = {}, sortOrder = 0 } = body.sectionData || {};
      const res = await queryDb(
        `INSERT INTO portfolio_sections (portfolio_id, module_type, sort_order, title, content_data, styles)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [portfolioId, moduleType, sortOrder, title, JSON.stringify(contentData), JSON.stringify(styles)]
      );
      return NextResponse.json({ success: true, section: res.rows[0] });
    }

    // 3. Update section content or styles
    if (action === 'update_section') {
      const updates = body.updates || {};
      const fields = [];
      const values = [];
      let idx = 1;

      if (updates.title !== undefined) {
        fields.push(`title = $${idx++}`);
        values.push(updates.title);
      }
      if (updates.content_data !== undefined || updates.contentData !== undefined) {
        fields.push(`content_data = $${idx++}`);
        values.push(JSON.stringify(updates.content_data || updates.contentData));
      }
      if (updates.styles !== undefined) {
        fields.push(`styles = $${idx++}`);
        values.push(JSON.stringify(updates.styles));
      }
      if (updates.is_visible !== undefined || updates.isVisible !== undefined) {
        fields.push(`is_visible = $${idx++}`);
        values.push(updates.is_visible ?? updates.isVisible);
      }

      if (fields.length === 0) {
        return NextResponse.json({ success: true });
      }

      values.push(body.id);
      const res = await queryDb(
        `UPDATE portfolio_sections SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      return NextResponse.json({ success: true, section: res.rows[0] });
    }

    // 4. Delete section
    if (action === 'delete_section') {
      const res = await queryDb('DELETE FROM portfolio_sections WHERE id = $1 RETURNING *', [body.id]);
      return NextResponse.json({ success: true, removed: res.rows[0] });
    }

    // 5. Publish portfolio
    if (action === 'publish_portfolio') {
      const res = await queryDb(
        'UPDATE portfolios SET is_published = $1 WHERE id = $2 RETURNING *',
        [Boolean(body.isPublished), portfolioId]
      );
      return NextResponse.json({ success: true, portfolio: res.rows[0] });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
