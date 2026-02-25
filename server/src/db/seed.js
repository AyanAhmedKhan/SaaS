import { query, getClient, closePool } from './connection.js';
import { createSchema } from './schema.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('[SEED] Starting multi-tenant database seed...');

  try {
    await createSchema();

    const client = await getClient();
    const passwordHash = bcrypt.hashSync('demo123', 12);

    try {
      await client.query('BEGIN');

      // ════════════════════════════════════════
      // 1. INSTITUTE
      // ════════════════════════════════════════
      await client.query(`
        INSERT INTO institutes (id, name, code, address, city, state, phone, email, subscription_plan, max_students)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (id) DO NOTHING
      `, [
        'inst_01', 'Springfield Academy', 'SPRING01',
        '123 Education Lane', 'Springfield', 'Maharashtra',
        '+91 9876543210', 'admin@springfield.edu',
        'premium', 5000
      ]);
      console.log('[SEED] Institute created');

      // ════════════════════════════════════════
      // 2. USERS (all roles)
      // ════════════════════════════════════════
      const users = [
        // Super admin – no institute
        { id: 'user_super_01', inst: null, name: 'Platform Admin', email: 'super@eduyantra.com', role: 'super_admin', phone: '+91 9000000001' },
        // Institute admin
        { id: 'user_admin_01', inst: 'inst_01', name: 'Rajesh Kumar', email: 'admin@springfield.edu', role: 'institute_admin', phone: '+91 9000000002' },
        // Class teachers
        { id: 'user_ct_01', inst: 'inst_01', name: 'Priya Sharma', email: 'priya.sharma@springfield.edu', role: 'class_teacher', phone: '+91 9000000003' },
        { id: 'user_ct_02', inst: 'inst_01', name: 'Amit Patel', email: 'amit.patel@springfield.edu', role: 'class_teacher', phone: '+91 9000000004' },
        // Subject teachers
        { id: 'user_st_01', inst: 'inst_01', name: 'Sunita Verma', email: 'sunita.verma@springfield.edu', role: 'subject_teacher', phone: '+91 9000000005' },
        { id: 'user_st_02', inst: 'inst_01', name: 'Deepak Joshi', email: 'deepak.joshi@springfield.edu', role: 'subject_teacher', phone: '+91 9000000006' },
        { id: 'user_st_03', inst: 'inst_01', name: 'Kavita Singh', email: 'kavita.singh@springfield.edu', role: 'subject_teacher', phone: '+91 9000000007' },
        // Students
        { id: 'user_stu_01', inst: 'inst_01', name: 'Arjun Sharma', email: 'arjun@springfield.edu', role: 'student', phone: null },
        { id: 'user_stu_02', inst: 'inst_01', name: 'Meera Patel', email: 'meera@springfield.edu', role: 'student', phone: null },
        { id: 'user_stu_03', inst: 'inst_01', name: 'Rohan Gupta', email: 'rohan@springfield.edu', role: 'student', phone: null },
        { id: 'user_stu_04', inst: 'inst_01', name: 'Anita Desai', email: 'anita@springfield.edu', role: 'student', phone: null },
        { id: 'user_stu_05', inst: 'inst_01', name: 'Vikram Rao', email: 'vikram@springfield.edu', role: 'student', phone: null },
        { id: 'user_stu_06', inst: 'inst_01', name: 'Neha Iyer', email: 'neha@springfield.edu', role: 'student', phone: null },
        // Parents
        { id: 'user_par_01', inst: 'inst_01', name: 'Ramesh Sharma', email: 'ramesh.sharma@gmail.com', role: 'parent', phone: '+91 9000000010' },
        { id: 'user_par_02', inst: 'inst_01', name: 'Suresh Patel', email: 'suresh.patel@gmail.com', role: 'parent', phone: '+91 9000000011' },
        { id: 'user_par_03', inst: 'inst_01', name: 'Mahesh Gupta', email: 'mahesh.gupta@gmail.com', role: 'parent', phone: '+91 9000000012' },
      ];

      for (const u of users) {
        await client.query(
          `INSERT INTO users (id, institute_id, name, email, password_hash, role, phone)
           VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
          [u.id, u.inst, u.name, u.email, passwordHash, u.role, u.phone]
        );
      }
      console.log('[SEED] Users seeded:', users.length);

      // ════════════════════════════════════════
      // 3. ACADEMIC YEAR
      // ════════════════════════════════════════
      await client.query(`
        INSERT INTO academic_years (id, institute_id, name, start_date, end_date, is_current)
        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING
      `, ['ay_2024', 'inst_01', '2024-2025', '2024-04-01', '2025-03-31', true]);
      console.log('[SEED] Academic year created');

      // ════════════════════════════════════════
      // 4. CLASSES
      // ════════════════════════════════════════
      const classes = [
        { id: 'cls_9a', name: '9th', section: 'A' },
        { id: 'cls_9b', name: '9th', section: 'B' },
        { id: 'cls_10a', name: '10th', section: 'A' },
        { id: 'cls_10b', name: '10th', section: 'B' },
        { id: 'cls_11a', name: '11th', section: 'A' },
        { id: 'cls_11b', name: '11th', section: 'B' },
      ];

      for (const c of classes) {
        await client.query(
          `INSERT INTO classes (id, institute_id, academic_year_id, name, section)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
          [c.id, 'inst_01', 'ay_2024', c.name, c.section]
        );
      }
      console.log('[SEED] Classes seeded:', classes.length);

      // ════════════════════════════════════════
      // 5. SUBJECTS
      // ════════════════════════════════════════
      const subjects = [
        { id: 'sub_math', name: 'Mathematics', code: 'MATH' },
        { id: 'sub_phy', name: 'Physics', code: 'PHY' },
        { id: 'sub_chem', name: 'Chemistry', code: 'CHEM' },
        { id: 'sub_eng', name: 'English', code: 'ENG' },
        { id: 'sub_bio', name: 'Biology', code: 'BIO' },
      ];
      const subjectIds = subjects.map(s => s.id);

      for (const s of subjects) {
        await client.query(
          `INSERT INTO subjects (id, institute_id, name, code)
           VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
          [s.id, 'inst_01', s.name, s.code]
        );
      }
      console.log('[SEED] Subjects seeded:', subjects.length);

      // ════════════════════════════════════════
      // 6. TEACHERS
      // ════════════════════════════════════════
      const teachers = [
        { id: 'tch_01', user_id: 'user_ct_01', name: 'Priya Sharma', email: 'priya.sharma@springfield.edu', phone: '+91 9000000003', spec: 'Mathematics', qual: 'M.Sc Mathematics', exp: 8 },
        { id: 'tch_02', user_id: 'user_ct_02', name: 'Amit Patel', email: 'amit.patel@springfield.edu', phone: '+91 9000000004', spec: 'Physics', qual: 'M.Sc Physics', exp: 12 },
        { id: 'tch_03', user_id: 'user_st_01', name: 'Sunita Verma', email: 'sunita.verma@springfield.edu', phone: '+91 9000000005', spec: 'Chemistry', qual: 'M.Sc Chemistry', exp: 6 },
        { id: 'tch_04', user_id: 'user_st_02', name: 'Deepak Joshi', email: 'deepak.joshi@springfield.edu', phone: '+91 9000000006', spec: 'English', qual: 'M.A English Literature', exp: 10 },
        { id: 'tch_05', user_id: 'user_st_03', name: 'Kavita Singh', email: 'kavita.singh@springfield.edu', phone: '+91 9000000007', spec: 'Biology', qual: 'M.Sc Zoology', exp: 5 },
      ];

      for (const t of teachers) {
        await client.query(
          `INSERT INTO teachers (id, user_id, institute_id, name, email, phone, subject_specialization, qualification, experience_years)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
          [t.id, t.user_id, 'inst_01', t.name, t.email, t.phone, t.spec, t.qual, t.exp]
        );
      }
      console.log('[SEED] Teachers seeded:', teachers.length);

      // Set class teachers
      await client.query(`UPDATE classes SET class_teacher_id = 'tch_01' WHERE id IN ('cls_10a','cls_10b')`);
      await client.query(`UPDATE classes SET class_teacher_id = 'tch_02' WHERE id IN ('cls_11a','cls_11b')`);

      // ════════════════════════════════════════
      // 7. CLASS-SUBJECT MAPPINGS
      // ════════════════════════════════════════
      const teacherSubjectMap = {
        sub_math: 'tch_01', sub_phy: 'tch_02', sub_chem: 'tch_03',
        sub_eng: 'tch_04', sub_bio: 'tch_05',
      };
      let csIdx = 0;
      for (const cls of classes) {
        for (const sub of subjectIds) {
          csIdx++;
          await client.query(
            `INSERT INTO class_subjects (id, class_id, subject_id, teacher_id, periods_per_week)
             VALUES ($1,$2,$3,$4,$5) ON CONFLICT (class_id, subject_id) DO NOTHING`,
            [`cs_${csIdx}`, cls.id, sub, teacherSubjectMap[sub], 5]
          );
        }
      }
      console.log('[SEED] Class-subject mappings seeded:', csIdx);

      // ════════════════════════════════════════
      // 8. TEACHER ASSIGNMENTS
      // ════════════════════════════════════════
      let taIdx = 0;
      for (const cls of classes) {
        for (const sub of subjectIds) {
          taIdx++;
          const tId = teacherSubjectMap[sub];
          const isClassTeacher =
            (tId === 'tch_01' && ['cls_10a', 'cls_10b'].includes(cls.id)) ||
            (tId === 'tch_02' && ['cls_11a', 'cls_11b'].includes(cls.id));
          await client.query(
            `INSERT INTO teacher_assignments (id, teacher_id, class_id, subject_id, academic_year_id, institute_id, is_class_teacher)
             VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (teacher_id, class_id, subject_id, academic_year_id) DO NOTHING`,
            [`ta_${taIdx}`, tId, cls.id, sub, 'ay_2024', 'inst_01', isClassTeacher]
          );
        }
      }
      console.log('[SEED] Teacher assignments seeded:', taIdx);

      // ════════════════════════════════════════
      // 9. STUDENTS
      // ════════════════════════════════════════
      const studentData = [
        { id: 'stu_01', uid: 'user_stu_01', name: 'Arjun Sharma', email: 'arjun@springfield.edu', cls: 'cls_10a', roll: '1001', dob: '2009-05-15', gender: 'Male', pid: 'user_par_01', pname: 'Ramesh Sharma', pemail: 'ramesh.sharma@gmail.com', pphone: '+91 9000000010' },
        { id: 'stu_02', uid: 'user_stu_02', name: 'Meera Patel', email: 'meera@springfield.edu', cls: 'cls_10a', roll: '1002', dob: '2009-08-22', gender: 'Female', pid: 'user_par_02', pname: 'Suresh Patel', pemail: 'suresh.patel@gmail.com', pphone: '+91 9000000011' },
        { id: 'stu_03', uid: 'user_stu_03', name: 'Rohan Gupta', email: 'rohan@springfield.edu', cls: 'cls_10b', roll: '1003', dob: '2009-03-10', gender: 'Male', pid: 'user_par_03', pname: 'Mahesh Gupta', pemail: 'mahesh.gupta@gmail.com', pphone: '+91 9000000012' },
        { id: 'stu_04', uid: 'user_stu_04', name: 'Anita Desai', email: 'anita@springfield.edu', cls: 'cls_9a', roll: '901', dob: '2010-11-05', gender: 'Female', pid: 'user_par_01', pname: 'Ramesh Sharma', pemail: 'ramesh.sharma@gmail.com', pphone: '+91 9000000010' },
        { id: 'stu_05', uid: 'user_stu_05', name: 'Vikram Rao', email: 'vikram@springfield.edu', cls: 'cls_11a', roll: '1101', dob: '2008-07-20', gender: 'Male', pid: 'user_par_02', pname: 'Suresh Patel', pemail: 'suresh.patel@gmail.com', pphone: '+91 9000000011' },
        { id: 'stu_06', uid: 'user_stu_06', name: 'Neha Iyer', email: 'neha@springfield.edu', cls: 'cls_11b', roll: '1102', dob: '2008-09-14', gender: 'Female', pid: 'user_par_03', pname: 'Mahesh Gupta', pemail: 'mahesh.gupta@gmail.com', pphone: '+91 9000000012' },
      ];

      for (const s of studentData) {
        await client.query(
          `INSERT INTO students (id, user_id, institute_id, academic_year_id, class_id, name, email, roll_number, date_of_birth, gender, parent_id, parent_name, parent_email, parent_phone, admission_date)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (id) DO NOTHING`,
          [s.id, s.uid, 'inst_01', 'ay_2024', s.cls, s.name, s.email, s.roll, s.dob, s.gender, s.pid, s.pname, s.pemail, s.pphone, '2024-04-01']
        );
      }
      console.log('[SEED] Students seeded:', studentData.length);

      // ════════════════════════════════════════
      // 10. GRADING SYSTEMS
      // ════════════════════════════════════════
      const grades = [
        { name: 'A+', min: 90, max: 100, grade: 'A+', gp: 10 },
        { name: 'A', min: 80, max: 89.99, grade: 'A', gp: 9 },
        { name: 'B+', min: 70, max: 79.99, grade: 'B+', gp: 8 },
        { name: 'B', min: 60, max: 69.99, grade: 'B', gp: 7 },
        { name: 'C', min: 50, max: 59.99, grade: 'C', gp: 6 },
        { name: 'D', min: 33, max: 49.99, grade: 'D', gp: 5 },
        { name: 'F', min: 0, max: 32.99, grade: 'F', gp: 0 },
      ];

      for (let i = 0; i < grades.length; i++) {
        const g = grades[i];
        await client.query(
          `INSERT INTO grading_systems (id, institute_id, name, min_percentage, max_percentage, grade, grade_point, is_default)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          [`grd_${i + 1}`, 'inst_01', g.name, g.min, g.max, g.grade, g.gp, true]
        );
      }
      console.log('[SEED] Grading systems seeded:', grades.length);

      // ════════════════════════════════════════
      // 11. ATTENDANCE RECORDS (past 90 calendar days, weekdays only)
      // ════════════════════════════════════════
      const attStatuses = ['present', 'present', 'present', 'present', 'absent', 'late'];
      const today = new Date();
      let attIdx = 0;

      for (const s of studentData) {
        for (let d = 90; d >= 1; d--) {
          const date = new Date(today);
          date.setDate(date.getDate() - d);
          if (date.getDay() === 0 || date.getDay() === 6) continue;
          attIdx++;
          const status = attStatuses[Math.floor(Math.random() * attStatuses.length)];
          await client.query(
            `INSERT INTO attendance_records (id, institute_id, student_id, class_id, date, status, marked_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
            [`att_${attIdx}`, 'inst_01', s.id, s.cls, date.toISOString().split('T')[0], status, 'user_ct_01']
          );
        }
      }
      console.log('[SEED] Attendance records seeded:', attIdx);

      // ════════════════════════════════════════
      // 12. TIMETABLE (Mon–Fri, 6 periods)
      // ════════════════════════════════════════
      const periods = [
        { p: 1, start: '08:00', end: '08:45' },
        { p: 2, start: '08:50', end: '09:35' },
        { p: 3, start: '09:40', end: '10:25' },
        { p: 4, start: '10:40', end: '11:25' },
        { p: 5, start: '11:30', end: '12:15' },
        { p: 6, start: '13:00', end: '13:45' },
      ];

      let ttIdx = 0;
      for (const cls of classes) {
        for (let dow = 1; dow <= 5; dow++) {
          for (const pr of periods) {
            ttIdx++;
            const subIdx = ttIdx % subjectIds.length;
            const subId = subjectIds[subIdx];
            await client.query(
              `INSERT INTO timetable (id, institute_id, class_id, subject_id, teacher_id, day_of_week, period_number, start_time, end_time, room, academic_year_id)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
               ON CONFLICT (class_id, day_of_week, period_number, academic_year_id) DO NOTHING`,
              [`tt_${ttIdx}`, 'inst_01', cls.id, subId, teacherSubjectMap[subId], dow, pr.p, pr.start, pr.end, `Room ${100 + (ttIdx % 20)}`, 'ay_2024']
            );
          }
        }
      }
      console.log('[SEED] Timetable entries seeded:', ttIdx);

      // ════════════════════════════════════════
      // 13. NOTICES
      // ════════════════════════════════════════
      const noticesData = [
        { id: 'ntc_01', title: 'Annual Sports Day', content: 'The annual sports day will be held on March 15th. All students are expected to participate in at least one event.', priority: 'high', roles: '{student,parent,class_teacher,subject_teacher,institute_admin}' },
        { id: 'ntc_02', title: 'Parent-Teacher Meeting', content: 'PTM scheduled for this Saturday 10 AM to 2 PM. Parents are requested to attend.', priority: 'medium', roles: '{parent,class_teacher,institute_admin}' },
        { id: 'ntc_03', title: 'Holiday Notice - Diwali', content: 'School will remain closed from November 1st to 5th on account of Diwali festival.', priority: 'low', roles: '{student,parent,class_teacher,subject_teacher,institute_admin}' },
        { id: 'ntc_04', title: 'Final Exam Schedule', content: 'Final examination schedule has been released. Students must check the notice board and prepare accordingly.', priority: 'high', roles: '{student,parent,class_teacher}' },
      ];

      for (const n of noticesData) {
        await client.query(
          `INSERT INTO notices (id, institute_id, title, content, priority, target_roles, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
          [n.id, 'inst_01', n.title, n.content, n.priority, n.roles, 'user_admin_01']
        );
      }
      console.log('[SEED] Notices seeded:', noticesData.length);

      // ════════════════════════════════════════
      // 14. SYLLABUS
      // ════════════════════════════════════════
      const syllabusTopics = {
        sub_math: [
          { unit: 'Unit 1', topic: 'Algebra', desc: 'Linear equations, quadratic equations, polynomials' },
          { unit: 'Unit 2', topic: 'Geometry', desc: 'Circles, triangles, coordinate geometry' },
          { unit: 'Unit 3', topic: 'Trigonometry', desc: 'Sine, cosine, tangent and applications' },
        ],
        sub_phy: [
          { unit: 'Unit 1', topic: 'Mechanics', desc: "Newton's laws, motion, forces" },
          { unit: 'Unit 2', topic: 'Thermodynamics', desc: 'Heat, temperature, laws of thermodynamics' },
          { unit: 'Unit 3', topic: 'Optics', desc: 'Light, lenses, reflection, refraction' },
        ],
        sub_chem: [
          { unit: 'Unit 1', topic: 'Organic Chemistry', desc: 'Carbon compounds, hydrocarbons' },
          { unit: 'Unit 2', topic: 'Inorganic Chemistry', desc: 'Periodic table, chemical bonding' },
          { unit: 'Unit 3', topic: 'Physical Chemistry', desc: 'Solutions, electrochemistry' },
        ],
        sub_eng: [
          { unit: 'Unit 1', topic: 'Literature', desc: 'Poetry, prose, and drama analysis' },
          { unit: 'Unit 2', topic: 'Grammar', desc: 'Tenses, clauses, sentence construction' },
          { unit: 'Unit 3', topic: 'Writing Skills', desc: 'Essays, letters, reports' },
        ],
        sub_bio: [
          { unit: 'Unit 1', topic: 'Cell Biology', desc: 'Cell structure, division, functions' },
          { unit: 'Unit 2', topic: 'Genetics', desc: 'DNA, heredity, evolution' },
          { unit: 'Unit 3', topic: 'Ecology', desc: 'Ecosystems, biodiversity, conservation' },
        ],
      };

      const sylStatuses = ['not_started', 'in_progress', 'completed'];
      let sylIdx = 0;
      for (const classId of ['cls_9a', 'cls_10a', 'cls_11a']) {
        for (const [subjectId, topics] of Object.entries(syllabusTopics)) {
          for (const t of topics) {
            sylIdx++;
            const st = sylStatuses[Math.floor(Math.random() * 3)];
            const comp = st === 'completed' ? 100 : st === 'in_progress' ? Math.floor(Math.random() * 80) + 10 : 0;
            await client.query(
              `INSERT INTO syllabus (id, institute_id, class_id, subject_id, academic_year_id, unit_name, topic_name, description, status, completion_percentage)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
              [`syl_${sylIdx}`, 'inst_01', classId, subjectId, 'ay_2024', t.unit, t.topic, t.desc, st, comp]
            );
          }
        }
      }
      console.log('[SEED] Syllabus entries seeded:', sylIdx);

      // ════════════════════════════════════════
      // 15. EXAMS
      // ════════════════════════════════════════
      const examTypes = [
        { name: 'Unit Test 1', type: 'unit_test', date: '2024-07-15', total: 50, passing: 17 },
        { name: 'Mid Term', type: 'mid_term', date: '2024-09-20', total: 100, passing: 33 },
        { name: 'Unit Test 2', type: 'unit_test', date: '2024-11-10', total: 50, passing: 17 },
      ];

      let examIdx = 0;
      const examRecords = [];
      for (const cls of ['cls_10a', 'cls_10b', 'cls_11a']) {
        for (const sub of subjectIds) {
          for (const exam of examTypes) {
            examIdx++;
            const examId = `exam_${examIdx}`;
            examRecords.push({ id: examId, classId: cls, subjectId: sub, total: exam.total });
            await client.query(
              `INSERT INTO exams (id, institute_id, academic_year_id, name, exam_type, class_id, subject_id, total_marks, passing_marks, exam_date, status, created_by)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
              [examId, 'inst_01', 'ay_2024', exam.name, exam.type, cls, sub, exam.total, exam.passing, exam.date, 'completed', 'user_admin_01']
            );
          }
        }
      }
      console.log('[SEED] Exams seeded:', examIdx);

      // ════════════════════════════════════════
      // 16. EXAM RESULTS
      // ════════════════════════════════════════
      const gradeCalc = (pct) => {
        if (pct >= 90) return 'A+';
        if (pct >= 80) return 'A';
        if (pct >= 70) return 'B+';
        if (pct >= 60) return 'B';
        if (pct >= 50) return 'C';
        if (pct >= 33) return 'D';
        return 'F';
      };

      let erIdx = 0;
      for (const exam of examRecords) {
        const classStudents = studentData.filter(s => s.cls === exam.classId);
        for (const student of classStudents) {
          erIdx++;
          const marks = Math.floor(Math.random() * (exam.total * 0.4)) + Math.floor(exam.total * 0.6);
          const pct = (marks / exam.total) * 100;
          await client.query(
            `INSERT INTO exam_results (id, institute_id, exam_id, student_id, marks_obtained, grade)
             VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (exam_id, student_id) DO NOTHING`,
            [`er_${erIdx}`, 'inst_01', exam.id, student.id, marks, gradeCalc(pct)]
          );
        }
      }
      console.log('[SEED] Exam results seeded:', erIdx);

      // ════════════════════════════════════════
      // 17. ASSIGNMENTS
      // ════════════════════════════════════════
      const assignmentData = [
        { id: 'asgn_01', cls: 'cls_10a', sub: 'sub_math', tch: 'tch_01', title: 'Algebra Practice Set', desc: 'Solve all problems from Chapter 3', due: '2024-08-15T23:59:00Z', status: 'closed' },
        { id: 'asgn_02', cls: 'cls_10a', sub: 'sub_eng', tch: 'tch_04', title: 'Essay Writing', desc: 'Write a 500-word essay on "My Role Model"', due: '2024-09-01T23:59:00Z', status: 'closed' },
        { id: 'asgn_03', cls: 'cls_10b', sub: 'sub_phy', tch: 'tch_02', title: "Newton's Laws Worksheet", desc: "Complete the worksheet on Newton's three laws of motion", due: '2024-10-01T23:59:00Z', status: 'published' },
        { id: 'asgn_04', cls: 'cls_11a', sub: 'sub_chem', tch: 'tch_03', title: 'Lab Report: Titration', desc: 'Submit the lab report for acid-base titration experiment', due: '2024-11-15T23:59:00Z', status: 'published' },
      ];

      for (const a of assignmentData) {
        await client.query(
          `INSERT INTO assignments (id, institute_id, class_id, subject_id, teacher_id, academic_year_id, title, description, due_date, total_marks, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
          [a.id, 'inst_01', a.cls, a.sub, a.tch, 'ay_2024', a.title, a.desc, a.due, 100, a.status]
        );
      }
      console.log('[SEED] Assignments seeded:', assignmentData.length);

      // ── Assignment submissions (cls_10a students → asgn_01)
      const cls10aStudents = studentData.filter(s => s.cls === 'cls_10a');
      let subIdx = 0;
      for (const student of cls10aStudents) {
        subIdx++;
        await client.query(
          `INSERT INTO assignment_submissions (id, assignment_id, student_id, submission_text, submitted_at, marks_obtained, teacher_remarks, graded_by, graded_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (assignment_id, student_id) DO NOTHING`,
          [`asub_${subIdx}`, 'asgn_01', student.id, 'Completed all problems', '2024-08-14T18:00:00Z', 85 + Math.floor(Math.random() * 15), 'Good work!', 'user_ct_01', '2024-08-16T10:00:00Z']
        );
      }
      console.log('[SEED] Assignment submissions seeded:', subIdx);

      // ════════════════════════════════════════
      // 18. FEE STRUCTURES
      // ════════════════════════════════════════
      const feeStructures = [
        { id: 'fs_01', name: 'Monthly Tuition Fee', amount: 5000, type: 'tuition', freq: 'monthly', cls: null },
        { id: 'fs_02', name: 'Exam Fee', amount: 2000, type: 'exam', freq: 'half_yearly', cls: null },
        { id: 'fs_03', name: 'Lab Fee (11th)', amount: 1500, type: 'lab', freq: 'yearly', cls: 'cls_11a' },
        { id: 'fs_04', name: 'Library Fee', amount: 500, type: 'library', freq: 'yearly', cls: null },
      ];

      for (const f of feeStructures) {
        await client.query(
          `INSERT INTO fee_structures (id, institute_id, academic_year_id, class_id, name, amount, fee_type, frequency)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          [f.id, 'inst_01', 'ay_2024', f.cls, f.name, f.amount, f.type, f.freq]
        );
      }
      console.log('[SEED] Fee structures seeded:', feeStructures.length);

      // ── Fee payments (3 months tuition per student)
      let payIdx = 0;
      for (const student of studentData) {
        for (let m = 0; m < 3; m++) {
          payIdx++;
          const month = 4 + m; // April, May, June
          const dueDate = `2024-${String(month).padStart(2, '0')}-10`;
          const isPaid = m < 2; // first 2 months paid
          await client.query(
            `INSERT INTO fee_payments (id, institute_id, student_id, fee_structure_id, academic_year_id, amount, paid_amount, due_date, paid_date, payment_method, receipt_number, status, recorded_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
            [
              `pay_${payIdx}`, 'inst_01', student.id, 'fs_01', 'ay_2024',
              5000, isPaid ? 5000 : 0, dueDate,
              isPaid ? dueDate : null,
              isPaid ? 'cash' : null,
              isPaid ? `RCP-2024-${String(payIdx).padStart(4, '0')}` : null,
              isPaid ? 'paid' : 'pending',
              isPaid ? 'user_admin_01' : null,
            ]
          );
        }
      }
      console.log('[SEED] Fee payments seeded:', payIdx);

      // ════════════════════════════════════════
      // 19. TEACHER REMARKS
      // ════════════════════════════════════════
      const remarkContents = [
        { type: 'appreciation', content: 'Excellent performance in class. Keep up the good work!' },
        { type: 'general', content: 'Needs to improve punctuality. Has been late to class multiple times.' },
        { type: 'subject', content: 'Shows keen interest in the subject. Active participation in discussions.' },
      ];

      let rmkIdx = 0;
      for (const student of studentData.slice(0, 4)) {
        for (const remark of remarkContents) {
          rmkIdx++;
          await client.query(
            `INSERT INTO teacher_remarks (id, institute_id, student_id, teacher_id, remark_type, content, is_visible_to_parent, academic_year_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
            [`rmk_${rmkIdx}`, 'inst_01', student.id, 'tch_01', remark.type, remark.content, true, 'ay_2024']
          );
        }
      }
      console.log('[SEED] Teacher remarks seeded:', rmkIdx);

      // ════════════════════════════════════════
      // 20. NOTIFICATIONS
      // ════════════════════════════════════════
      const notifData = [
        { uid: 'user_stu_01', title: 'Assignment Due', msg: 'Your Algebra Practice Set is due tomorrow.', type: 'warning' },
        { uid: 'user_stu_01', title: 'Exam Results Published', msg: 'Unit Test 1 results are out. Check your report card.', type: 'info' },
        { uid: 'user_par_01', title: 'Fee Reminder', msg: 'June tuition fee payment is pending for Arjun Sharma.', type: 'warning' },
        { uid: 'user_ct_01', title: 'New Student Enrolled', msg: 'A new student has been enrolled in class 10th A.', type: 'info' },
        { uid: 'user_admin_01', title: 'Monthly Report Ready', msg: 'The attendance report for July is ready for review.', type: 'success' },
      ];

      for (let i = 0; i < notifData.length; i++) {
        const n = notifData[i];
        await client.query(
          `INSERT INTO notifications (id, institute_id, user_id, title, message, type)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
          [`notif_${i + 1}`, 'inst_01', n.uid, n.title, n.msg, n.type]
        );
      }
      console.log('[SEED] Notifications seeded:', notifData.length);

      // ════════════════════════════════════════
      // COMMIT
      // ════════════════════════════════════════
      await client.query('COMMIT');

      console.log('\n[SEED] ======================================');
      console.log('[SEED] Database seeded successfully!');
      console.log('[SEED] ======================================');
      console.log('[SEED] Demo login credentials (password: demo123):');
      console.log('[SEED]   Super Admin  : super@eduyantra.com');
      console.log('[SEED]   Inst. Admin  : admin@springfield.edu       (code: SPRING01)');
      console.log('[SEED]   Class Teacher: priya.sharma@springfield.edu (code: SPRING01)');
      console.log('[SEED]   Subj. Teacher: sunita.verma@springfield.edu (code: SPRING01)');
      console.log('[SEED]   Student      : arjun@springfield.edu       (code: SPRING01)');
      console.log('[SEED]   Parent       : ramesh.sharma@gmail.com     (code: SPRING01)');
      console.log('[SEED] ======================================\n');

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
