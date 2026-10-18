import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
  database: process.env.PG_DATABASE,
  ssl: { rejectUnauthorized: false }
});

const TASKS = [
  {
    key: 'student_id',
    systemTable: 'system_student_id_templates',
    websiteTable: 'website_student_id_templates',
    categoryMatch: 'student_id_card',
    defaultWidth: 86.00,
    defaultHeight: 54.00,
    orientation: 'landscape'
  },
  {
    key: 'teacher_id',
    systemTable: 'system_teacher_id_templates',
    websiteTable: 'website_teacher_id_templates',
    categoryMatch: 'teacher_id_card',
    defaultWidth: 86.00,
    defaultHeight: 54.00,
    orientation: 'landscape'
  },
  {
    key: 'officer_id',
    systemTable: 'system_officer_id_templates',
    websiteTable: 'website_officer_id_templates',
    categoryMatch: 'officer_id_card',
    defaultWidth: 86.00,
    defaultHeight: 54.00,
    orientation: 'landscape'
  },
  {
    key: 'student_tc',
    systemTable: 'system_student_tc_templates',
    websiteTable: 'website_student_tc_templates',
    categoryMatch: 'tc',
    defaultWidth: 210.00,
    defaultHeight: 297.00,
    orientation: 'portrait'
  },
  {
    key: 'student_testimonial',
    systemTable: 'system_student_testimonial_templates',
    websiteTable: 'website_student_testimonial_templates',
    categoryMatch: 'testimonial',
    defaultWidth: 210.00,
    defaultHeight: 297.00,
    orientation: 'portrait'
  },
  {
    key: 'student_certificate',
    systemTable: 'system_student_certificate_templates',
    websiteTable: 'website_student_certificate_templates',
    categoryMatch: 'certificate',
    defaultWidth: 297.00,
    defaultHeight: 210.00,
    orientation: 'landscape'
  },
  {
    key: 'payment_receipt',
    systemTable: 'system_payment_receipt_templates',
    websiteTable: 'website_payment_receipt_templates',
    categoryMatch: 'payment_receipt',
    defaultWidth: 210.00,
    defaultHeight: 297.00,
    orientation: 'portrait'
  },
  {
    key: 'poster',
    systemTable: 'system_poster_templates',
    websiteTable: 'website_poster_templates',
    categoryMatch: 'poster',
    defaultWidth: 210.00,
    defaultHeight: 297.00,
    orientation: 'portrait'
  }
];

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Beginning separate template tables migration...');
    await client.query('BEGIN');

    for (const task of TASKS) {
      console.log(`Creating tables for task: ${task.key} (${task.systemTable}, ${task.websiteTable})...`);

      // 1. Create task-specific system table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${task.systemTable} (
          id BIGSERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          dimension_width NUMERIC(8, 2) NOT NULL DEFAULT ${task.defaultWidth},
          dimension_height NUMERIC(8, 2) NOT NULL DEFAULT ${task.defaultHeight},
          dimension_unit VARCHAR(10) NOT NULL DEFAULT 'mm' CHECK (dimension_unit IN ('mm', 'px', 'in')),
          orientation VARCHAR(20) NOT NULL DEFAULT '${task.orientation}' CHECK (orientation IN ('portrait', 'landscape')),
          fabric_data JSONB NOT NULL DEFAULT '{}',
          fabric_back_data JSONB DEFAULT '{}',
          html_content TEXT NOT NULL DEFAULT '',
          css_content TEXT NOT NULL DEFAULT '',
          thumbnail_url TEXT,
          available_merge_tags JSONB NOT NULL DEFAULT '[]',
          is_active BOOLEAN DEFAULT TRUE,
          is_system_default BOOLEAN DEFAULT FALSE,
          created_by_developer_id BIGINT REFERENCES developers(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        DROP TRIGGER IF EXISTS update_${task.systemTable}_updated_at ON ${task.systemTable};
        CREATE TRIGGER update_${task.systemTable}_updated_at
          BEFORE UPDATE ON ${task.systemTable}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);

      // 2. Create task-specific website tenant table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${task.websiteTable} (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          system_template_id BIGINT REFERENCES ${task.systemTable}(id) ON DELETE SET NULL,
          name VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          is_default BOOLEAN DEFAULT FALSE,
          custom_fabric_data JSONB,
          custom_fabric_back_data JSONB,
          custom_html TEXT,
          custom_css TEXT,
          custom_variables JSONB DEFAULT '{}',
          created_by_staff_id BIGINT REFERENCES website_staffs(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(website_id, name)
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${task.websiteTable}_lookup ON ${task.websiteTable}(website_id, is_default);
        DROP TRIGGER IF EXISTS update_${task.websiteTable}_updated_at ON ${task.websiteTable};
        CREATE TRIGGER update_${task.websiteTable}_updated_at
          BEFORE UPDATE ON ${task.websiteTable}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);

      // 3. Migrate existing master templates from system_document_templates if exists
      const existingTpls = await client.query(
        `SELECT * FROM system_document_templates WHERE category = $1`,
        [task.categoryMatch]
      );

      for (const row of existingTpls.rows) {
        await client.query(`
          INSERT INTO ${task.systemTable} (
            name, slug, description, dimension_width, dimension_height,
            dimension_unit, orientation, fabric_data, fabric_back_data,
            html_content, css_content, thumbnail_url, available_merge_tags,
            is_active, is_system_default, created_by_developer_id
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
          )
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            html_content = EXCLUDED.html_content,
            css_content = EXCLUDED.css_content;
        `, [
          row.name,
          row.slug,
          row.description,
          row.dimension_width || task.defaultWidth,
          row.dimension_height || task.defaultHeight,
          row.dimension_unit || 'mm',
          row.orientation || task.orientation,
          JSON.stringify(row.grapes_data || {}),
          '{}',
          row.html_content || '',
          row.css_content || '',
          row.thumbnail_url || null,
          JSON.stringify(row.available_merge_tags || []),
          row.is_active ?? true,
          row.is_system_default ?? false,
          row.created_by_developer_id || null
        ]);
      }
    }

    // Ensure website_student_testimonials table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS website_student_testimonials (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        student_id BIGINT NOT NULL REFERENCES website_students(id) ON DELETE CASCADE,
        testimonial_no VARCHAR(100) NOT NULL,
        certificate_number VARCHAR(100),
        template_id BIGINT REFERENCES website_student_testimonial_templates(id) ON DELETE SET NULL,
        certificate_type VARCHAR(100) DEFAULT 'Academic & Character Testimonial',
        purpose VARCHAR(255),
        examination_name VARCHAR(255),
        session_name VARCHAR(100),
        passing_year VARCHAR(20),
        gpa VARCHAR(20),
        conduct VARCHAR(100) DEFAULT 'Exemplary',
        academic_character VARCHAR(100) DEFAULT 'Very Good',
        status VARCHAR(50) NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'revoked')),
        issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
        issued_by_staff_id BIGINT REFERENCES website_staffs(id) ON DELETE SET NULL,
        remarks TEXT,
        custom_data JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(website_id, testimonial_no)
      );
      CREATE INDEX IF NOT EXISTS idx_ws_student_testim_web ON website_student_testimonials(website_id);
      CREATE INDEX IF NOT EXISTS idx_ws_student_testim_student ON website_student_testimonials(website_id, student_id);
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
