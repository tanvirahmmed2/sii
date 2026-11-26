import { NextResponse } from 'next/server';
import { getDeveloperSession } from 'src/lib/middleware/developer';
import { queryDb } from 'src/lib/database/db';

export const dynamic = 'force-dynamic';

export async function GET(request: any) {
    try {
        const session = await getDeveloperSession(request);
        if (!session || !session.isActive) {
            return NextResponse.json({ success: false, error: 'Unauthorized: Please log in.' }, { status: 401 });
        }

        const devId = Number(session.id);
        const currentToken = session.token || '';
        const roleName = session.roleName || session.role || 'Developer';

        const [
            devRes,
            sessionsRes,
            loginActivitiesRes,
            noticesRes,
            pendingChatsRes,
            tasksRes,
            legacyLogsRes,
            derivedLogsRes,
        ] = await Promise.all([
            queryDb(
                `SELECT d.id, d.name, d.email, d.phone, d.bio,
                        d.github_profile, d.linkedin_profile,
                        d.role_id, r.name AS role_name, r.slug AS role_slug,
                        d.is_active, d.email_verified, COALESCE(d.two_factor_enabled, false) AS two_factor_enabled,
                        d.last_login_at, d.created_at, d.updated_at
                 FROM developers d
                 LEFT JOIN developer_roles r ON d.role_id = r.id
                 WHERE d.id = $1 LIMIT 1`,
                [devId]
            ).catch(() => ({ rows: [] })),
            queryDb(
                `SELECT id, ip_address, user_agent, expires_at, last_active_at, created_at,
                        CASE WHEN token = $2 THEN TRUE ELSE FALSE END AS is_current
                 FROM developer_login_sessions
                 WHERE developer_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
                 ORDER BY CASE WHEN token = $2 THEN 0 ELSE 1 END, last_active_at DESC
                 LIMIT 10`,
                [devId, currentToken]
            ).catch(() => ({ rows: [] })),
            queryDb(
                `SELECT id, status, ip_address, user_agent, failure_reason, login_time, created_at
                 FROM developer_login_activities
                 WHERE developer_id = $1
                 ORDER BY id DESC
                 LIMIT 15`,
                [devId]
            ).catch(() => ({ rows: [] })),
            queryDb(
                `SELECT n.id, n.title, n.content, n.priority, n.category, n.is_pinned, n.target_role,
                        n.expires_at, n.created_at, d.name AS creator_name
                 FROM notices n
                 LEFT JOIN developers d ON n.created_by_developer_id = d.id
                 WHERE (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
                   AND (UPPER(COALESCE(n.target_role, 'ALL')) = 'ALL' OR LOWER(COALESCE(n.target_role, '')) = LOWER($1))
                 ORDER BY n.is_pinned DESC, n.created_at DESC
                 LIMIT 12`,
                [roleName]
            ).catch(() => ({ rows: [] })),
            queryDb(
                `SELECT c.id, c.title, c.type, c.updated_at, cp.last_read_at,
                        lm.id AS last_message_id, lm.message AS last_message, lm.created_at AS last_message_at,
                        lm.sender_developer_id AS last_message_sender_id,
                        lms.name AS last_message_sender_name,
                        (
                          SELECT COUNT(*)::int
                          FROM chat_messages cm
                          WHERE cm.chat_id = c.id
                            AND cm.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
                            AND (cm.sender_developer_id IS NULL OR cm.sender_developer_id != $1)
                        ) AS unread_count,
                        (
                          SELECT json_agg(json_build_object('id', pdev.id, 'name', pdev.name))
                          FROM chat_participants pcp
                          JOIN developers pdev ON pdev.id = pcp.developer_id
                          WHERE pcp.chat_id = c.id
                        ) AS participants
                 FROM internal_chats c
                 JOIN chat_participants cp ON c.id = cp.chat_id AND cp.developer_id = $1
                 LEFT JOIN LATERAL (
                   SELECT m.id, m.message, m.created_at, m.sender_developer_id
                   FROM chat_messages m
                   WHERE m.chat_id = c.id
                   ORDER BY m.created_at DESC
                   LIMIT 1
                 ) lm ON TRUE
                 LEFT JOIN developers lms ON lm.sender_developer_id = lms.id
                 WHERE lm.id IS NOT NULL
                   AND (
                     EXISTS (
                       SELECT 1 FROM chat_messages cm2
                       WHERE cm2.chat_id = c.id
                         AND cm2.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
                         AND (cm2.sender_developer_id IS NULL OR cm2.sender_developer_id != $1)
                     )
                     OR lm.sender_developer_id != $1
                   )
                 ORDER BY unread_count DESC, COALESCE(lm.created_at, c.updated_at) DESC
                 LIMIT 12`,
                [devId]
            ).catch(() => ({ rows: [] })),
            queryDb(
                `SELECT dt.id, dt.title, dt.description, dt.priority, dt.status, dt.due_date, dt.created_at, dt.updated_at,
                        COALESCE(dt.assigned_to_developer_id, dt.developer_id) AS assigned_to_developer_id,
                        d.name AS assignee_name,
                        creator.name AS creator_name
                 FROM developer_tasks dt
                 LEFT JOIN developers d ON COALESCE(dt.assigned_to_developer_id, dt.developer_id) = d.id
                 LEFT JOIN developers creator ON dt.created_by_developer_id = creator.id
                 WHERE (dt.assigned_to_developer_id = $1 OR dt.developer_id = $1 OR dt.created_by_developer_id = $1)
                 ORDER BY
                   CASE WHEN LOWER(COALESCE(dt.status, '')) IN ('completed', 'done', 'closed') THEN 1 ELSE 0 END ASC,
                   CASE LOWER(COALESCE(dt.priority, ''))
                     WHEN 'urgent' THEN 1
                     WHEN 'high' THEN 2
                     WHEN 'medium' THEN 3
                     WHEN 'low' THEN 4
                     ELSE 5
                   END ASC,
                   dt.updated_at DESC
                 LIMIT 15`,
                [devId]
            ).catch(() => ({ rows: [] })),
            queryDb(
                `SELECT id, user_type, user_name, action, entity_type, entity_id, details, created_at
                 FROM activity_logs
                 ORDER BY id DESC
                 LIMIT 15`
            ).catch(() => ({ rows: [] })),
            queryDb(
                `SELECT * FROM (
                   SELECT ('task-' || dt.id) AS id,
                          'task' AS entity_type,
                          UPPER(COALESCE(dt.status, 'UPDATED')) AS action,
                          dt.title AS details,
                          COALESCE(d.name, 'Developer') AS actor,
                          COALESCE(dt.updated_at, dt.created_at) AS created_at
                   FROM developer_tasks dt
                   LEFT JOIN developers d ON COALESCE(dt.assigned_to_developer_id, dt.created_by_developer_id) = d.id
                   WHERE dt.assigned_to_developer_id = $1 OR dt.developer_id = $1 OR dt.created_by_developer_id = $1
                   UNION ALL
                   SELECT ('notice-' || n.id) AS id,
                          'notice' AS entity_type,
                          'PUBLISHED' AS action,
                          n.title AS details,
                          COALESCE(d.name, 'System') AS actor,
                          n.created_at AS created_at
                   FROM notices n
                   LEFT JOIN developers d ON n.created_by_developer_id = d.id
                   UNION ALL
                   SELECT ('login-' || dla.id) AS id,
                          'auth' AS entity_type,
                          CASE WHEN dla.status = 'Success' THEN 'LOGIN' ELSE 'FAILED_LOGIN' END AS action,
                          COALESCE(dla.failure_reason, 'Login via ' || COALESCE(dla.ip_address, 'unknown IP')) AS details,
                          $2 AS actor,
                          COALESCE(dla.login_time, dla.created_at) AS created_at
                   FROM developer_login_activities dla
                   WHERE dla.developer_id = $1
                 ) logs
                 ORDER BY created_at DESC
                 LIMIT 20`,
                [devId, session.name || 'Developer']
            ).catch(() => ({ rows: [] })),
        ]);

        const devRow = devRes.rows[0] || {};
        const developer = {
            id: devRow.id ?? session.id,
            name: devRow.name ?? session.name,
            email: devRow.email ?? session.email,
            phone: devRow.phone ?? session.phone,
            bio: devRow.bio ?? session.bio,
            github_profile: devRow.github_profile ?? session.githubProfile,
            linkedin_profile: devRow.linkedin_profile ?? session.linkedinProfile,
            role_id: devRow.role_id ?? session.roleId,
            role_name: devRow.role_name ?? session.roleName ?? 'Developer',
            role: devRow.role_slug ?? session.role ?? 'developer',
            is_active: devRow.is_active !== undefined ? Boolean(devRow.is_active) : Boolean(session.isActive),
            is_verified: devRow.email_verified !== undefined ? Boolean(devRow.email_verified) : Boolean(session.isVerified),
            two_factor_enabled: Boolean(devRow.two_factor_enabled),
            last_login_at: devRow.last_login_at || null,
            created_at: devRow.created_at || null,
        };

        const legacyLogs = (legacyLogsRes.rows || []).map((row: any) => ({
            id: `log-${row.id}`,
            action: row.action || 'EVENT',
            entity_type: row.entity_type || row.user_type || 'system',
            details: row.details || '',
            actor: row.user_name || 'System',
            created_at: row.created_at,
        }));

        const activityLogs = [...legacyLogs, ...(derivedLogsRes.rows || [])]
            .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
            .slice(0, 20);

        return NextResponse.json({
            success: true,
            developer,
            sessions: sessionsRes.rows || [],
            loginActivities: loginActivitiesRes.rows || [],
            notices: noticesRes.rows || [],
            pendingChats: pendingChatsRes.rows || [],
            tasks: tasksRes.rows || [],
            activityLogs,
        });
    } catch (error: any) {
        console.error('Developer console API error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
    }
}
