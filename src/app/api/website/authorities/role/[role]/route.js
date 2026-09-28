import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET authorities for a specific role / designation slug
export async function GET(request, { params }) {
  try {
    const { role } = await params;

    if (!role) {
      return NextResponse.json({
        success: false,
        message: 'Role parameter is required.',
        error: 'Bad Request',
        paylod: null,
        payload: null
      }, { status: 400 });
    }

    const decodedRole = decodeURIComponent(role).trim();

    // 1. Fetch designation details
    const designationResult = await query(
      `SELECT * FROM authority_designations WHERE LOWER(slug) = LOWER($1) OR LOWER(title) = LOWER($1)`,
      [decodedRole]
    );

    const designationInfo = designationResult.rows[0] || null;

    // 2. Fetch authority members for this designation
    let authoritiesResult;
    if (designationInfo) {
      authoritiesResult = await query(`
        SELECT a.*, d.title AS designation_title, d.slug AS designation, COALESCE(d.is_head, FALSE) AS is_head
        FROM authorities a
        JOIN authority_designations d ON a.designation_id = d.id
        WHERE a.designation_id = $1
        ORDER BY a.id ASC
      `, [designationInfo.id]);
    } else {
      authoritiesResult = await query(`
        SELECT a.*, d.title AS designation_title, d.slug AS designation, COALESCE(d.is_head, FALSE) AS is_head
        FROM authorities a
        JOIN authority_designations d ON a.designation_id = d.id
        WHERE LOWER(d.slug) = LOWER($1) OR LOWER(d.title) = LOWER($1)
        ORDER BY a.id ASC
      `, [decodedRole]);
    }

    const authorities = authoritiesResult.rows;

    // 3. Fetch qualifications if authorities exist
    if (authorities.length > 0) {
      const authIds = authorities.map(a => a.id);
      const qualsResult = await query(
        `SELECT * FROM authority_qualifications WHERE authority_id = ANY($1) ORDER BY passing_year DESC`,
        [authIds]
      );
      const qualsMap = {};
      qualsResult.rows.forEach(q => {
        if (!qualsMap[q.authority_id]) qualsMap[q.authority_id] = [];
        qualsMap[q.authority_id].push(q);
      });
      authorities.forEach(a => {
        a.qualifications = qualsMap[a.id] || [];
      });
    }

    const res_data = {
      designation: designationInfo || {
        title: decodedRole.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        slug: decodedRole,
        description: null
      },
      authorities
    };

    return NextResponse.json({
      success: true,
      message: 'Successfully fetched authorities for role',
      paylod: res_data,
      payload: res_data
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching authorities for role:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve authorities for role. Internal server error.',
      error: 'Internal Server Error',
      paylod: null,
      payload: null
    }, { status: 500 });
  }
}
