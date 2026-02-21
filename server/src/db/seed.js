import { query, getClient, closePool } from './connection.js';
import { createSchema } from './schema.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
    console.log('[SEED] Starting database seed...');

    try {
        // Create schema
        await createSchema();

        const client = await getClient();
        const passwordHash = bcrypt.hashSync('demo123', 10);

        try {
            await client.query('BEGIN');

            // ---------- Users ----------
            const users = [
                { id: 'u1', name: 'Admin User', email: 'admin@school.com', role: 'admin' },
                { id: 'u2', name: 'Mr. Sharma', email: 'sharma@school.com', role: 'teacher' },
                { id: 'u3', name: 'Arjun Sharma', email: 'arjun@school.com', role: 'student' },
                { id: 'u4', name: 'Rajesh Sharma', email: 'rajesh@school.com', role: 'parent' },
                { id: 'u5', name: 'John Smith', email: 'john.smith@school.com', role: 'teacher' },
                { id: 'u6', name: 'Sarah Johnson', email: 'sarah.johnson@school.com', role: 'teacher' },
                { id: 'u7', name: 'Michael Chen', email: 'michael.chen@school.com', role: 'teacher' },
                { id: 'u8', name: 'Emily Davis', email: 'emily.davis@school.com', role: 'teacher' },
                { id: 'u9', name: 'David Wilson', email: 'david.wilson@school.com', role: 'teacher' },
            ];

            for (const u of users) {
                await client.query(
                    'INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
                    [u.id, u.name, u.email, passwordHash, u.role]
                );
            }
            console.log('[SEED] Users seeded:', users.length);

            // ---------- Students ----------
            const students = [
                { id: 's1', name: 'Emma Wilson', email: 'emma@student.school.com', class: '10th', section: 'A', roll_number: '101', parent_id: 'u4', attendance: 95, performance: 88 },
                { id: 's2', name: 'James Brown', email: 'james@student.school.com', class: '10th', section: 'A', roll_number: '102', parent_id: 'u4', attendance: 88, performance: 92 },
                { id: 's3', name: 'Sophia Davis', email: 'sophia@student.school.com', class: '10th', section: 'B', roll_number: '103', parent_id: 'u4', attendance: 92, performance: 85 },
                { id: 's4', name: 'Oliver Martinez', email: 'oliver@student.school.com', class: '9th', section: 'A', roll_number: '201', parent_id: 'u4', attendance: 78, performance: 75 },
                { id: 's5', name: 'Ava Johnson', email: 'ava@student.school.com', class: '9th', section: 'B', roll_number: '202', parent_id: 'u4', attendance: 98, performance: 95 },
                { id: 's6', name: 'William Taylor', email: 'william@student.school.com', class: '11th', section: 'A', roll_number: '301', parent_id: 'u4', attendance: 85, performance: 82 },
            ];

            for (const s of students) {
                await client.query(
                    'INSERT INTO students (id, name, email, class, section, roll_number, parent_id, attendance, performance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
                    [s.id, s.name, s.email, s.class, s.section, s.roll_number, s.parent_id, s.attendance, s.performance]
                );
            }
            console.log('[SEED] Students seeded:', students.length);

            // ---------- Teachers ----------
            const teachers = [
                { id: 't1', user_id: 'u5', name: 'John Smith', email: 'john.smith@school.com', subject: 'Mathematics', classes: ['10th A', '10th B', '11th A'], phone: '+1 234 567 8901' },
                { id: 't2', user_id: 'u6', name: 'Sarah Johnson', email: 'sarah.johnson@school.com', subject: 'Physics', classes: ['11th A', '11th B', '12th A'], phone: '+1 234 567 8902' },
                { id: 't3', user_id: 'u7', name: 'Michael Chen', email: 'michael.chen@school.com', subject: 'Chemistry', classes: ['9th A', '10th A', '11th B'], phone: '+1 234 567 8903' },
                { id: 't4', user_id: 'u8', name: 'Emily Davis', email: 'emily.davis@school.com', subject: 'English', classes: ['9th A', '9th B', '10th A', '10th B'], phone: '+1 234 567 8904' },
                { id: 't5', user_id: 'u9', name: 'David Wilson', email: 'david.wilson@school.com', subject: 'Biology', classes: ['11th A', '12th A', '12th B'], phone: '+1 234 567 8905' },
            ];

            for (const t of teachers) {
                await client.query(
                    'INSERT INTO teachers (id, user_id, name, email, subject, classes, phone) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
                    [t.id, t.user_id, t.name, t.email, t.subject, JSON.stringify(t.classes), t.phone]
                );
            }
            console.log('[SEED] Teachers seeded:', teachers.length);

            // ---------- Notices ----------
            const notices = [
                { id: 'n1', title: 'Annual Sports Day', content: 'The annual sports day will be held on March 15th. All students are expected to participate.', date: '2024-03-01', priority: 'high' },
                { id: 'n2', title: 'Parent-Teacher Meeting', content: 'PTM scheduled for this Saturday from 10 AM to 2 PM.', date: '2024-02-28', priority: 'medium' },
                { id: 'n3', title: 'Holiday Notice', content: 'School will remain closed on March 8th on account of Holi festival.', date: '2024-02-25', priority: 'low' },
                { id: 'n4', title: 'Exam Schedule Released', content: 'Final examination schedule has been released. Please check the notice board.', date: '2024-02-20', priority: 'high' },
            ];

            for (const n of notices) {
                await client.query(
                    'INSERT INTO notices (id, title, content, date, priority, created_by) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
                    [n.id, n.title, n.content, n.date, n.priority, 'u1']
                );
            }
            console.log('[SEED] Notices seeded:', notices.length);

            // ---------- Attendance Records ----------
            const statuses = ['present', 'present', 'present', 'present', 'absent', 'late'];
            const startDate = new Date('2024-01-01');
            let attIdx = 0;

            for (const s of students) {
                for (let d = 0; d < 60; d++) {
                    const date = new Date(startDate);
                    date.setDate(date.getDate() + d);
                    if (date.getDay() === 0 || date.getDay() === 6) continue; // skip weekends
                    attIdx++;
                    const status = statuses[Math.floor(Math.random() * statuses.length)];
                    await client.query(
                        'INSERT INTO attendance_records (id, student_id, date, status, marked_by) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
                        [`a${attIdx}`, s.id, date.toISOString().split('T')[0], status, 'u2']
                    );
                }
            }
            console.log('[SEED] Attendance records seeded:', attIdx);

            // ---------- Timetable ----------
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            const subjects = ['Mathematics', 'Physics', 'Chemistry', 'English', 'Biology'];
            const teacherMap = { 'Mathematics': 't1', 'Physics': 't2', 'Chemistry': 't3', 'English': 't4', 'Biology': 't5' };
            const periods = [
                { period: 1, start: '08:00', end: '08:45' },
                { period: 2, start: '08:50', end: '09:35' },
                { period: 3, start: '09:40', end: '10:25' },
                { period: 4, start: '10:40', end: '11:25' },
                { period: 5, start: '11:30', end: '12:15' },
                { period: 6, start: '13:00', end: '13:45' },
            ];

            let ttIdx = 0;
            for (const cls of ['9th', '10th', '11th']) {
                for (const sec of ['A', 'B']) {
                    for (const day of days) {
                        for (const p of periods) {
                            ttIdx++;
                            const subj = subjects[(ttIdx) % subjects.length];
                            await client.query(
                                'INSERT INTO timetable (id, class, section, day, period, subject, teacher_id, start_time, end_time, room) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING',
                                [`tt${ttIdx}`, cls, sec, day, p.period, subj, teacherMap[subj], p.start, p.end, `Room ${100 + (ttIdx % 20)}`]
                            );
                        }
                    }
                }
            }
            console.log('[SEED] Timetable records seeded:', ttIdx);

            // ---------- Syllabus ----------
            const units = {
                'Mathematics': [
                    { unit: 'Unit 1', topic: 'Algebra', desc: 'Linear equations, quadratic equations, polynomials' },
                    { unit: 'Unit 2', topic: 'Geometry', desc: 'Circles, triangles, coordinate geometry' },
                    { unit: 'Unit 3', topic: 'Trigonometry', desc: 'Sine, cosine, tangent and applications' },
                ],
                'Physics': [
                    { unit: 'Unit 1', topic: 'Mechanics', desc: 'Newton laws, motion, forces' },
                    { unit: 'Unit 2', topic: 'Thermodynamics', desc: 'Heat, temperature, laws of thermodynamics' },
                    { unit: 'Unit 3', topic: 'Optics', desc: 'Light, lenses, reflection, refraction' },
                ],
                'Chemistry': [
                    { unit: 'Unit 1', topic: 'Organic Chemistry', desc: 'Carbon compounds, hydrocarbons' },
                    { unit: 'Unit 2', topic: 'Inorganic Chemistry', desc: 'Periodic table, chemical bonding' },
                    { unit: 'Unit 3', topic: 'Physical Chemistry', desc: 'Solutions, electrochemistry' },
                ],
                'English': [
                    { unit: 'Unit 1', topic: 'Literature', desc: 'Poetry, prose, and drama analysis' },
                    { unit: 'Unit 2', topic: 'Grammar', desc: 'Tenses, clauses, sentence construction' },
                    { unit: 'Unit 3', topic: 'Writing Skills', desc: 'Essays, letters, reports' },
                ],
                'Biology': [
                    { unit: 'Unit 1', topic: 'Cell Biology', desc: 'Cell structure, division, functions' },
                    { unit: 'Unit 2', topic: 'Genetics', desc: 'DNA, heredity, evolution' },
                    { unit: 'Unit 3', topic: 'Ecology', desc: 'Ecosystems, biodiversity, conservation' },
                ],
            };

            const statusOptions = ['not_started', 'in_progress', 'completed'];
            let sylIdx = 0;
            for (const cls of ['9th', '10th', '11th']) {
                for (const [subject, unitList] of Object.entries(units)) {
                    for (const u of unitList) {
                        sylIdx++;
                        const status = statusOptions[Math.floor(Math.random() * 3)];
                        const completion = status === 'completed' ? 100 : status === 'in_progress' ? Math.floor(Math.random() * 80) + 10 : 0;
                        await client.query(
                            'INSERT INTO syllabus (id, class, subject, unit, topic, description, status, completion_percentage) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING',
                            [`syl${sylIdx}`, cls, subject, u.unit, u.topic, u.desc, status, completion]
                        );
                    }
                }
            }
            console.log('[SEED] Syllabus records seeded:', sylIdx);

            // ---------- Exam Results ----------
            const exams = ['Unit Test 1', 'Mid Term', 'Unit Test 2'];
            const gradeMap = (score) => {
                if (score >= 90) return 'A+';
                if (score >= 80) return 'A';
                if (score >= 70) return 'B+';
                if (score >= 60) return 'B';
                if (score >= 50) return 'C';
                return 'D';
            };

            let examIdx = 0;
            for (const s of students) {
                for (const exam of exams) {
                    for (const subj of subjects) {
                        examIdx++;
                        const score = Math.floor(Math.random() * 40) + 60; // 60-100
                        const examDate = exam === 'Unit Test 1' ? '2024-07-15' : exam === 'Mid Term' ? '2024-09-20' : '2024-11-10';
                        await client.query(
                            'INSERT INTO exam_results (id, student_id, exam, subject, score, total, grade, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING',
                            [`er${examIdx}`, s.id, exam, subj, score, 100, gradeMap(score), examDate]
                        );
                    }
                }
            }
            console.log('[SEED] Exam results seeded:', examIdx);

            await client.query('COMMIT');
            console.log('[SEED] Database seeded successfully!');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('[SEED] Error seeding database:', error.message);
        throw error;
    } finally {
        await closePool();
    }
}

seed().catch((err) => {
    console.error('[SEED] Fatal error:', err);
    process.exit(1);
});
