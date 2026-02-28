import { useState, useEffect } from "react";
import {
    CalendarDays,
    Loader2,
    AlertCircle,
    Clock,
    BookOpen,
    MapPin,
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
import { cn } from "@/lib/utils";
import { getTimetable } from "@/lib/api";
import type { Teacher, TimetableEntry } from "@/types";

interface TeacherScheduleDialogProps {
    teacher: Teacher;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PERIOD_COLORS = [
    "from-blue-500/10 to-blue-600/10 border-blue-500/20",
    "from-violet-500/10 to-purple-500/10 border-violet-500/20",
    "from-emerald-500/10 to-green-500/10 border-emerald-500/20",
    "from-amber-500/10 to-orange-500/10 border-amber-500/20",
    "from-rose-500/10 to-pink-500/10 border-rose-500/20",
    "from-cyan-500/10 to-sky-500/10 border-cyan-500/20",
    "from-indigo-500/10 to-blue-500/10 border-indigo-500/20",
    "from-teal-500/10 to-emerald-500/10 border-teal-500/20",
];

const PERIOD_TEXT_COLORS = [
    "text-blue-700 dark:text-blue-400",
    "text-violet-700 dark:text-violet-400",
    "text-emerald-700 dark:text-emerald-400",
    "text-amber-700 dark:text-amber-400",
    "text-rose-700 dark:text-rose-400",
    "text-cyan-700 dark:text-cyan-400",
    "text-indigo-700 dark:text-indigo-400",
    "text-teal-700 dark:text-teal-400",
];

export function TeacherScheduleDialog({
    teacher,
    open,
    onOpenChange,
}: TeacherScheduleDialogProps) {
    const [entries, setEntries] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && teacher) {
            setLoading(true);
            setError(null);
            getTimetable({ teacher_id: teacher.id })
                .then((res) => {
                    if (res.success && res.data) {
                        setEntries(
                            (res.data as { timetable: TimetableEntry[] }).timetable || []
                        );
                    }
                })
                .catch((err) => {
                    setError(err?.message || "Failed to load schedule");
                })
                .finally(() => setLoading(false));
        }
    }, [open, teacher]);

    // Group entries by day
    const byDay: Record<number, TimetableEntry[]> = {};
    entries.forEach((e) => {
        if (!byDay[e.day_of_week]) byDay[e.day_of_week] = [];
        byDay[e.day_of_week].push(e);
    });
    // Sort each day by period
    Object.values(byDay).forEach((arr) =>
        arr.sort((a, b) => a.period_number - b.period_number)
    );

    const activeDays = Object.keys(byDay).map(Number).sort();
    const totalPeriods = entries.length;
    const uniqueSubjects = new Set(entries.map((e) => e.subject_name).filter(Boolean)).size;
    const uniqueClasses = new Set(entries.map((e) => `${e.class_name}-${e.section}`).filter(Boolean)).size;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[680px] p-0 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-5 text-white">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <CalendarDays className="h-5 w-5" />
                            </div>
                            Weekly Schedule — {teacher.name}
                        </DialogTitle>
                        <DialogDescription className="text-white/80 text-sm">
                            {teacher.subject_specialization
                                ? `${teacher.subject_specialization} Teacher`
                                : "Teacher"}{" "}
                            • {teacher.email}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-40 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-muted-foreground text-sm">
                            Loading schedule...
                        </p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center gap-3 px-6">
                        <AlertCircle className="h-8 w-8 text-destructive/60" />
                        <p className="text-muted-foreground text-sm">{error}</p>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-12 px-6">
                        <CalendarDays className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">
                            No schedule entries found
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                            Timetable slots will appear here once assigned.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 p-6">
                        {/* Summary Row */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-cyan-500/10 rounded-xl p-3 text-center">
                                <p className="text-xl font-bold text-cyan-600">{totalPeriods}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Periods/Week
                                </p>
                            </div>
                            <div className="bg-violet-500/10 rounded-xl p-3 text-center">
                                <p className="text-xl font-bold text-violet-600">
                                    {uniqueSubjects}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Subjects
                                </p>
                            </div>
                            <div className="bg-amber-500/10 rounded-xl p-3 text-center">
                                <p className="text-xl font-bold text-amber-600">
                                    {uniqueClasses}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Classes
                                </p>
                            </div>
                        </div>

                        {/* Schedule Grid */}
                        <ScrollArea className="max-h-[340px]">
                            <div className="space-y-4">
                                {activeDays.map((dayNum) => (
                                    <div key={dayNum}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 bg-muted/50 px-2.5 py-1 rounded-md">
                                                {DAYS[dayNum - 1] || `Day ${dayNum}`}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {byDay[dayNum].length} period
                                                {byDay[dayNum].length !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                        <div className="grid gap-2">
                                            {byDay[dayNum].map((entry) => {
                                                const colorIdx =
                                                    (entry.period_number - 1) % PERIOD_COLORS.length;
                                                return (
                                                    <div
                                                        key={entry.id}
                                                        className={cn(
                                                            "flex items-center justify-between p-3 rounded-xl border bg-gradient-to-r transition-all hover:shadow-sm",
                                                            PERIOD_COLORS[colorIdx]
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={cn(
                                                                    "h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold",
                                                                    `bg-white/60 dark:bg-white/10`,
                                                                    PERIOD_TEXT_COLORS[colorIdx]
                                                                )}
                                                            >
                                                                P{entry.period_number}
                                                            </div>
                                                            <div>
                                                                <p
                                                                    className={cn(
                                                                        "text-sm font-semibold",
                                                                        PERIOD_TEXT_COLORS[colorIdx]
                                                                    )}
                                                                >
                                                                    {entry.subject_name || "—"}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-[10px] px-1.5 py-0"
                                                                    >
                                                                        {entry.class_name}
                                                                        {entry.section
                                                                            ? ` - ${entry.section}`
                                                                            : ""}
                                                                    </Badge>
                                                                    {entry.room && (
                                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                                            <MapPin className="h-2.5 w-2.5" />
                                                                            {entry.room}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {(entry.start_time || entry.end_time) && (
                                                            <div className="text-right">
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {entry.start_time?.substring(0, 5) || "—"} –{" "}
                                                                    {entry.end_time?.substring(0, 5) || "—"}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
