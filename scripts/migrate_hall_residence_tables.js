import { queryDb, pool } from '../src/lib/database/db.js';

async function migrate() {
  console.log('--- Starting Residence & Hall Tables Migration ---');
  try {
    // 1. website_halls
    await queryDb(`
      CREATE TABLE IF NOT EXISTS website_halls (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(50),
          gender VARCHAR(20) DEFAULT 'male' CHECK (gender IN ('male', 'female', 'co-ed')),
          provost_name VARCHAR(255),
          provost_staff_id BIGINT REFERENCES website_staffs(id) ON DELETE SET NULL,
          provost_teacher_id BIGINT REFERENCES website_teachers(id) ON DELETE SET NULL,
          contact_number VARCHAR(50),
          email VARCHAR(255),
          location TEXT,
          description TEXT,
          total_floors INT DEFAULT 1,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(website_id, name)
      );
    `);
    console.log('✓ website_halls table ready');

    // 2. website_hall_rooms
    await queryDb(`
      CREATE TABLE IF NOT EXISTS website_hall_rooms (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          hall_id BIGINT NOT NULL REFERENCES website_halls(id) ON DELETE CASCADE,
          room_number VARCHAR(50) NOT NULL,
          floor_number INT DEFAULT 1,
          room_type VARCHAR(50) DEFAULT 'standard' CHECK (room_type IN ('single', 'double', 'triple', 'quad', 'dormitory', 'standard')),
          capacity INT NOT NULL DEFAULT 4,
          rent_monthly NUMERIC(10, 2) DEFAULT 0.00,
          is_active BOOLEAN DEFAULT TRUE,
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(hall_id, room_number)
      );
    `);
    console.log('✓ website_hall_rooms table ready');

    // 3. website_hall_room_seats
    await queryDb(`
      CREATE TABLE IF NOT EXISTS website_hall_room_seats (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          hall_id BIGINT NOT NULL REFERENCES website_halls(id) ON DELETE CASCADE,
          room_id BIGINT NOT NULL REFERENCES website_hall_rooms(id) ON DELETE CASCADE,
          seat_number VARCHAR(50) NOT NULL,
          status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'allocated', 'maintenance', 'reserved')),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(room_id, seat_number)
      );
    `);
    console.log('✓ website_hall_room_seats table ready');

    // 4. website_hall_seat_allocations
    await queryDb(`
      CREATE TABLE IF NOT EXISTS website_hall_seat_allocations (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          hall_id BIGINT NOT NULL REFERENCES website_halls(id) ON DELETE CASCADE,
          room_id BIGINT NOT NULL REFERENCES website_hall_rooms(id) ON DELETE CASCADE,
          seat_id BIGINT NOT NULL REFERENCES website_hall_room_seats(id) ON DELETE CASCADE,
          student_id BIGINT NOT NULL REFERENCES website_students(id) ON DELETE CASCADE,
          session_id BIGINT REFERENCES website_sessions(id) ON DELETE SET NULL,
          allocated_date DATE DEFAULT CURRENT_DATE,
          end_date DATE,
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'vacated', 'cancelled', 'suspended')),
          fee_monthly NUMERIC(10, 2) DEFAULT 0.00,
          remarks TEXT,
          allocated_by_staff_id BIGINT REFERENCES website_staffs(id) ON DELETE SET NULL,
          vacated_date DATE,
          vacated_by_staff_id BIGINT REFERENCES website_staffs(id) ON DELETE SET NULL,
          vacate_reason TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ website_hall_seat_allocations table ready');

    // 5. Indexes
    await queryDb(`
      CREATE INDEX IF NOT EXISTS idx_ws_halls_website ON website_halls(website_id);
      CREATE INDEX IF NOT EXISTS idx_ws_halls_active ON website_halls(website_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_ws_hall_rooms_hall ON website_hall_rooms(hall_id);
      CREATE INDEX IF NOT EXISTS idx_ws_hall_rooms_website ON website_hall_rooms(website_id);
      CREATE INDEX IF NOT EXISTS idx_ws_hall_seats_room ON website_hall_room_seats(room_id);
      CREATE INDEX IF NOT EXISTS idx_ws_hall_seats_hall ON website_hall_room_seats(hall_id);
      CREATE INDEX IF NOT EXISTS idx_ws_hall_seats_status ON website_hall_room_seats(website_id, status);
      CREATE INDEX IF NOT EXISTS idx_ws_hall_alloc_student ON website_hall_seat_allocations(student_id);
      CREATE INDEX IF NOT EXISTS idx_ws_hall_alloc_seat ON website_hall_seat_allocations(seat_id);
      CREATE INDEX IF NOT EXISTS idx_ws_hall_alloc_status ON website_hall_seat_allocations(website_id, status);
      CREATE INDEX IF NOT EXISTS idx_ws_hall_alloc_hall ON website_hall_seat_allocations(hall_id);
    `);
    console.log('✓ Indexes successfully verified/created');

    console.log('🎉 All 4 Residence & Hall tables successfully migrated!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
