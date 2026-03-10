/* ═══════════════════════════════════════════════════════════════════════════════
 *  Professional PDF Report Generator — EduYantra
 *  Client-side PDF generation using jsPDF + jspdf-autotable
 *  Role-based: Student, Faculty, Institute Admin, Super Admin
 *  Parents are excluded from report generation.
 * ═══════════════════════════════════════════════════════════════════════════════ */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ── Types ── */
export interface ReportStudentData {
    name?: string;
    roll_number?: string;
    class_name?: string;
    section?: string;
}

export interface ExamResultRow {
    exam_name?: string;
    subject_name?: string;
    student_name?: string;
    marks_obtained?: number;
    max_marks?: number;
    grade?: string;
    exam_type?: string;
    exam_date?: string;
    class_name?: string;
    roll_number?: string;
    section?: string;
}

export interface ClassSummaryRow {
    class_name: string;
    section?: string;
    student_count: number;
    avg_attendance: number | null;
    avg_performance: number | null;
}

export interface TrendRow {
    exam: string;
    average: number;
    [key: string]: string | number;
}

export interface AttendanceData {
    total: string;
    present: string;
    percentage: string;
}

export interface ReportCardData {
    student: ReportStudentData;
    examResults: ExamResultRow[];
    attendance: AttendanceData;
    remarks: { remark_text?: string; teacher_name?: string; created_at?: string }[];
}

/* ── Color palette ── */
const COLORS = {
    primary: [79, 70, 229] as [number, number, number],     // Indigo-600
    primaryLight: [238, 242, 255] as [number, number, number],
    dark: [15, 23, 42] as [number, number, number],          // Slate-900
    muted: [100, 116, 139] as [number, number, number],      // Slate-500
    white: [255, 255, 255] as [number, number, number],
    gradeA: [16, 185, 129] as [number, number, number],      // Emerald
    gradeB: [59, 130, 246] as [number, number, number],      // Blue
    gradeC: [245, 158, 11] as [number, number, number],      // Amber
    gradeD: [239, 68, 68] as [number, number, number],       // Rose
    tableHeader: [51, 65, 85] as [number, number, number],   // Slate-700
    tableStripe: [248, 250, 252] as [number, number, number],// Slate-50
    border: [226, 232, 240] as [number, number, number],     // Slate-200
    accent: [139, 92, 246] as [number, number, number],      // Violet
};

function getGradeRGB(grade?: string): [number, number, number] {
    if (!grade) return COLORS.muted;
    if (grade.startsWith('A')) return COLORS.gradeA;
    if (grade.startsWith('B')) return COLORS.gradeB;
    if (grade.startsWith('C')) return COLORS.gradeC;
    return COLORS.gradeD;
}

/* ── Shared helpers ── */

function addHeader(doc: jsPDF, title: string, subtitle: string, instituteName?: string) {
    const pageW = doc.internal.pageSize.getWidth();

    // Gradient-style header bar
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageW, 38, 'F');

    // Accent stripe
    doc.setFillColor(...COLORS.accent);
    doc.rect(0, 38, pageW, 2, 'F');

    // Institute name
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(instituteName || 'EduYantra', 14, 12);

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 26);

    // Subtitle
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 34);

    // Date on right
    doc.setFontSize(9);
    const dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
    doc.text(`Generated: ${dateStr}`, pageW - 14, 12, { align: 'right' });

    // "CONFIDENTIAL" watermark
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255, 0.5);
    doc.text('CONFIDENTIAL', pageW - 14, 34, { align: 'right' });

    doc.setTextColor(...COLORS.dark);
    return 48; // Y position after header
}

function addFooter(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();

        // Footer line
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.5);
        doc.line(14, pageH - 16, pageW - 14, pageH - 16);

        // Footer text
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.muted);
        doc.setFont('helvetica', 'normal');
        doc.text('EduYantra — India\'s Smartest School Operations Platform', 14, pageH - 10);
        doc.text(`Page ${i} of ${pageCount}`, pageW - 14, pageH - 10, { align: 'right' });
        const ts = new Date().toLocaleString('en-IN');
        doc.text(ts, pageW / 2, pageH - 10, { align: 'center' });
    }
}

function addSectionTitle(doc: jsPDF, y: number, title: string, icon?: string): number {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(`${icon ? icon + '  ' : ''}${title}`, 14, y);

    // Underline
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.8);
    doc.line(14, y + 2, 90, y + 2);

    doc.setTextColor(...COLORS.dark);
    return y + 10;
}

function addInfoBox(doc: jsPDF, y: number, items: { label: string; value: string }[]): number {
    const pageW = doc.internal.pageSize.getWidth();
    const boxW = pageW - 28;
    const colW = boxW / items.length;

    // Box background
    doc.setFillColor(...COLORS.primaryLight);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(14, y, boxW, 24, 3, 3, 'FD');

    items.forEach((item, idx) => {
        const x = 14 + colW * idx + colW / 2;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.muted);
        doc.text(item.label, x, y + 9, { align: 'center' });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.dark);
        doc.text(item.value, x, y + 19, { align: 'center' });
    });

    return y + 32;
}

function triggerDownload(doc: jsPDF, filename: string) {
    doc.save(filename);
}

/* ═══════════════════════════════════════════════════════════════════════════════
 *  1. PROGRESS REPORT PDF
 * ═══════════════════════════════════════════════════════════════════════════════ */

export function generateProgressReportPDF(opts: {
    role: string;
    results: ExamResultRow[];
    trend: TrendRow[];
    classSummary?: ClassSummaryRow[];
    studentData?: ReportStudentData;
    instituteName?: string;
}) {
    const { role, results, trend, classSummary, studentData, instituteName } = opts;
    const doc = new jsPDF('p', 'mm', 'a4');
    const isStudent = role === 'student';
    const isFaculty = role === 'faculty';

    const title = isStudent
        ? 'Student Progress Report'
        : isFaculty
            ? 'Class Progress Report'
            : 'Institute Progress Report';

    const subtitle = isStudent
        ? `${studentData?.name || 'Student'} — ${studentData?.class_name || ''} ${studentData?.section || ''}`
        : isFaculty
            ? 'Performance summary for your assigned classes'
            : 'Comprehensive institute-wide performance overview';

    let y = addHeader(doc, title, subtitle, instituteName);

    // ── Student info box ──
    if (isStudent && studentData) {
        y = addInfoBox(doc, y, [
            { label: 'STUDENT NAME', value: studentData.name || '—' },
            { label: 'CLASS', value: `${studentData.class_name || ''} ${studentData.section || ''}`.trim() || '—' },
            { label: 'ROLL NO.', value: studentData.roll_number || '—' },
            { label: 'EXAMS TAKEN', value: String(results.length) },
        ]);
    }

    // ── Class summary for staff ──
    if (!isStudent && classSummary && classSummary.length > 0) {
        y = addSectionTitle(doc, y, 'Class Overview');
        autoTable(doc, {
            startY: y,
            head: [['Class', 'Section', 'Students', 'Avg Attendance', 'Avg Performance']],
            body: classSummary.map(c => [
                c.class_name,
                c.section || '—',
                String(c.student_count),
                c.avg_attendance != null ? `${Number(c.avg_attendance).toFixed(1)}%` : '—',
                c.avg_performance != null ? `${Number(c.avg_performance).toFixed(1)}%` : '—',
            ]),
            styles: { fontSize: 9, cellPadding: 3, lineColor: COLORS.border, lineWidth: 0.3 },
            headStyles: { fillColor: COLORS.tableHeader, textColor: COLORS.white, fontStyle: 'bold', fontSize: 9 },
            alternateRowStyles: { fillColor: COLORS.tableStripe },
            margin: { left: 14, right: 14 },
        });
        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }

    // ── Performance Trend ──
    if (trend.length > 0) {
        y = addSectionTitle(doc, y, 'Performance Trend');
        const subjects = Object.keys(trend[0]).filter(k => k !== 'exam' && k !== 'average');

        autoTable(doc, {
            startY: y,
            head: [['Exam', ...subjects, 'Average']],
            body: trend.map(t => [
                t.exam,
                ...subjects.map(s => `${Number(t[s] || 0).toFixed(1)}%`),
                `${Number(t.average).toFixed(1)}%`,
            ]),
            styles: { fontSize: 9, cellPadding: 3, lineColor: COLORS.border, lineWidth: 0.3 },
            headStyles: { fillColor: COLORS.tableHeader, textColor: COLORS.white, fontStyle: 'bold', fontSize: 9 },
            alternateRowStyles: { fillColor: COLORS.tableStripe },
            margin: { left: 14, right: 14 },
            columnStyles: {
                [subjects.length + 1]: { fontStyle: 'bold', textColor: COLORS.primary },
            },
        });
        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }

    // ── Detailed Results ──
    if (results.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }
        y = addSectionTitle(doc, y, 'Detailed Results');

        const headers = isStudent
            ? [['Exam', 'Subject', 'Score', 'Grade', 'Date']]
            : [['Student', 'Exam', 'Subject', 'Score', 'Grade', 'Class']];

        const body = results.slice(0, 80).map(r => {
            const score = `${r.marks_obtained ?? 0} / ${r.max_marks ?? 100}`;
            const date = r.exam_date ? new Date(r.exam_date).toLocaleDateString('en-IN') : '—';
            return isStudent
                ? [r.exam_name || '—', r.subject_name || '—', score, r.grade || '—', date]
                : [r.student_name || '—', r.exam_name || '—', r.subject_name || '—', score, r.grade || '—', r.class_name || '—'];
        });

        autoTable(doc, {
            startY: y,
            head: headers,
            body,
            styles: { fontSize: 8, cellPadding: 2.5, lineColor: COLORS.border, lineWidth: 0.3 },
            headStyles: { fillColor: COLORS.tableHeader, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8 },
            alternateRowStyles: { fillColor: COLORS.tableStripe },
            margin: { left: 14, right: 14 },
            didParseCell: (data) => {
                // Color-code grade column
                const gradeColIdx = isStudent ? 3 : 4;
                if (data.section === 'body' && data.column.index === gradeColIdx) {
                    data.cell.styles.textColor = getGradeRGB(String(data.cell.raw));
                    data.cell.styles.fontStyle = 'bold';
                }
            },
        });
    }

    addFooter(doc);
    triggerDownload(doc, `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`);
}

/* ═══════════════════════════════════════════════════════════════════════════════
 *  2. EXAM REPORT CARD PDF
 * ═══════════════════════════════════════════════════════════════════════════════ */

export function generateExamReportPDF(opts: {
    role: string;
    results: ExamResultRow[];
    studentData?: ReportStudentData;
    instituteName?: string;
}) {
    const { role, results, studentData, instituteName } = opts;
    const doc = new jsPDF('p', 'mm', 'a4');
    const isStudent = role === 'student';

    const title = isStudent ? 'Exam Report Card' : 'Examination Results Sheet';
    const subtitle = isStudent
        ? `${studentData?.name || 'Student'} — ${studentData?.class_name || ''} ${studentData?.section || ''}`
        : 'Detailed exam-wise performance for all students';

    let y = addHeader(doc, title, subtitle, instituteName);

    // ── Summary box ──
    if (results.length > 0) {
        const totalMarks = results.reduce((s, r) => s + (r.marks_obtained || 0), 0);
        const totalMax = results.reduce((s, r) => s + (r.max_marks || 100), 0);
        const avgPct = totalMax > 0 ? (totalMarks / totalMax * 100) : 0;
        const grades = results.map(r => r.grade || '').filter(Boolean).sort();
        const topGrade = grades[0] || 'N/A';

        y = addInfoBox(doc, y, [
            { label: 'TOTAL EXAMS', value: String(results.length) },
            { label: 'AVERAGE SCORE', value: `${avgPct.toFixed(1)}%` },
            { label: 'TOP GRADE', value: topGrade },
            { label: 'TOTAL MARKS', value: `${totalMarks} / ${totalMax}` },
        ]);
    }

    // ── Group by exam ──
    const examGroups: Record<string, ExamResultRow[]> = {};
    results.forEach(r => {
        const key = r.exam_name || 'Unknown Exam';
        if (!examGroups[key]) examGroups[key] = [];
        examGroups[key].push(r);
    });

    for (const [examName, rows] of Object.entries(examGroups)) {
        if (y > 240) { doc.addPage(); y = 20; }
        y = addSectionTitle(doc, y, examName);

        const examDate = rows[0]?.exam_date
            ? new Date(rows[0].exam_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '';
        if (examDate) {
            doc.setFontSize(8);
            doc.setTextColor(...COLORS.muted);
            doc.text(`Date: ${examDate}  |  Type: ${rows[0]?.exam_type || '—'}`, 14, y);
            y += 6;
        }

        const headers = isStudent
            ? [['Subject', 'Marks Obtained', 'Max Marks', 'Percentage', 'Grade']]
            : [['Student', 'Roll No.', 'Subject', 'Marks', 'Max', '%', 'Grade']];

        const body = rows.map(r => {
            const pct = (r.max_marks && r.max_marks > 0) ? ((r.marks_obtained || 0) / r.max_marks * 100).toFixed(1) + '%' : '—';
            return isStudent
                ? [r.subject_name || '—', String(r.marks_obtained ?? 0), String(r.max_marks ?? 100), pct, r.grade || '—']
                : [r.student_name || '—', r.roll_number || '—', r.subject_name || '—', String(r.marks_obtained ?? 0), String(r.max_marks ?? 100), pct, r.grade || '—'];
        });

        autoTable(doc, {
            startY: y,
            head: headers,
            body,
            styles: { fontSize: 8, cellPadding: 2.5, lineColor: COLORS.border, lineWidth: 0.3 },
            headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8 },
            alternateRowStyles: { fillColor: COLORS.tableStripe },
            margin: { left: 14, right: 14 },
            didParseCell: (data) => {
                const gradeIdx = isStudent ? 4 : 6;
                if (data.section === 'body' && data.column.index === gradeIdx) {
                    data.cell.styles.textColor = getGradeRGB(String(data.cell.raw));
                    data.cell.styles.fontStyle = 'bold';
                }
            },
        });
        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }

    addFooter(doc);
    triggerDownload(doc, `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`);
}

/* ═══════════════════════════════════════════════════════════════════════════════
 *  3. SUBJECT PERFORMANCE PDF
 * ═══════════════════════════════════════════════════════════════════════════════ */

export function generateSubjectReportPDF(opts: {
    role: string;
    trend: TrendRow[];
    results: ExamResultRow[];
    instituteName?: string;
    studentData?: ReportStudentData;
}) {
    const { role, trend, results, instituteName, studentData } = opts;
    const doc = new jsPDF('p', 'mm', 'a4');
    const isStudent = role === 'student';

    const title = isStudent ? 'Subject Performance Analysis' : 'Subject-wise Performance Report';
    const subtitle = isStudent
        ? `${studentData?.name || 'Student'} — Detailed subject breakdown`
        : 'Cross-subject performance analysis for all classes';

    let y = addHeader(doc, title, subtitle, instituteName);

    // ── Subject averages from trend ──
    if (trend.length > 0) {
        const subjects = Object.keys(trend[0]).filter(k => k !== 'exam' && k !== 'average');
        const lastTrend = trend[trend.length - 1];

        // Summary box: top and weakest subjects
        const subjectScores = subjects.map(s => ({ name: s, score: Number(lastTrend[s]) || 0 })).sort((a, b) => b.score - a.score);
        const best = subjectScores[0];
        const weakest = subjectScores[subjectScores.length - 1];

        y = addInfoBox(doc, y, [
            { label: 'SUBJECTS', value: String(subjects.length) },
            { label: 'OVERALL AVG', value: `${Number(lastTrend.average).toFixed(1)}%` },
            { label: 'STRONGEST', value: best?.name || '—' },
            { label: 'NEEDS WORK', value: weakest?.name || '—' },
        ]);

        // Subject scores table
        y = addSectionTitle(doc, y, 'Subject Scores (Latest Exam)');
        autoTable(doc, {
            startY: y,
            head: [['Subject', 'Score (%)', 'Status']],
            body: subjectScores.map(s => [
                s.name,
                `${s.score.toFixed(1)}%`,
                s.score >= 75 ? 'Excellent' : s.score >= 50 ? 'Good' : s.score >= 35 ? 'Needs Improvement' : 'Critical',
            ]),
            styles: { fontSize: 9, cellPadding: 3, lineColor: COLORS.border, lineWidth: 0.3 },
            headStyles: { fillColor: COLORS.tableHeader, textColor: COLORS.white, fontStyle: 'bold', fontSize: 9 },
            alternateRowStyles: { fillColor: COLORS.tableStripe },
            margin: { left: 14, right: 14 },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 2) {
                    const val = String(data.cell.raw);
                    if (val === 'Excellent') data.cell.styles.textColor = COLORS.gradeA;
                    else if (val === 'Good') data.cell.styles.textColor = COLORS.gradeB;
                    else if (val === 'Needs Improvement') data.cell.styles.textColor = COLORS.gradeC;
                    else data.cell.styles.textColor = COLORS.gradeD;
                    data.cell.styles.fontStyle = 'bold';
                }
            },
        });
        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

        // Trend across exams
        if (trend.length > 1) {
            if (y > 220) { doc.addPage(); y = 20; }
            y = addSectionTitle(doc, y, 'Progression Across Exams');
            autoTable(doc, {
                startY: y,
                head: [['Exam', ...subjects, 'Average']],
                body: trend.map(t => [
                    t.exam,
                    ...subjects.map(s => `${Number(t[s] || 0).toFixed(1)}%`),
                    `${Number(t.average).toFixed(1)}%`,
                ]),
                styles: { fontSize: 8, cellPadding: 2.5, lineColor: COLORS.border, lineWidth: 0.3 },
                headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8 },
                alternateRowStyles: { fillColor: COLORS.tableStripe },
                margin: { left: 14, right: 14 },
            });
            y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
        }
    }

    // ── Per-subject results ──
    if (results.length > 0 && !isStudent) {
        if (y > 200) { doc.addPage(); y = 20; }
        y = addSectionTitle(doc, y, 'Student-wise Subject Scores');

        const subjectGroups: Record<string, ExamResultRow[]> = {};
        results.forEach(r => {
            const key = r.subject_name || 'Unknown';
            if (!subjectGroups[key]) subjectGroups[key] = [];
            subjectGroups[key].push(r);
        });

        for (const [subName, rows] of Object.entries(subjectGroups)) {
            if (y > 240) { doc.addPage(); y = 20; }

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COLORS.accent);
            doc.text(subName, 14, y);
            y += 6;

            autoTable(doc, {
                startY: y,
                head: [['Student', 'Exam', 'Marks', 'Grade']],
                body: rows.slice(0, 40).map(r => [
                    r.student_name || '—',
                    r.exam_name || '—',
                    `${r.marks_obtained ?? 0} / ${r.max_marks ?? 100}`,
                    r.grade || '—',
                ]),
                styles: { fontSize: 8, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.3 },
                headStyles: { fillColor: COLORS.accent, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8 },
                alternateRowStyles: { fillColor: COLORS.tableStripe },
                margin: { left: 14, right: 14 },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 3) {
                        data.cell.styles.textColor = getGradeRGB(String(data.cell.raw));
                        data.cell.styles.fontStyle = 'bold';
                    }
                },
            });
            y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        }
    }

    addFooter(doc);
    triggerDownload(doc, `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`);
}

/* ═══════════════════════════════════════════════════════════════════════════════
 *  4. FEE SUMMARY PDF (Admin only)
 * ═══════════════════════════════════════════════════════════════════════════════ */

export interface FeeSummaryRow {
    fee_type: string;
    class_name: string;
    total_students: number;
    fee_amount: number;
    total_collected: number;
    total_pending: number;
}

export function generateFeeSummaryPDF(opts: {
    feeSummary: FeeSummaryRow[];
    instituteName?: string;
}) {
    const { feeSummary, instituteName } = opts;
    const doc = new jsPDF('p', 'mm', 'a4');

    let y = addHeader(doc, 'Fee Summary Report', 'Institute-wide fee collection overview', instituteName);

    // ── Summary stats ──
    const totalCollected = feeSummary.reduce((s, r) => s + Number(r.total_collected || 0), 0);
    const totalPending = feeSummary.reduce((s, r) => s + Number(r.total_pending || 0), 0);
    const totalStudents = feeSummary.reduce((s, r) => s + Number(r.total_students || 0), 0);

    y = addInfoBox(doc, y, [
        { label: 'TOTAL COLLECTED', value: `₹${totalCollected.toLocaleString('en-IN')}` },
        { label: 'TOTAL PENDING', value: `₹${totalPending.toLocaleString('en-IN')}` },
        { label: 'COLLECTION RATE', value: totalCollected + totalPending > 0 ? `${((totalCollected / (totalCollected + totalPending)) * 100).toFixed(1)}%` : '—' },
        { label: 'STUDENTS', value: String(totalStudents) },
    ]);

    // ── Fee breakdown table ──
    y = addSectionTitle(doc, y, 'Fee Breakdown');
    autoTable(doc, {
        startY: y,
        head: [['Fee Type', 'Class', 'Students', 'Fee Amount (₹)', 'Collected (₹)', 'Pending (₹)']],
        body: feeSummary.map(r => [
            r.fee_type,
            r.class_name || 'All',
            String(r.total_students),
            Number(r.fee_amount).toLocaleString('en-IN'),
            Number(r.total_collected).toLocaleString('en-IN'),
            Number(r.total_pending).toLocaleString('en-IN'),
        ]),
        styles: { fontSize: 9, cellPadding: 3, lineColor: COLORS.border, lineWidth: 0.3 },
        headStyles: { fillColor: COLORS.tableHeader, textColor: COLORS.white, fontStyle: 'bold', fontSize: 9 },
        alternateRowStyles: { fillColor: COLORS.tableStripe },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 5) {
                const val = Number(String(data.cell.raw).replace(/,/g, '')) || 0;
                if (val > 0) {
                    data.cell.styles.textColor = COLORS.gradeD;
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        },
    });

    addFooter(doc);
    triggerDownload(doc, `fee-summary-report-${Date.now()}.pdf`);
}
