import { query } from '@/lib/db';

/**
 * Automatically synchronizes exam statuses based on system date (CURRENT_DATE)
 * - 'upcoming': CURRENT_DATE < start_date
 * - 'current': start_date <= CURRENT_DATE <= end_date
 * - 'previous': CURRENT_DATE > end_date
 */
export async function syncExamStatuses() {
  try {
    await query(`
      UPDATE exams
      SET status = CASE
        WHEN CURRENT_DATE < start_date THEN 'upcoming'
        WHEN CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date THEN 'current'
        WHEN CURRENT_DATE > end_date THEN 'previous'
      END
      WHERE status IS DISTINCT FROM (
        CASE
          WHEN CURRENT_DATE < start_date THEN 'upcoming'
          WHEN CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date THEN 'current'
          WHEN CURRENT_DATE > end_date THEN 'previous'
        END
      )
    `);
  } catch (error) {
    console.error('Error auto-synchronizing exam statuses:', error);
  }
}
