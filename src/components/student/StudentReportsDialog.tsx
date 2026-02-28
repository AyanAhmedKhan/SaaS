import { useState, useEffect } from "react";
import {
    FileText,
    Loader2,
    AlertCircle,
    Trophy,
    BookOpen,
    TrendingUp,
    CalendarDays,
    Award,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    exams: ExamResult[];
    attendance: {
        total_days: string;
        present_count: string;
        absent_count: string;
        percentage: string;
    };
    remarks: TeacherRemark[];
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

    const getGradeColor = (marks: number, total: number) => {
        const pct = total > 0 ? (marks / total) * 100 : 0;
        if (pct >= 90) return "text-emerald-600 bg-emerald-500/10";
        if (pct >= 75) return "text-blue-600 bg-blue-500/10";
        if (pct >= 60) return "text-amber-600 bg-amber-500/10";
        if (pct >= 40) return "text-orange-600 bg-orange-500/10";
        return "text-red-600 bg-red-500/10";
    };

    const getExamTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            unit_test: "Unit Test",
            mid_term: "Mid Term",
            final: "Final",
            assignment: "Assignment",
            practical: "Practical",
            other: "Other",
        };
        return labels[type] || type;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-5 text-white">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <FileText className="h-5 w-5" />
                            </div>
                            Report Card — {student.name}
                        </DialogTitle>
                        <DialogDescription className="text-white/80 text-sm">
                            Roll: {student.roll_number}
                            {student.class_name
                                ? ` • ${student.class_name}${student.section ? ` - ${student.section}` : ""}`
                                : ""}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-40 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-muted-foreground text-sm">Loading report card...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center gap-3 px-6">
                        <AlertCircle className="h-8 w-8 text-destructive/60" />
                        <p className="text-muted-foreground text-sm">{error}</p>
                    </div>
                ) : (
                    <ScrollArea className="max-h-[500px]">
                        <div className="space-y-5 p-6">
                            {/* Attendance Overview */}
                            {data?.attendance && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 text-primary" />
                                        Attendance Overview
                                    </h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
                                            <p className="text-xl font-bold text-emerald-600">
                                                {data.attendance.percentage
                                                    ? `${Math.round(Number(data.attendance.percentage))}%`
                                                    : "N/A"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Overall</p>
                                        </div>
                                        <div className="bg-muted/50 rounded-xl p-3 text-center">
                                            <p className="text-xl font-bold text-foreground">
                                                {data.attendance.present_count || 0}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Present</p>
                                        </div>
                                        <div className="bg-red-500/10 rounded-xl p-3 text-center">
                                            <p className="text-xl font-bold text-red-600">
                                                {data.attendance.absent_count || 0}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Absent</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Exam Results */}
                            <div>
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Trophy className="h-4 w-4 text-primary" />
                                    Exam Results ({data?.exams?.length || 0})
                                </h4>
                                {!data?.exams || data.exams.length === 0 ? (
                                    <div className="text-center py-8 bg-muted/30 rounded-xl">
                                        <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">
                                            No exam results available yet.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {data.exams.map((exam) => (
                                            <div
                                                key={exam.id}
                                                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`p-2 rounded-lg ${getGradeColor(exam.marks_obtained, exam.total_marks)}`}
                                                    >
                                                        <TrendingUp className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{exam.exam_name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-muted-foreground">
                                                                {exam.subject_name}
                                                            </span>
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                                {getExamTypeLabel(exam.exam_type)}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold">
                                                        {exam.marks_obtained}/{exam.total_marks}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 justify-end">
                                                        {exam.grade && (
                                                            <Badge
                                                                className={`text-[10px] ${getGradeColor(exam.marks_obtained, exam.total_marks)}`}
                                                            >
                                                                {exam.grade}
                                                            </Badge>
                                                        )}
                                                        {exam.rank && (
                                                            <span className="text-xs text-muted-foreground">
                                                                Rank #{exam.rank}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Teacher Remarks */}
                            {data?.remarks && data.remarks.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <Award className="h-4 w-4 text-primary" />
                                        Teacher Remarks ({data.remarks.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {data.remarks.map((remark) => (
                                            <div
                                                key={remark.id}
                                                className="p-3 rounded-lg border border-border/50 bg-background"
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-sm font-medium">
                                                        {remark.teacher_name}
                                                    </p>
                                                    <Badge variant="outline" className="text-[10px] capitalize">
                                                        {remark.remark_type}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {remark.content}
                                                </p>
                                                {remark.subject_name && (
                                                    <p className="text-xs text-muted-foreground/70 mt-1">
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
