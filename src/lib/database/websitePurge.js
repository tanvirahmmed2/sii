import pool from './db.js';

export async function purgeWebsite(clientOrPool, { websiteId, creatorId = null }) {
  const db = clientOrPool || pool;
  const targetId = Number(websiteId);
  if (!targetId) {
    throw new Error('Valid website ID is required.');
  }

  const isClient = typeof db.release === 'function';
  const client = isClient ? db : await pool.connect();

  try {
    if (!isClient) {
      await client.query('BEGIN');
    }

    let authQuery = 'SELECT id, name, slug, creator_id FROM websites WHERE id = $1';
    let authParams = [targetId];
    if (creatorId !== null && creatorId !== undefined) {
      authQuery += ' AND creator_id = $2';
      authParams.push(Number(creatorId));
    }
    const checkRes = await client.query(authQuery, authParams);
    if (checkRes.rows.length === 0) {
      throw new Error('Website not found or unauthorized.');
    }
    const websiteInfo = checkRes.rows[0];

    const purgeSql = `
      DO $$
      DECLARE
        target_site_id BIGINT := ${targetId};
        tbl text;
      BEGIN
        UPDATE websites SET subscription_id = NULL WHERE id = target_site_id;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_book_student_returns') THEN
          DELETE FROM website_book_student_returns WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_book_student_issues') THEN
          DELETE FROM website_book_student_issues WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_book_teacher_returns') THEN
          DELETE FROM website_book_teacher_returns WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_book_teacher_issues') THEN
          DELETE FROM website_book_teacher_issues WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_books') THEN
          DELETE FROM website_books WHERE website_id = target_site_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_teacher_salary_payments') THEN
          DELETE FROM website_teacher_salary_payments WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_teacher_salaries') THEN
          DELETE FROM website_teacher_salaries WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_teacher_payrolls') THEN
          DELETE FROM website_teacher_payrolls WHERE website_id = target_site_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_officer_salary_payments') THEN
          DELETE FROM website_officer_salary_payments WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_officer_salaries') THEN
          DELETE FROM website_officer_salaries WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_officer_payrolls') THEN
          DELETE FROM website_officer_payrolls WHERE website_id = target_site_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_staff_salary_payments') THEN
          DELETE FROM website_staff_salary_payments WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_staff_salaries') THEN
          DELETE FROM website_staff_salaries WHERE website_id = target_site_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_teacher_attendance') THEN
          DELETE FROM website_teacher_attendance WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_teacher_class_periods') THEN
          DELETE FROM website_teacher_class_periods WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_teacher_subjects') THEN
          DELETE FROM website_teacher_subjects WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_teacher_qualifications') THEN
          DELETE FROM website_teacher_qualifications WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_teacher_login_activities') THEN
          DELETE FROM website_teacher_login_activities WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_teacher_login_sessions') THEN
          DELETE FROM website_teacher_login_sessions WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_teacher_ids') THEN
          DELETE FROM website_teacher_ids WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_teachers') THEN
          DELETE FROM website_teachers WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'website_teacher_designation') THEN
          DELETE FROM website_teacher_designation WHERE website_id = target_site_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
          DELETE FROM subscriptions WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchases') THEN
          DELETE FROM purchases WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
          DELETE FROM reviews WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'supports') THEN
          DELETE FROM supports WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'live_chats') THEN
          DELETE FROM live_chats WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'live_chat') THEN
          DELETE FROM live_chat WHERE website_id = target_site_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_sessions') THEN
          DELETE FROM staff_sessions WHERE website_id = target_site_id;
        END IF;

        FOR tbl IN
          SELECT c.table_name
          FROM information_schema.columns c
          JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = 'public'
          WHERE c.column_name = 'website_id'
            AND c.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
            AND c.table_name != 'websites'
        LOOP
          BEGIN
            EXECUTE format('DELETE FROM %I WHERE website_id = $1', tbl) USING target_site_id;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        END LOOP;

        DELETE FROM websites WHERE id = target_site_id;
      END $$;
    `;

    await client.query(purgeSql);

    if (!isClient) {
      await client.query('COMMIT');
    }

    return {
      success: true,
      websiteId: targetId,
      name: websiteInfo.name,
      slug: websiteInfo.slug
    };
  } catch (error) {
    if (!isClient) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw error;
  } finally {
    if (!isClient) {
      client.release();
    }
  }
}
