import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'abouts' | 'missions' | 'visions' | 'milestones' | 'infrastructure' | 'board_members' | null (all)

    const resultPayload = {
      success: true,
      website_id: website.id,
      abouts: [],
      missions: [],
      visions: [],
      milestones: [],
      infrastructure: [],
      board_members: []
    };

    if (!type || type === 'abouts' || type === 'about') {
      const aboutsRes = await queryDb(
        `SELECT id, title, subtitle, description, image, image_id, order_no, created_at, updated_at
         FROM website_abouts
         WHERE website_id = $1 AND is_active = true
         ORDER BY order_no ASC, id ASC`,
        [website.id]
      );
      resultPayload.abouts = aboutsRes.rows;
    }

    if (!type || type === 'missions') {
      const missionsRes = await queryDb(
        `SELECT id, title, description, order_no, icon, created_at, updated_at
         FROM website_missions
         WHERE website_id = $1 AND is_active = true
         ORDER BY order_no ASC, id ASC`,
        [website.id]
      );
      resultPayload.missions = missionsRes.rows;
    }

    if (!type || type === 'visions') {
      const visionsRes = await queryDb(
        `SELECT id, title, description, order_no, icon, created_at, updated_at
         FROM website_visions
         WHERE website_id = $1 AND is_active = true
         ORDER BY order_no ASC, id ASC`,
        [website.id]
      );
      resultPayload.visions = visionsRes.rows;
    }

    if (!type || type === 'milestones') {
      const milestonesRes = await queryDb(
        `SELECT id, year, title, description, image, image_id, order_no, created_at, updated_at
         FROM website_milestons
         WHERE website_id = $1 AND is_active = true
         ORDER BY order_no ASC, year ASC, id ASC`,
        [website.id]
      );
      resultPayload.milestones = milestonesRes.rows;
    }

    if (!type || type === 'infrastructure') {
      const infrastructureRes = await queryDb(
        `SELECT id, title, subtitle, description, facility_type, image, image_id, order_no, created_at, updated_at
         FROM website_insfrastructure
         WHERE website_id = $1 AND is_active = true
         ORDER BY order_no ASC, id ASC`,
        [website.id]
      );
      resultPayload.infrastructure = infrastructureRes.rows;
    }

    if (!type || type === 'board_members') {
      const boardRes = await queryDb(
        `SELECT id, name, title, designation, image, image_id, bio, order_no, created_at, updated_at
         FROM website_board_members
         WHERE website_id = $1 AND is_active = true
         ORDER BY order_no ASC, id ASC`,
        [website.id]
      );
      resultPayload.board_members = boardRes.rows;
    }

    return NextResponse.json(resultPayload);
  } catch (error) {
    console.error('Error in public institutional API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch institutional data.' },
      { status: 500 }
    );
  }
}
