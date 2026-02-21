import { query } from './connection.js';

export async function createSchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student', 'parent')),
        avatar TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        class TEXT NOT NULL,
        section TEXT NOT NULL,
        roll_number TEXT NOT NULL,
        parent_id TEXT,
        attendance DOUBLE PRECISION DEFAULT 0,
        performance DOUBLE PRECISION DEFAULT 0,
        avatar TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        classes TEXT NOT NULL DEFAULT '[]',
        phone TEXT,
        avatar TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late')),
        marked_by TEXT REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(student_id, date)
      );

      CREATE TABLE IF NOT EXISTS notices (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        date TEXT NOT NULL,
        priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high')),
        created_by TEXT REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS timetable (
        id TEXT PRIMARY KEY,
        class TEXT NOT NULL,
        section TEXT NOT NULL,
        day TEXT NOT NULL,
        period INTEGER NOT NULL,
        subject TEXT NOT NULL,
        teacher_id TEXT REFERENCES teachers(id),
        start_time TEXT,
        end_time TEXT,
        room TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS syllabus (
        id TEXT PRIMARY KEY,
        class TEXT NOT NULL,
        subject TEXT NOT NULL,
        unit TEXT NOT NULL,
        topic TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'not_started' CHECK(status IN ('not_started', 'in_progress', 'completed')),
        completion_percentage DOUBLE PRECISION DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS exam_results (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        exam TEXT NOT NULL,
        subject TEXT NOT NULL,
        score DOUBLE PRECISION NOT NULL,
        total DOUBLE PRECISION NOT NULL DEFAULT 100,
        grade TEXT,
        date TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create indexes (CREATE INDEX IF NOT EXISTS is PG-compatible)
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_students_class ON students(class)',
      'CREATE INDEX IF NOT EXISTS idx_students_section ON students(class, section)',
      'CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id)',
      'CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date)',
      'CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance_records(student_id, date)',
      'CREATE INDEX IF NOT EXISTS idx_notices_date ON notices(date)',
      'CREATE INDEX IF NOT EXISTS idx_notices_priority ON notices(priority)',
      'CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable(class, section, day)',
      'CREATE INDEX IF NOT EXISTS idx_syllabus_class ON syllabus(class, subject)',
      'CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON exam_results(exam)',
    ];

    for (const idx of indexes) {
      await query(idx);
    }

    console.log('[DB] Schema created successfully');
  } catch (error) {
    console.error('[DB] Failed to create schema:', error.message);
    throw error;
  }
}
