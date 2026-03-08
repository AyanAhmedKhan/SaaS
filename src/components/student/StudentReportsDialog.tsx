import { useState, useEffect, useMemo } from "react";
import {
    FileText,
    Loader2,
    AlertCircle,
    Trophy,
    BookOpen,
    TrendingUp,
    CalendarDays,
    Award,
    GraduationCap,
    Percent,
    CheckCircle2,
    XCircle,
    Printer,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getReportCard } from "@/lib/api";
import type { Student, TeacherRemark } from "@/types";

interface StudentReportsDialogProps {
    student: Student;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface ExamResult {
    id: string;
    exam_name: string;
    exam_type: string;
    subject_name: string;
    marks_obtained: number;
    total_marks: number;
    grade?: string;
    rank?: number;
    exam_date?: string;
}

interface ReportData {
    student: Student;
    examResults: ExamResult[];
    attendance: {
        total: string;
        present: string;
        percentage: string;
    };
    remarks: TeacherRemark[];
}

// ── Helpers ──
function pct(marks: number, total: number) {
    return total > 0 ? (marks / total) * 100 : 0;
}

function getGrade(percent: number): string {
    if (percent >= 91) return "A+";
    if (percent >= 81) return "A";
    if (percent >= 71) return "B+";
    if (percent >= 61) return "B";
    if (percent >= 51) return "C";
    if (percent >= 41) return "D";
    return "F";
}

function getGradeColor(percent: number) {
    if (percent >= 90) return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-200 dark:border-emerald-800";
    if (percent >= 75) return "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-200 dark:border-blue-800";
    if (percent >= 60) return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-200 dark:border-amber-800";
    if (percent >= 40) return "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-200 dark:border-orange-800";
    return "text-red-600 dark:text-red-400 bg-red-500/10 border-red-200 dark:border-red-800";
}

function getExamTypeLabel(type: string) {
    const labels: Record<string, string> = {
        unit_test: "Unit Test",
        mid_term: "Mid Term",
        final: "Final",
        assignment: "Assignment",
        practical: "Practical",
        other: "Other",
    };
    return labels[type] || type;
}

function getRemarkTypeColor(type: string) {
    const colors: Record<string, string> = {
        appreciation: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
        behavioral: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        subject: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        term: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800",
    };
    return colors[type] || "bg-muted text-muted-foreground";
}

// ── Ring Progress Indicator ──
function RingProgress({ value, size = 72, strokeWidth = 6, label, sublabel, colorClass }: {
    value: number; size?: number; strokeWidth?: number; label: string; sublabel: string; colorClass?: string;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(value, 100) / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={radius}
                        stroke="hsl(var(--muted))" strokeWidth={strokeWidth} fill="none" />
                    <circle cx={size / 2} cy={size / 2} r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth} fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className={cn("transition-all duration-700", colorClass || "text-primary")}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold tabular-nums">{label}</span>
                </div>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">{sublabel}</span>
        </div>
    );
}

export function StudentReportsDialog({
    student,
    open,
    onOpenChange,
}: StudentReportsDialogProps) {
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && student) {
            setLoading(true);
            setError(null);
            getReportCard(student.id)
                .then((res) => {
                    if (res.success && res.data) {
                        setData(res.data as unknown as ReportData);
                    }
                })
                .catch((err) => {
                    setError(err?.message || "Failed to load report card");
                })
                .finally(() => setLoading(false));
        }
    }, [open, student]);

    // ── Computed stats ──
    const examStats = useMemo(() => {
        const exams = data?.examResults || [];
        if (exams.length === 0) return null;
        const totalObt = exams.reduce((s, e) => s + Number(e.marks_obtained || 0), 0);
        const totalMax = exams.reduce((s, e) => s + Number(e.total_marks || 0), 0);
        const overallPct = totalMax > 0 ? (totalObt / totalMax) * 100 : 0;
        // Group by subject
        const bySubject = new Map<string, { obtained: number; total: number; count: number }>();
        for (const e of exams) {
            const key = e.subject_name || 'Unknown';
            const cur = bySubject.get(key) || { obtained: 0, total: 0, count: 0 };
            cur.obtained += Number(e.marks_obtained || 0);
            cur.total += Number(e.total_marks || 0);
            cur.count++;
            bySubject.set(key, cur);
        }
        const subjects = Array.from(bySubject.entries()).map(([name, v]) => ({
            name, obtained: v.obtained, total: v.total, count: v.count,
            pct: v.total > 0 ? (v.obtained / v.total) * 100 : 0,
        })).sort((a, b) => b.pct - a.pct);

        return { totalObt, totalMax, overallPct, subjects, count: exams.length };
    }, [data?.examResults]);

    const attPct = Number(data?.attendance?.percentage || 0);
    const attTotal = Number(data?.attendance?.total || 0);
    const attPresent = Number(data?.attendance?.present || 0);
    const attAbsent = attTotal - attPresent;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden gap-0">
                {/* ── Gradient Header ── */}
                <div className="relative bg-gradient-to-br from-primary via-violet-600 to-purple-700 px-6 py-5 text-white overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

                    <DialogHeader className="space-y-1.5 relative z-10">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/15 rounded-xl backdrop-blur-sm">
                                    <GraduationCap className="h-6 w-6" />
                                </div>
                                <div>
                                    <DialogTitle className="text-white text-lg font-bold">
                                        {student.name}
                                    </DialogTitle>
                                    <DialogDescription className="text-white/75 text-sm">
                                        Roll: {student.roll_number}
                                        {student.class_name
                                            ? ` · ${student.class_name}${student.section ? ` - ${student.section}` : ""}`
                                            : ""}
                                    </DialogDescription>
                                </div>
                            </div>
                            <Badge className="bg-white/15 text-white border-white/20 backdrop-blur-sm text-xs">
                                Report Card
                            </Badge>
                        </div>
                    </DialogHeader>

                    {/* ── Quick Stats Strip ── */}
                    {!loading && !error && (
                        <div className="flex items-center gap-4 mt-4 relative z-10">
                            <div className="flex items-center gap-1.5 text-sm">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                                <span className="text-white/80 text-xs">Attendance:</span>
                                <span className="font-semibold text-xs">{attPct ? `${Math.round(attPct)}%` : "N/A"}</span>
                            </div>
                            {examStats && (
                                <>
                                    <div className="w-px h-3.5 bg-white/20" />
                                    <div className="flex items-center gap-1.5 text-sm">
                                        <Trophy className="h-3.5 w-3.5 text-amber-300" />
                                        <span className="text-white/80 text-xs">Overall:</span>
                                        <span className="font-semibold text-xs">{Math.round(examStats.overallPct)}%</span>
                                    </div>
                                    <div className="w-px h-3.5 bg-white/20" />
                                    <div className="flex items-center gap-1.5 text-sm">
                                        <BookOpen className="h-3.5 w-3.5 text-blue-300" />
                                        <span className="text-white/80 text-xs">Exams:</span>
                                        <span className="font-semibold text-xs">{examStats.count}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Body ── */}
                {loading ? (
                    <div className="flex items-center justify-center h-48 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-muted-foreground text-sm">Loading report card...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center gap-3 px-6">
                        <AlertCircle className="h-8 w-8 text-destructive/60" />
                        <p className="text-muted-foreground text-sm">{error}</p>
                    </div>
                ) : (
                    <ScrollArea className="max-h-[480px]">
                        <div className="space-y-5 p-6">

                            {/* ── Attendance Ring Cards ── */}
                            {data?.attendance && attTotal > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 text-primary" />
                                        Attendance Overview
                                    </h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="flex flex-col items-center p-4 rounded-xl border border-border/50 bg-card">
                                            <RingProgress
                                                value={attPct}
                                                label={`${Math.round(attPct)}%`}
                                                sublabel="Overall"
                                                colorClass={attPct >= 75 ? "text-emerald-500" : attPct >= 50 ? "text-amber-500" : "text-red-500"}
                                            />
                                        </div>
                                        <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-500/5">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-1" />
                                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{attPresent}</p>
                                            <p className="text-xs text-muted-foreground">Days Present</p>
                                        </div>
                                        <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-500/5">
                                            <XCircle className="h-5 w-5 text-red-500 mb-1" />
                                            <p className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">{attAbsent}</p>
                                            <p className="text-xs text-muted-foreground">Days Absent</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Subject-wise Summary Table ── */}
                            {examStats && examStats.subjects.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <Trophy className="h-4 w-4 text-primary" />
                                        Subject-wise Performance
                                    </h4>
                                    <div className="rounded-xl border border-border/50 overflow-hidden">
                                        {/* Table Header */}
                                        <div className="grid grid-cols-[1fr_80px_60px_60px_60px] px-4 py-2.5 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                                            <span>Subject</span>
                                            <span className="text-center">Marks</span>
                                            <span className="text-center">%</span>
                                            <span className="text-center">Grade</span>
                                            <span className="text-center">Exams</span>
                                        </div>
                                        {/* Table Rows */}
                                        {examStats.subjects.map((sub, i) => {
                                            const p = sub.pct;
                                            const grade = getGrade(p);
                                            return (
                                                <div
                                                    key={sub.name}
                                                    className={cn(
                                                        "grid grid-cols-[1fr_80px_60px_60px_60px] px-4 py-3 items-center transition-colors hover:bg-muted/30",
                                                        i < examStats.subjects.length - 1 && "border-b border-border/30"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={cn("w-1.5 h-8 rounded-full", p >= 75 ? "bg-emerald-500" : p >= 50 ? "bg-amber-500" : "bg-red-500")} />
                                                        <span className="text-sm font-medium truncate">{sub.name}</span>
                                                    </div>
                                                    <span className="text-sm text-center tabular-nums font-medium">
                                                        {sub.obtained}/{sub.total}
                                                    </span>
                                                    <span className={cn("text-sm text-center tabular-nums font-semibold", p >= 75 ? "text-emerald-600 dark:text-emerald-400" : p >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>
                                                        {Math.round(p)}%
                                                    </span>
                                                    <div className="flex justify-center">
                                                        <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 font-bold", getGradeColor(p))}>
                                                            {grade}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-xs text-center text-muted-foreground tabular-nums">{sub.count}</span>
                                                </div>
                                            );
                                        })}
                                        {/* Total Row */}
                                        <div className="grid grid-cols-[1fr_80px_60px_60px_60px] px-4 py-3 items-center bg-muted/40 border-t border-border/50">
                                            <span className="text-sm font-bold">Overall Total</span>
                                            <span className="text-sm text-center tabular-nums font-bold">
                                                {examStats.totalObt}/{examStats.totalMax}
                                            </span>
                                            <span className={cn("text-sm text-center tabular-nums font-bold", getGradeColor(examStats.overallPct).split(" ")[0])}>
                                                {Math.round(examStats.overallPct)}%
                                            </span>
                                            <div className="flex justify-center">
                                                <Badge className={cn("text-[10px] px-2 py-0.5 font-bold", getGradeColor(examStats.overallPct))}>
                                                    {getGrade(examStats.overallPct)}
                                                </Badge>
                                            </div>
                                            <span className="text-xs text-center text-muted-foreground tabular-nums">{examStats.count}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Detailed Exam Results ── */}
                            <div>
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-primary" />
                                    Exam Results ({data?.examResults?.length || 0})
                                </h4>
                                {!data?.examResults || data.examResults.length === 0 ? (
                                    <div className="text-center py-10 rounded-xl border border-dashed border-border/60 bg-muted/20">
                                        <BookOpen className="h-10 w-10 text-muted-foreground/25 mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">No exam results available yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {data.examResults.map((exam) => {
                                            const p = pct(exam.marks_obtained, exam.total_marks);
                                            return (
                                                <div
                                                    key={exam.id}
                                                    className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-card hover:bg-muted/20 transition-colors group"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={cn("p-2 rounded-lg shrink-0", getGradeColor(p))}>
                                                            <TrendingUp className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold truncate">{exam.exam_name}</p>
                                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                <span className="text-xs text-muted-foreground">{exam.subject_name}</span>
                                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                                    {getExamTypeLabel(exam.exam_type)}
                                                                </Badge>
                                                                {exam.exam_date && (
                                                                    <span className="text-[10px] text-muted-foreground/60">
                                                                        {new Date(exam.exam_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-3">
                                                        <p className="text-sm font-bold tabular-nums">
                                                            {exam.marks_obtained}<span className="text-muted-foreground font-normal">/{exam.total_marks}</span>
                                                        </p>
                                                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                                                            <Badge variant="outline" className={cn("text-[10px] font-bold", getGradeColor(p))}>
                                                                {exam.grade || getGrade(p)}
                                                            </Badge>
                                                            {exam.rank && (
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    #{exam.rank}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* ── Teacher Remarks ── */}
                            {data?.remarks && data.remarks.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <Award className="h-4 w-4 text-primary" />
                                        Teacher Remarks
                                    </h4>
                                    <div className="space-y-2">
                                        {data.remarks.map((remark) => (
                                            <div
                                                key={remark.id}
                                                className="p-3.5 rounded-xl border border-border/40 bg-card"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                            {remark.teacher_name?.charAt(0) || 'T'}
                                                        </div>
                                                        <span className="text-sm font-semibold">{remark.teacher_name}</span>
                                                    </div>
                                                    <Badge variant="outline" className={cn("text-[10px] capitalize", getRemarkTypeColor(remark.remark_type))}>
                                                        {remark.remark_type}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground leading-relaxed pl-9">
                                                    {remark.content}
                                                </p>
                                                {remark.subject_name && (
                                                    <p className="text-[11px] text-muted-foreground/60 mt-1.5 pl-9">
                                                        Subject: {remark.subject_name}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </DialogContent>
        </Dialog>
    );
}
