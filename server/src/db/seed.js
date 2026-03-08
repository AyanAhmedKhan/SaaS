import { query, getClient, closePool } from './connection.js';
import { createSchema } from './schema.js';
import bcrypt from 'bcryptjs';

// faker and uuid are loaded dynamically inside seed() to avoid crashing
// the server at startup when @faker-js/faker isn't installed in production.

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Build a multi-row VALUES clause with $1,$2,… placeholders and flat param array */
function buildBulkInsert(rows) {
  const params = [];
  const groups = [];
  let idx = 1;
  for (const row of rows) {
    const placeholders = row.map(() => `$${idx++}`);
    groups.push(`(${placeholders.join(',')})`);
    params.push(...row);
  }
  return { values: groups.join(',\n'), params };
}

/** Insert many rows in batches of `batchSize` using a single multi-row INSERT per batch */
async function bulkInsert(client, sql, rows, batchSize = 200) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { values, params } = buildBulkInsert(batch);
    await client.query(`${sql} VALUES ${values} ON CONFLICT DO NOTHING`, params);
  }
}

function gradeFromPct(pct) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 60) return 'B';
  if (pct >= 33) return 'C';
  return 'F';
}

/** Return `n` weekday date-strings going backwards from today */
function weekdaysBack(n) {
  const dates = [];
  const d = new Date();
  while (dates.length < n) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }
  }
  return dates;
}

// ─── Seed ──────────────────────────────────────────────────────────────────────

export async function seed() {
  console.log('[SEED] Starting comprehensive multi-tenant database seed…');

  // Dynamic imports — only loaded when seed() is actually called
  const { faker } = await import('@faker-js/faker');
  const { v4: uuidv4 } = await import('uuid');

  function shortId() {
    return uuidv4().replace(/-/g, '').slice(0, 16);
  }

  faker.seed(12345);

  try {
    await createSchema();

    const client = await getClient();
    const passwordHash = bcrypt.hashSync('demo123', 12);

    try {
      await client.query('BEGIN');

      // ====================================================================
      //  0. SUBSCRIPTION PLANS
      // ====================================================================
      console.log('[SEED] 0  – Subscription plans');
      const defaultPlans = [
        {
          id: 'plan_starter', slug: 'starter', name: 'Starter', tagline: 'Everything a small school needs',
          monthly_price: 2999, annual_price: 29990, max_students: 200, max_teachers: 15, max_admins: 1, max_classes: 10,
          features: JSON.stringify([
            { text: 'Admin Dashboard', included: true }, { text: 'Student Management', included: true },
            { text: 'Teacher Management', included: true }, { text: 'Attendance Tracking', included: true },
            { text: 'Timetable', included: true }, { text: 'Fee Management', included: true },
            { text: 'Notices & Announcements', included: true }, { text: 'Up to 10 Classes', included: true },
            { text: 'AI Insights', included: false }, { text: 'Exams & Grading', included: false },
            { text: 'Syllabus Tracking', included: false }, { text: 'Reports & Analytics', included: false },
            { text: 'Assignments', included: false }, { text: 'Multi-Admin Support', included: false },
          ]),
          is_default: true, sort_order: 1,
        },
        {
          id: 'plan_professional', slug: 'professional', name: 'Professional', tagline: 'Complete school OS for academics',
          monthly_price: 7999, annual_price: 79990, max_students: 1000, max_teachers: 75, max_admins: 5, max_classes: 40,
          features: JSON.stringify([
            { text: 'Everything in Starter', included: true, highlight: true },
            { text: 'Basic AI Insights', included: true }, { text: 'Exams & Grading System', included: true },
            { text: 'Syllabus Tracking', included: true }, { text: 'Performance Reports', included: true },
            { text: 'Assignments Module', included: true }, { text: 'Fee Analytics & Overdue', included: true },
            { text: 'Up to 5 Admin Accounts', included: true }, { text: 'Up to 40 Classes', included: true },
            { text: 'Student & Parent Dashboards', included: true },
            { text: 'At-Risk Student Detection', included: false }, { text: 'Predictive Analytics', included: false },
            { text: 'AI Report Generation', included: false }, { text: 'Multi-Branch Management', included: false },
          ]),
          is_default: true, sort_order: 2,
        },
        {
          id: 'plan_ai_pro', slug: 'ai_pro', name: 'AI Pro', tagline: "Your school's AI co-pilot",
          monthly_price: 12999, annual_price: 129990, max_students: 2000, max_teachers: 150, max_admins: 10, max_classes: 80,
          features: JSON.stringify([
            { text: 'Everything in Professional', included: true, highlight: true },
            { text: 'At-Risk Student Detection', included: true }, { text: 'Predictive Performance', included: true },
            { text: 'Attendance Heatmaps', included: true }, { text: 'Score Distribution Analysis', included: true },
            { text: 'Fee Defaulter Intelligence', included: true }, { text: 'Teacher Workload Optimizer', included: true },
            { text: 'AI Report Generation', included: true }, { text: 'Smart Alerts & Notifications', included: true },
            { text: 'Syllabus Pace Insights', included: true }, { text: 'AI Parent Summaries', included: true },
            { text: 'Up to 80 Classes', included: true },
            { text: 'Multi-Branch Management', included: false }, { text: 'REST API Access', included: false },
          ]),
          is_default: true, sort_order: 3,
        },
        {
          id: 'plan_enterprise', slug: 'enterprise', name: 'Enterprise', tagline: 'Scale without limits',
          monthly_price: 19999, annual_price: 199990, max_students: 99999, max_teachers: 99999, max_admins: 99999, max_classes: 99999,
          features: JSON.stringify([
            { text: 'Everything in AI Pro', included: true, highlight: true },
            { text: 'Unlimited Students & Staff', included: true }, { text: 'Multi-Branch Management', included: true },
            { text: 'Super Admin Dashboard', included: true }, { text: 'Custom Branding & White-Label', included: true },
            { text: 'REST API Access', included: true }, { text: 'Custom Report Builder', included: true },
            { text: 'Bulk Import/Export', included: true }, { text: 'Audit Logs & Compliance', included: true },
            { text: 'Custom Staff Roles', included: true }, { text: 'Dedicated Account Manager', included: true },
            { text: 'Priority Support (4hr SLA)', included: true }, { text: 'Free Data Migration', included: true },
            { text: 'On-Premise Deployment Option', included: true },
          ]),
          is_default: true, sort_order: 4,
        },
      ];

      const planRows = defaultPlans.map(p => [
        p.id, p.slug, p.name, p.tagline, p.monthly_price, p.annual_price,
        p.max_students, p.max_teachers, p.max_admins, p.max_classes,
        p.features, p.is_default, p.sort_order,
      ]);
      await bulkInsert(client,
        `INSERT INTO subscription_plans (id,slug,name,tagline,monthly_price,annual_price,max_students,max_teachers,max_admins,max_classes,features,is_default,sort_order)`,
        planRows);

      // ====================================================================
      //  1. SUPER ADMIN
      // ====================================================================
      console.log('[SEED] 1  – Super admin');
      await client.query(
        `INSERT INTO users (id,institute_id,name,email,password_hash,role,phone)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        ['user_super_01', null, 'Platform Admin', 'super@eduyantra.com', passwordHash, 'super_admin', '+91 9000000001']
      );

      // ====================================================================
      //  2. INSTITUTES
      // ====================================================================
      console.log('[SEED] 2  – Institutes');
      const NUM_EXTRA_INSTITUTES = 4;
      const institutes = [];
      institutes.push({
        id: 'inst_01', name: 'Springfield Academy', code: 'SPRING01',
        address: '123 Education Lane', city: 'Springfield', state: 'Maharashtra',
        phone: '+91 9876543210', email: 'admin@springfield.edu',
        subscription_plan: 'enterprise', max_students: 5000,
      });
      for (let i = 2; i <= NUM_EXTRA_INSTITUTES + 1; i++) {
        institutes.push({
          id: `inst_0${i}`,
          name: faker.company.name() + ' School',
          code: faker.string.alphanumeric(8).toUpperCase(),
          address: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          phone: faker.phone.number(),
          email: faker.internet.email().toLowerCase(),
          subscription_plan: faker.helpers.arrayElement(['starter', 'professional', 'ai_pro', 'enterprise']),
          max_students: faker.helpers.arrayElement([200, 1000, 2000, 5000]),
        });
      }

      const instRows = institutes.map(i => [
        i.id, i.name, i.code, i.address, i.city, i.state, i.phone, i.email, i.subscription_plan, i.max_students,
      ]);
      await bulkInsert(client,
        `INSERT INTO institutes (id,name,code,address,city,state,phone,email,subscription_plan,max_students)`,
        instRows);

      // ====================================================================
      //  Accumulators – collect all rows per table, then bulk-insert once
      // ====================================================================
      const allUserRows = [];
      const allAcademicYearRows = [];
      const allSubjectRows = [];
      const allClassRows = [];
      const allTeacherRows = [];
      const allStudentRows = [];
      const allClassSubjectRows = [];
      const allTeacherAssignmentRows = [];
      const allRolePermRows = [];
      const allGradingRows = [];
      const allAttendanceRows = [];
      const allTimetableRows = [];
      const allSyllabusRows = [];
      const allExamRows = [];
      const allExamResultRows = [];
      const allFeeStructureRows = [];
      const allFeePaymentRows = [];
      const allNoticeRows = [];
      const allAssignmentRows = [];
      const allAssignmentSubmissionRows = [];
      const allTeacherRemarkRows = [];
      const allHolidayRows = [];
      const allNotificationRows = [];
      const allAuditLogRows = [];

      // Global counters
      let teacherCounter = 0;
      let studentCounter = 0;
      let parentCounter = 0;
      let csIdx = 0;
      let taIdx = 0;
      let attIdx = 0;
      let ttIdx = 0;
      let sylIdx = 0;
      let examIdx = 0;
      let erIdx = 0;
      let payIdx = 0;
      let assignIdx = 0;
      let asubIdx = 0;
      let remarkIdx = 0;
      let holIdx = 0;
      let notifIdx = 0;
      let auditIdx = 0;

      // Track for class_teacher_id updates (needs teachers inserted first)
      const classTeacherUpdates = [];

      // Summary
      const summary = {
        students: 0, teachers: 0, attendance: 0, exams: 0, examResults: 0,
        feePayments: 0, assignments: 0, submissions: 0, remarks: 0,
        holidays: 0, notifications: 0, audits: 0,
      };

      console.log('[SEED] 3  – Preparing per-institute data…');

      for (const inst of institutes) {
        const isSpringfield = inst.id === 'inst_01';

        // ── Admin ──
        const adminId = `user_admin_${inst.id}`;
        const adminEmail = isSpringfield ? 'admin@springfield.edu' : faker.internet.email().toLowerCase();
        const adminName = isSpringfield ? 'Rajesh Kumar' : faker.person.fullName();
        allUserRows.push([adminId, inst.id, adminName, adminEmail, passwordHash, 'institute_admin', faker.phone.number()]);

        // ── Academic Years (current + previous) ──
        const ayCurrentId = `ay_2024_${inst.id}`;
        const ayPreviousId = `ay_2023_${inst.id}`;
        allAcademicYearRows.push(
          [ayCurrentId, inst.id, '2024-2025', '2024-04-01', '2025-03-31', true, false],
          [ayPreviousId, inst.id, '2023-2024', '2023-04-01', '2024-03-31', false, true],
        );

        // ── Subjects (7 per institute) ──
        const subjects = [
          { id: `sub_math_${inst.id}`, name: 'Mathematics', code: 'MATH' },
          { id: `sub_phy_${inst.id}`, name: 'Physics', code: 'PHY' },
          { id: `sub_chem_${inst.id}`, name: 'Chemistry', code: 'CHEM' },
          { id: `sub_eng_${inst.id}`, name: 'English', code: 'ENG' },
          { id: `sub_bio_${inst.id}`, name: 'Biology', code: 'BIO' },
          { id: `sub_cs_${inst.id}`, name: 'Computer Science', code: 'CS' },
          { id: `sub_hindi_${inst.id}`, name: 'Hindi', code: 'HIN' },
        ];
        for (const sub of subjects) {
          allSubjectRows.push([sub.id, inst.id, sub.name, sub.code]);
        }

        // ── Classes (9 per institute – 8A/B through 12A, giving wider coverage) ──
        const classConfigs = [
          { id: `cls_8a_${inst.id}`, name: '8th', section: 'A' },
          { id: `cls_8b_${inst.id}`, name: '8th', section: 'B' },
          { id: `cls_9a_${inst.id}`, name: '9th', section: 'A' },
          { id: `cls_9b_${inst.id}`, name: '9th', section: 'B' },
          { id: `cls_10a_${inst.id}`, name: '10th', section: 'A' },
          { id: `cls_10b_${inst.id}`, name: '10th', section: 'B' },
          { id: `cls_11a_${inst.id}`, name: '11th', section: 'A' },
          { id: `cls_11b_${inst.id}`, name: '11th', section: 'B' },
          { id: `cls_12a_${inst.id}`, name: '12th', section: 'A' },
        ];
        for (const cls of classConfigs) {
          allClassRows.push([cls.id, inst.id, ayCurrentId, cls.name, cls.section, 60]);
        }

        // ── Teachers ──
        const numTeachers = isSpringfield ? 25 : 12;
        const teachers = [];
        for (let i = 0; i < numTeachers; i++) {
          teacherCounter++;
          const isHardcodedCT = isSpringfield && i === 0;
          const isHardcodedST = isSpringfield && i === 1;

          const tName = isHardcodedCT ? 'Priya Sharma' : (isHardcodedST ? 'Sunita Verma' : faker.person.fullName());
          const tEmail = isHardcodedCT ? 'priya.sharma@springfield.edu' : (isHardcodedST ? 'sunita.verma@springfield.edu' : faker.internet.email().toLowerCase());
          const uId = `user_tch_${teacherCounter}`;
          const tId = `tch_${teacherCounter}`;
          const spec = faker.helpers.arrayElement(subjects).name;

          allUserRows.push([uId, inst.id, tName, tEmail, passwordHash, 'faculty', faker.phone.number()]);
          allTeacherRows.push([tId, uId, inst.id, tName, tEmail, faker.phone.number(), spec, faker.number.int({ min: 1, max: 25 })]);
          teachers.push({ id: tId, userId: uId, spec });
        }
        summary.teachers += numTeachers;

        // ── Class-subject mappings & teacher assignments ──
        for (let i = 0; i < classConfigs.length; i++) {
          const cls = classConfigs[i];
          const classTeacher = teachers[i % teachers.length];
          classTeacherUpdates.push({ classId: cls.id, teacherId: classTeacher.id });

          for (const sub of subjects) {
            csIdx++;
            const sTeacher = faker.helpers.arrayElement(teachers);
            allClassSubjectRows.push([`cs_${csIdx}`, cls.id, sub.id, sTeacher.id, faker.number.int({ min: 3, max: 7 })]);

            taIdx++;
            allTeacherAssignmentRows.push([
              `ta_${taIdx}`, sTeacher.id, cls.id, sub.id, ayCurrentId, inst.id,
              sTeacher.id === classTeacher.id,
            ]);
          }
        }

        // ── Role permissions ──
        allRolePermRows.push(
          [`irp_ct_${inst.id}`, inst.id, 'class_teacher', JSON.stringify({ manage_students: true, manage_attendance: true, manage_remarks: true, manage_exams: false })],
          [`irp_st_${inst.id}`, inst.id, 'subject_teacher', JSON.stringify({ manage_students: false, manage_attendance: false, manage_remarks: false, manage_exams: false })],
        );

        // ── Students & Parents ──
        const studentsPerClass = isSpringfield ? 35 : 8;
        const currentInstStudents = [];
        for (const cls of classConfigs) {
          for (let n = 0; n < studentsPerClass; n++) {
            studentCounter++;
            parentCounter++;

            const isHardcodedStu = isSpringfield && cls.id === `cls_10a_${inst.id}` && n === 0;

            const sName = isHardcodedStu ? 'Arjun Sharma' : faker.person.fullName();
            const sEmail = isHardcodedStu ? 'arjun@springfield.edu' : faker.internet.email().toLowerCase();
            const pName = isHardcodedStu ? 'Ramesh Sharma' : faker.person.fullName();
            const pEmail = isHardcodedStu ? 'ramesh.sharma@gmail.com' : faker.internet.email().toLowerCase();
            const pId = `user_par_${parentCounter}`;
            const stuUID = `user_stu_${studentCounter}`;
            const stuId = `stu_${studentCounter}`;

            allUserRows.push(
              [pId, inst.id, pName, pEmail, passwordHash, 'parent', faker.phone.number()],
              [stuUID, inst.id, sName, sEmail, passwordHash, 'student', null],
            );

            const gender = faker.helpers.arrayElement(['Male', 'Female']);
            const age = faker.number.int({ min: 12, max: 18 });
            const dob = faker.date.between({ from: new Date(Date.now() - (age + 1) * 365.25 * 24 * 60 * 60 * 1000), to: new Date(Date.now() - age * 365.25 * 24 * 60 * 60 * 1000) }).toISOString().split('T')[0];
            allStudentRows.push([
              stuId, stuUID, inst.id, ayCurrentId, cls.id, sName, sEmail,
              `R${String(n + 1).padStart(3, '0')}`, '2024-04-01', dob, gender,
              faker.location.streetAddress(), faker.phone.number(),
              pId, pName, pEmail, faker.phone.number(),
              faker.helpers.arrayElement(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+']),
              'active',
            ]);

            currentInstStudents.push({ id: stuId, cls: cls.id, userId: stuUID, name: sName });
          }
        }
        summary.students += currentInstStudents.length;

        // ── Grading systems ──
        const gradeDefs = [
          { n: 'A+', min: 90, max: 100, g: 'A+', gp: 10 },
          { n: 'A', min: 80, max: 89.99, g: 'A', gp: 9 },
          { n: 'B+', min: 70, max: 79.99, g: 'B+', gp: 8 },
          { n: 'B', min: 60, max: 69.99, g: 'B', gp: 7 },
          { n: 'C', min: 33, max: 59.99, g: 'C', gp: 5 },
          { n: 'F', min: 0, max: 32.99, g: 'F', gp: 0 },
        ];
        for (let i = 0; i < gradeDefs.length; i++) {
          const g = gradeDefs[i];
          allGradingRows.push([`grd_${i}_${inst.id}`, inst.id, g.n, g.min, g.max, g.g, g.gp, true]);
        }

        // ── Attendance (bulk – 90 weekdays for Springfield, 10 for others) ──
        const attDays = isSpringfield ? 90 : 10;
        const dates = weekdaysBack(attDays);
        const attStatuses = ['present', 'present', 'present', 'present', 'absent', 'late', 'excused'];
        for (const s of currentInstStudents) {
          for (const dt of dates) {
            attIdx++;
            allAttendanceRows.push([
              `att_${attIdx}`, inst.id, s.id, s.cls, dt,
              faker.helpers.arrayElement(attStatuses),
            ]);
          }
        }
        summary.attendance += currentInstStudents.length * dates.length;

        // ── Timetable (7 periods Mon–Fri, 4 on Saturday) ──
        const periodSlots = [
          { p: 1, start: '08:00', end: '08:45' },
          { p: 2, start: '08:50', end: '09:35' },
          { p: 3, start: '09:40', end: '10:25' },
          { p: 4, start: '10:40', end: '11:25' },
          { p: 5, start: '11:30', end: '12:15' },
          { p: 6, start: '13:00', end: '13:45' },
          { p: 7, start: '13:50', end: '14:35' },
        ];
        for (const cls of classConfigs) {
          for (let dow = 1; dow <= 6; dow++) {
            const count = dow === 6 ? 4 : periodSlots.length;
            for (let pi = 0; pi < count; pi++) {
              ttIdx++;
              const pr = periodSlots[pi];
              allTimetableRows.push([
                `tt_${ttIdx}`, inst.id, cls.id,
                faker.helpers.arrayElement(subjects).id,
                faker.helpers.arrayElement(teachers).id,
                dow, pr.p, pr.start, pr.end,
                `Room ${faker.number.int({ min: 101, max: 120 })}`,
                ayCurrentId,
              ]);
            }
          }
        }

        // ── Syllabus (5 units per class-subject) ──
        for (const cls of classConfigs) {
          for (const sub of subjects) {
            for (let unit = 1; unit <= 5; unit++) {
              sylIdx++;
              const st = faker.helpers.arrayElement(['not_started', 'in_progress', 'completed']);
              const comp = st === 'completed' ? 100 : (st === 'in_progress' ? faker.number.int({ min: 20, max: 80 }) : 0);
              const targetDate = new Date('2024-04-01');
              targetDate.setDate(targetDate.getDate() + unit * 45);
              allSyllabusRows.push([
                `syl_${sylIdx}`, inst.id, cls.id, sub.id, ayCurrentId,
                `Unit ${unit}`, faker.lorem.words(3), faker.lorem.sentence(),
                st, comp, targetDate.toISOString().split('T')[0],
                st === 'completed' ? targetDate.toISOString().split('T')[0] : null,
              ]);
            }
          }
        }

        // ── Exams (4 exam types per class-subject) ──
        const examTypes = [
          { name: 'Unit Test 1', type: 'unit_test', date: '2024-07-15', status: 'completed' },
          { name: 'Mid Term', type: 'mid_term', date: '2024-09-20', status: 'completed' },
          { name: 'Unit Test 2', type: 'unit_test', date: '2024-11-10', status: 'completed' },
          { name: 'Final Exam', type: 'final', date: '2025-03-10', status: 'scheduled' },
        ];
        for (const cls of classConfigs) {
          for (const sub of subjects) {
            for (const et of examTypes) {
              examIdx++;
              const examId = `exam_${examIdx}`;
              const totalMarks = et.type === 'unit_test' ? 50 : 100;
              const passingMarks = Math.ceil(totalMarks * 0.33);
              allExamRows.push([
                examId, inst.id, ayCurrentId, et.name, et.type, cls.id, sub.id,
                totalMarks, passingMarks, et.date, et.status,
              ]);
              summary.exams++;

              if (et.status === 'completed') {
                const classStuds = currentInstStudents.filter(s => s.cls === cls.id);
                for (const std of classStuds) {
                  erIdx++;
                  const marks = faker.number.int({ min: Math.ceil(totalMarks * 0.15), max: totalMarks });
                  const pct = (marks / totalMarks) * 100;
                  allExamResultRows.push([
                    `er_${erIdx}`, inst.id, examId, std.id, marks, gradeFromPct(pct),
                  ]);
                  summary.examResults++;
                }
              }
            }
          }
        }

        // ── Fee structures & payments ──
        const feeStructures = [
          { name: 'Monthly Tuition Fee', type: 'tuition', freq: 'monthly' },
          { name: 'Library Fee', type: 'library', freq: 'yearly' },
          { name: 'Lab Fee', type: 'lab', freq: 'half_yearly' },
          { name: 'Transport Fee', type: 'transport', freq: 'monthly' },
        ];
        for (const fee of feeStructures) {
          const fsId = `fs_${inst.id}_${fee.name.replace(/\s+/g, '')}`;
          const amount = faker.number.int({ min: 500, max: 5000 });
          allFeeStructureRows.push([fsId, inst.id, ayCurrentId, null, fee.name, amount, fee.type, fee.freq]);

          for (const std of currentInstStudents) {
            payIdx++;
            const isPaid = faker.datatype.boolean();
            const paidAmt = isPaid ? amount : (faker.datatype.boolean() ? faker.number.int({ min: 0, max: amount - 1 }) : 0);
            const status = paidAmt >= amount ? 'paid' : (paidAmt > 0 ? 'partial' : 'pending');
            allFeePaymentRows.push([
              `pay_${payIdx}`, inst.id, std.id, fsId, ayCurrentId,
              amount, paidAmt, '2024-05-10',
              isPaid ? '2024-05-08' : null,
              isPaid ? faker.helpers.arrayElement(['cash', 'upi', 'bank_transfer']) : null,
              isPaid ? `RCP${payIdx}` : null,
              status,
            ]);
            summary.feePayments++;
          }
        }

        // ── Notices ──
        const noticeCount = isSpringfield ? 8 : 3;
        for (let n = 1; n <= noticeCount; n++) {
          allNoticeRows.push([
            `ntc_${inst.id}_${n}`, inst.id,
            faker.lorem.sentence({ min: 4, max: 8 }),
            faker.lorem.paragraphs(2),
            faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
            '{student,parent,faculty,institute_admin}',
            true, adminId,
          ]);
        }

        // ── Assignments & Submissions ──
        const assignmentCount = isSpringfield ? 4 : 2;
        for (const cls of classConfigs) {
          for (let ai = 0; ai < assignmentCount; ai++) {
            const sub = subjects[ai % subjects.length];
            const teacher = faker.helpers.arrayElement(teachers);
            assignIdx++;
            const assignId = `asgn_${assignIdx}`;
            const dueDate = new Date('2024-04-01');
            dueDate.setDate(dueDate.getDate() + (ai + 1) * 30 + faker.number.int({ min: 0, max: 15 }));
            const aStatus = faker.helpers.arrayElement(['draft', 'published', 'closed']);

            allAssignmentRows.push([
              assignId, inst.id, cls.id, sub.id, teacher.id, ayCurrentId,
              `${sub.name} - ${faker.lorem.words(3)}`,
              faker.lorem.paragraph(),
              faker.lorem.sentence(),
              dueDate.toISOString(),
              faker.helpers.arrayElement([50, 100]),
              null,
              aStatus,
              faker.datatype.boolean(),
            ]);
            summary.assignments++;

            if (aStatus !== 'draft') {
              const classStuds = currentInstStudents.filter(s => s.cls === cls.id);
              const submitters = classStuds.filter(() => faker.datatype.boolean({ probability: 0.75 }));
              for (const std of submitters) {
                asubIdx++;
                const isLate = faker.datatype.boolean({ probability: 0.1 });
                const marksObt = faker.datatype.boolean({ probability: 0.6 })
                  ? faker.number.int({ min: 20, max: 100 })
                  : null;
                allAssignmentSubmissionRows.push([
                  `asub_${asubIdx}`, assignId, std.id,
                  faker.lorem.sentence(),
                  null,
                  new Date(dueDate.getTime() - faker.number.int({ min: 0, max: 5 }) * 86400000).toISOString(),
                  isLate,
                  marksObt,
                  marksObt != null ? faker.helpers.arrayElement(['Good work', 'Needs improvement', 'Excellent', 'Satisfactory', 'Revise and resubmit']) : null,
                  marksObt != null ? teacher.userId : null,
                  marksObt != null ? new Date().toISOString() : null,
                ]);
                summary.submissions++;
              }
            }
          }
        }

        // ── Teacher Remarks ──
        const remarkRounds = isSpringfield ? 3 : 1;
        for (let ri = 0; ri < remarkRounds; ri++) {
          const sampledStudents = faker.helpers.arrayElements(currentInstStudents, Math.min(15, currentInstStudents.length));
          for (const std of sampledStudents) {
            remarkIdx++;
            const teacher = faker.helpers.arrayElement(teachers);
            const sub = faker.helpers.arrayElement(subjects);
            allTeacherRemarkRows.push([
              `rmk_${remarkIdx}`, inst.id, std.id, teacher.id, sub.id,
              faker.helpers.arrayElement(['general', 'subject', 'behavioral', 'appreciation']),
              faker.lorem.sentence({ min: 6, max: 15 }),
              faker.datatype.boolean({ probability: 0.8 }),
              ayCurrentId,
            ]);
            summary.remarks++;
          }
        }

        // ── Holidays ──
        const holidayList = [
          { date: '2024-08-15', name: 'Independence Day', type: 'national' },
          { date: '2024-10-02', name: 'Gandhi Jayanti', type: 'national' },
          { date: '2024-10-12', name: 'Dussehra', type: 'religious' },
          { date: '2024-11-01', name: 'Diwali', type: 'religious' },
          { date: '2024-11-15', name: "Children's Day", type: 'general' },
          { date: '2024-12-25', name: 'Christmas', type: 'religious' },
          { date: '2025-01-26', name: 'Republic Day', type: 'national' },
          { date: '2025-03-14', name: 'Holi', type: 'religious' },
          { date: '2025-03-05', name: 'Annual Exam Week Start', type: 'exam' },
          { date: '2025-03-06', name: 'Annual Exam Week', type: 'exam' },
          { date: '2025-03-07', name: 'Annual Exam Week End', type: 'exam' },
          { date: '2024-06-15', name: 'Summer Break Start', type: 'custom' },
        ];
        for (const h of holidayList) {
          holIdx++;
          allHolidayRows.push([
            `hol_${holIdx}`, inst.id, h.date, h.name, null, h.type, adminId,
          ]);
          summary.holidays++;
        }

        // ── Notifications (sample of students) ──
        const notifMessages = [
          { title: 'Welcome to EduYantra!', message: 'Your account has been set up successfully.', type: 'success' },
          { title: 'Fee Payment Reminder', message: 'Tuition fee for this month is due on the 10th.', type: 'warning' },
          { title: 'Timetable Updated', message: 'Your class timetable has been revised. Please check.', type: 'info' },
          { title: 'Exam Schedule Published', message: 'Mid-term exam schedule has been published.', type: 'info' },
          { title: 'Low Attendance Alert', message: 'Your attendance has dropped below 75%. Please improve.', type: 'error' },
        ];
        const notifStudents = faker.helpers.arrayElements(currentInstStudents, Math.min(20, currentInstStudents.length));
        for (const std of notifStudents) {
          for (const nm of notifMessages) {
            notifIdx++;
            allNotificationRows.push([
              `notif_${notifIdx}`, inst.id, std.userId, nm.title, nm.message,
              nm.type, faker.datatype.boolean({ probability: 0.4 }), null,
            ]);
            summary.notifications++;
          }
        }

        // ── Audit Logs ──
        const auditActions = [
          { action: 'LOGIN', entity: 'user' },
          { action: 'CREATE', entity: 'student' },
          { action: 'UPDATE', entity: 'attendance' },
          { action: 'CREATE', entity: 'fee_payment' },
          { action: 'UPDATE', entity: 'syllabus' },
          { action: 'CREATE', entity: 'assignment' },
          { action: 'UPDATE', entity: 'exam_result' },
        ];
        const auditCount = isSpringfield ? 25 : 5;
        for (let ai = 0; ai < auditCount; ai++) {
          auditIdx++;
          const act = faker.helpers.arrayElement(auditActions);
          allAuditLogRows.push([
            `audit_${auditIdx}`, inst.id, adminId, act.action, act.entity,
            shortId(), null, null, faker.internet.ip(), null,
          ]);
          summary.audits++;
        }

      } // ── end per-institute loop ──

      // ====================================================================
      //  4. BULK INSERTS (one per table, batched for safety)
      // ====================================================================
      console.log('[SEED] 4  – Bulk inserting users…');
      await bulkInsert(client,
        `INSERT INTO users (id,institute_id,name,email,password_hash,role,phone)`,
        allUserRows, 300);

      console.log('[SEED] 5  – Academic years…');
      await bulkInsert(client,
        `INSERT INTO academic_years (id,institute_id,name,start_date,end_date,is_current,is_archived)`,
        allAcademicYearRows);

      console.log('[SEED] 6  – Subjects…');
      await bulkInsert(client,
        `INSERT INTO subjects (id,institute_id,name,code)`,
        allSubjectRows);

      console.log('[SEED] 7  – Classes…');
      await bulkInsert(client,
        `INSERT INTO classes (id,institute_id,academic_year_id,name,section,capacity)`,
        allClassRows);

      console.log('[SEED] 8  – Teachers…');
      await bulkInsert(client,
        `INSERT INTO teachers (id,user_id,institute_id,name,email,phone,subject_specialization,experience_years)`,
        allTeacherRows);

      console.log('[SEED] 9  – Setting class teachers…');
      for (const upd of classTeacherUpdates) {
        await client.query(`UPDATE classes SET class_teacher_id = $1 WHERE id = $2`, [upd.teacherId, upd.classId]);
      }

      console.log('[SEED] 10 – Class-subject mappings…');
      await bulkInsert(client,
        `INSERT INTO class_subjects (id,class_id,subject_id,teacher_id,periods_per_week)`,
        allClassSubjectRows);

      console.log('[SEED] 11 – Teacher assignments…');
      await bulkInsert(client,
        `INSERT INTO teacher_assignments (id,teacher_id,class_id,subject_id,academic_year_id,institute_id,is_class_teacher)`,
        allTeacherAssignmentRows);

      console.log('[SEED] 12 – Role permissions…');
      await bulkInsert(client,
        `INSERT INTO institute_role_permissions (id,institute_id,role,permissions)`,
        allRolePermRows);

      console.log('[SEED] 13 – Students…');
      await bulkInsert(client,
        `INSERT INTO students (id,user_id,institute_id,academic_year_id,class_id,name,email,roll_number,admission_date,date_of_birth,gender,address,phone,parent_id,parent_name,parent_email,parent_phone,blood_group,status)`,
        allStudentRows, 300);

      console.log('[SEED] 14 – Grading systems…');
      await bulkInsert(client,
        `INSERT INTO grading_systems (id,institute_id,name,min_percentage,max_percentage,grade,grade_point,is_default)`,
        allGradingRows);

      console.log(`[SEED] 15 – Attendance (${allAttendanceRows.length.toLocaleString()} rows)…`);
      await bulkInsert(client,
        `INSERT INTO attendance_records (id,institute_id,student_id,class_id,date,status)`,
        allAttendanceRows, 500);

      console.log('[SEED] 16 – Timetable…');
      await bulkInsert(client,
        `INSERT INTO timetable (id,institute_id,class_id,subject_id,teacher_id,day_of_week,period_number,start_time,end_time,room,academic_year_id)`,
        allTimetableRows);

      console.log('[SEED] 17 – Syllabus…');
      await bulkInsert(client,
        `INSERT INTO syllabus (id,institute_id,class_id,subject_id,academic_year_id,unit_name,topic_name,description,status,completion_percentage,target_date,completed_date)`,
        allSyllabusRows);

      console.log('[SEED] 18 – Exams…');
      await bulkInsert(client,
        `INSERT INTO exams (id,institute_id,academic_year_id,name,exam_type,class_id,subject_id,total_marks,passing_marks,exam_date,status)`,
        allExamRows);

      console.log(`[SEED] 19 – Exam results (${allExamResultRows.length.toLocaleString()} rows)…`);
      await bulkInsert(client,
        `INSERT INTO exam_results (id,institute_id,exam_id,student_id,marks_obtained,grade)`,
        allExamResultRows, 500);

      console.log('[SEED] 20 – Fee structures…');
      await bulkInsert(client,
        `INSERT INTO fee_structures (id,institute_id,academic_year_id,class_id,name,amount,fee_type,frequency)`,
        allFeeStructureRows);

      console.log(`[SEED] 21 – Fee payments (${allFeePaymentRows.length.toLocaleString()} rows)…`);
      await bulkInsert(client,
        `INSERT INTO fee_payments (id,institute_id,student_id,fee_structure_id,academic_year_id,amount,paid_amount,due_date,paid_date,payment_method,receipt_number,status)`,
        allFeePaymentRows, 500);

      console.log('[SEED] 22 – Notices…');
      await bulkInsert(client,
        `INSERT INTO notices (id,institute_id,title,content,priority,target_roles,is_published,created_by)`,
        allNoticeRows);

      console.log(`[SEED] 23 – Assignments (${allAssignmentRows.length})…`);
      await bulkInsert(client,
        `INSERT INTO assignments (id,institute_id,class_id,subject_id,teacher_id,academic_year_id,title,description,instructions,due_date,total_marks,attachment_url,status,allow_late_submission)`,
        allAssignmentRows);

      console.log(`[SEED] 24 – Assignment submissions (${allAssignmentSubmissionRows.length.toLocaleString()})…`);
      await bulkInsert(client,
        `INSERT INTO assignment_submissions (id,assignment_id,student_id,submission_text,file_url,submitted_at,is_late,marks_obtained,teacher_remarks,graded_by,graded_at)`,
        allAssignmentSubmissionRows, 500);

      console.log(`[SEED] 25 – Teacher remarks (${allTeacherRemarkRows.length})…`);
      await bulkInsert(client,
        `INSERT INTO teacher_remarks (id,institute_id,student_id,teacher_id,subject_id,remark_type,content,is_visible_to_parent,academic_year_id)`,
        allTeacherRemarkRows);

      console.log('[SEED] 26 – Holidays…');
      await bulkInsert(client,
        `INSERT INTO holidays (id,institute_id,date,name,description,holiday_type,created_by)`,
        allHolidayRows);

      console.log('[SEED] 27 – Notifications…');
      await bulkInsert(client,
        `INSERT INTO notifications (id,institute_id,user_id,title,message,type,is_read,link)`,
        allNotificationRows);

      console.log('[SEED] 28 – Audit logs…');
      await bulkInsert(client,
        `INSERT INTO audit_logs (id,institute_id,user_id,action,entity_type,entity_id,old_values,new_values,ip_address,user_agent)`,
        allAuditLogRows);

      // ====================================================================
      //  COMMIT
      // ====================================================================
      await client.query('COMMIT');

      console.log('\n[SEED] ══════════════════════════════════════════════════════');
      console.log('[SEED]  Comprehensive Database seeded successfully!');
      console.log('[SEED] ──────────────────────────────────────────────────────');
      console.log(`[SEED]   Institutes:            ${institutes.length}`);
      console.log(`[SEED]   Teachers:              ${summary.teachers}`);
      console.log(`[SEED]   Students:              ${summary.students}`);
      console.log(`[SEED]   Attendance Records:    ${summary.attendance.toLocaleString()}`);
      console.log(`[SEED]   Exams:                 ${summary.exams}`);
      console.log(`[SEED]   Exam Results:          ${summary.examResults.toLocaleString()}`);
      console.log(`[SEED]   Fee Payments:          ${summary.feePayments.toLocaleString()}`);
      console.log(`[SEED]   Assignments:           ${summary.assignments}`);
      console.log(`[SEED]   Submissions:           ${summary.submissions.toLocaleString()}`);
      console.log(`[SEED]   Teacher Remarks:       ${summary.remarks}`);
      console.log(`[SEED]   Holidays:              ${summary.holidays}`);
      console.log(`[SEED]   Notifications:         ${summary.notifications}`);
      console.log(`[SEED]   Audit Logs:            ${summary.audits}`);
      console.log('[SEED] ──────────────────────────────────────────────────────');
      console.log('[SEED] Demo login credentials (password: demo123):');
      console.log('[SEED]   Super Admin  : super@eduyantra.com');
      console.log('[SEED]   Inst. Admin  : admin@springfield.edu       (code: SPRING01)');
      console.log('[SEED]   Class Teacher: priya.sharma@springfield.edu (code: SPRING01)');
      console.log('[SEED]   Subj. Teacher: sunita.verma@springfield.edu (code: SPRING01)');
      console.log('[SEED]   Student      : arjun@springfield.edu       (code: SPRING01)');
      console.log('[SEED]   Parent       : ramesh.sharma@gmail.com     (code: SPRING01)');
      console.log('[SEED] ══════════════════════════════════════════════════════\n');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[SEED] Error seeding database:', error.message);
    throw error;
  }
}

// When run directly as a script (npm run seed), execute and exit
const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').replace(/^.*:/, ''));
if (isDirectRun) {
  seed()
    .then(() => closePool())
    .catch(async (err) => {
      console.error('[SEED] Fatal error:', err);
      await closePool();
      process.exit(1);
    });
}
