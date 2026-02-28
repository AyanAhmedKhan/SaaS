import { useState, useEffect } from "react";
import {
    CalendarDays,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    BarChart3,
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
import { getAttendance } from "@/lib/api";
import type { Student } from "@/types";

interface StudentAttendanceDialogProps {
    student: Student;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface AttendanceRecord {
    id: string;
    date: string;
    status: "present" | "absent" | "late" | "excused";
    remarks?: string;
    subject_name?: string;
}

interface AttendanceSummary {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
}

export function StudentAttendanceDialog({
    student,
    open,
    onOpenChange,
}: StudentAttendanceDialogProps) {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && student) {
            setLoading(true);
            setError(null);
            getAttendance({ student_id: student.id, limit: "200" })
                .then((res) => {
                    if (res.success && res.data) {
                        setRecords(
                            (res.data as { records: AttendanceRecord[] }).records || []
                        );
                    }
                })
                .catch((err) => {
                    setError(err?.message || "Failed to load attendance");
                })
                .finally(() => setLoading(false));
        }
    }, [open, student]);

    const summary: AttendanceSummary = records.reduce(
        (acc, r) => {
            acc.total++;
            if (r.status === "present") acc.present++;
            else if (r.status === "absent") acc.absent++;
            else if (r.status === "late") acc.late++;
            else if (r.status === "excused") acc.excused++;
            return acc;
        },
        { total: 0, present: 0, absent: 0, late: 0, excused: 0, percentage: 0 }
    );
    summary.percentage =
        summary.total > 0
            ? Math.round((summary.present / summary.total) * 100)
            : 0;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "present":
                return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case "absent":
                return <XCircle className="h-4 w-4 text-red-500" />;
            case "late":
                return <Clock className="h-4 w-4 text-amber-500" />;
            case "excused":
                return <AlertCircle className="h-4 w-4 text-blue-500" />;
            default:
                return null;
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            present: "bg-emerald-500/10 text-emerald-600",
            absent: "bg-red-500/10 text-red-600",
            late: "bg-amber-500/10 text-amber-600",
            excused: "bg-blue-500/10 text-blue-600",
        };
        return (
            <Badge className={`capitalize text-xs ${styles[status] || ""}`}>
                {status}
            </Badge>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 text-white">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <CalendarDays className="h-5 w-5" />
                            </div>
                            Attendance — {student.name}
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
                        <p className="text-muted-foreground text-sm">Loading attendance...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center gap-3 px-6">
                        <AlertCircle className="h-8 w-8 text-destructive/60" />
                        <p className="text-muted-foreground text-sm">{error}</p>
                    </div>
                ) : (
                    <div className="space-y-4 p-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
                                <p className="text-2xl font-bold text-emerald-600">
                                    {summary.percentage}%
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Attendance
                                </p>
                            </div>
                            <div className="bg-muted/50 rounded-xl p-3 text-center">
                                <p className="text-2xl font-bold text-foreground">
                                    {summary.present}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">Present</p>
                            </div>
                            <div className="bg-red-500/10 rounded-xl p-3 text-center">
                                <p className="text-2xl font-bold text-red-600">
                                    {summary.absent}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">Absent</p>
                            </div>
                            <div className="bg-amber-500/10 rounded-xl p-3 text-center">
                                <p className="text-2xl font-bold text-amber-600">
                                    {summary.late}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">Late</p>
                            </div>
                        </div>

                        {/* Records List */}
                        <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-primary" />
                                Recent Records ({records.length})
                            </h4>
                            {records.length === 0 ? (
                                <div className="text-center py-8">
                                    <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        No attendance records found.
                                    </p>
                                </div>
                            ) : (
                                <ScrollArea className="max-h-[250px]">
                                    <div className="space-y-2">
                                        {records.map((record) => (
                                            <div
                                                key={record.id}
                                                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {getStatusIcon(record.status)}
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {new Date(record.date).toLocaleDateString(
                                                                "en-IN",
                                                                {
                                                                    weekday: "short",
                                                                    day: "numeric",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                }
                                                            )}
                                                        </p>
                                                        {record.subject_name && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {record.subject_name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {record.remarks && (
                                                        <span className="text-xs text-muted-foreground max-w-[120px] truncate">
                                                            {record.remarks}
                                                        </span>
                                                    )}
                                                    {getStatusBadge(record.status)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
