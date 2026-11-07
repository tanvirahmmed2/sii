import { query } from './db.js';

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
