import { queryDb, pool } from '../src/lib/database/db.js';

async function migrate() {
  try {
    console.log('Starting migration for clubs tables...');

    // 1. Create website_clubs_category
    await queryDb(`
      CREATE TABLE IF NOT EXISTS website_clubs_category (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          slug VARCHAR(120) NOT NULL,
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(website_id, slug),
          UNIQUE(website_id, name)
      );

      DROP TRIGGER IF EXISTS update_website_clubs_category_updated_at ON website_clubs_category;
      CREATE TRIGGER update_website_clubs_category_updated_at
          BEFORE UPDATE ON website_clubs_category
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE INDEX IF NOT EXISTS idx_ws_club_cat_web ON website_clubs_category(website_id);
    `);
    console.log('✓ website_clubs_category created / verified');

    // 2. Enhance website_clubs
    await queryDb(`
      ALTER TABLE website_clubs 
        ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES website_clubs_category(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS has_chat_box BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS chat_box_title VARCHAR(255),
        ADD COLUMN IF NOT EXISTS chat_box_status VARCHAR(50) DEFAULT 'active';
    `);
    console.log('✓ website_clubs updated with category_id and chat columns');

    // 3. Enhance website_student_club_members
    await queryDb(`
      ALTER TABLE website_student_club_members 
        ADD COLUMN IF NOT EXISTS can_access_chat BOOLEAN NOT NULL DEFAULT TRUE;
    `);
    console.log('✓ website_student_club_members updated with can_access_chat');

    // 4. Create website_club_notices
    await queryDb(`
      CREATE TABLE IF NOT EXISTS website_club_notices (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          club_id BIGINT NOT NULL REFERENCES website_clubs(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL,
          description TEXT,
          attachment_url TEXT,
          published_date DATE DEFAULT CURRENT_DATE,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(website_id, club_id, slug)
      );

      DROP TRIGGER IF EXISTS update_website_club_notices_updated_at ON website_club_notices;
      CREATE TRIGGER update_website_club_notices_updated_at
          BEFORE UPDATE ON website_club_notices
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE INDEX IF NOT EXISTS idx_ws_club_notices_web ON website_club_notices(website_id);
      CREATE INDEX IF NOT EXISTS idx_ws_club_notices_club ON website_club_notices(website_id, club_id);
    `);
    console.log('✓ website_club_notices created / verified');

    // 5. Create website_club_news
    await queryDb(`
      CREATE TABLE IF NOT EXISTS website_club_news (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          club_id BIGINT NOT NULL REFERENCES website_clubs(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL,
          summary TEXT,
          content TEXT,
          image_url TEXT,
          published_date DATE DEFAULT CURRENT_DATE,
          is_published BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(website_id, club_id, slug)
      );

      DROP TRIGGER IF EXISTS update_website_club_news_updated_at ON website_club_news;
      CREATE TRIGGER update_website_club_news_updated_at
          BEFORE UPDATE ON website_club_news
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE INDEX IF NOT EXISTS idx_ws_club_news_web ON website_club_news(website_id);
      CREATE INDEX IF NOT EXISTS idx_ws_club_news_club ON website_club_news(website_id, club_id);
    `);
    console.log('✓ website_club_news created / verified');

    // 6. Create website_club_chats and website_club_chat_messages
    await queryDb(`
      CREATE TABLE IF NOT EXISTS website_club_chats (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          club_id BIGINT NOT NULL REFERENCES website_clubs(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by_teacher_id BIGINT REFERENCES website_teachers(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(website_id, club_id)
      );

      DROP TRIGGER IF EXISTS update_website_club_chats_updated_at ON website_club_chats;
      CREATE TRIGGER update_website_club_chats_updated_at
          BEFORE UPDATE ON website_club_chats
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE INDEX IF NOT EXISTS idx_ws_club_chats_web ON website_club_chats(website_id, club_id);

      CREATE TABLE IF NOT EXISTS website_club_chat_messages (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          club_id BIGINT NOT NULL REFERENCES website_clubs(id) ON DELETE CASCADE,
          chat_id BIGINT REFERENCES website_club_chats(id) ON DELETE CASCADE,
          sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('teacher', 'student', 'staff')),
          sender_id BIGINT NOT NULL,
          sender_name VARCHAR(255) NOT NULL,
          sender_photo TEXT,
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ws_club_chat_msg ON website_club_chat_messages(website_id, club_id, created_at);
    `);
    console.log('✓ website_club_chats and website_club_chat_messages created / verified');

    console.log('All migrations completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
