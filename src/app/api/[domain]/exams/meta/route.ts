import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { verifyExamAccess } from 'src/lib/middleware/exam_auth';
export async function GET(request: any, context: any) {
    try {
        const auth = await verifyExamAccess(request, context, 'view');
        if (!auth.allowed) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const [classesRes, sessionsRes, examsRes] = await Promise.all([
            queryDb(`SELECT id, name, code 
         FROM website_classes 
         WHERE website_id = $1 
         ORDER BY name ASC, id ASC`, [auth.website.id]),
            queryDb(`SELECT id, name, (status = 'active') AS is_current 
         FROM website_sessions 
         WHERE website_id = $1 
         ORDER BY id DESC`, [auth.website.id]),
            queryDb(`SELECT id, name, term, class_id, session_id, status 
         FROM website_exams 
         WHERE website_id = $1 
         ORDER BY id DESC`, [auth.website.id])
        ]);
        return NextResponse.json({
            success: true,
            classes: classesRes.rows,
            sessions: sessionsRes.rows,
            exams: examsRes.rows
        });
    }
    catch (error: any) {
        console.error('Error fetching exam metadata:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch examination metadata.' }, { status: 500 });
    }
}
