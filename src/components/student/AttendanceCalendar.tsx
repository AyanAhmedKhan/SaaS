import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from "lucide-react";
import { getAttendanceMonthly } from "@/lib/api";
import { cn } from "@/lib/utils";

type ViewMode = "day-wise" | "subject-wise";

interface RawRecord {
  date: string;
  status: string;
  student_id: string;
  student_name?: string;
}

/** Day-wise aggregation: present if at least half the classes that day were present */
type DayStatus = "present" | "absent" | null;

interface AttendanceCalendarProps {
  /** If given, filters to a specific student (for student/parent role) */
  studentId?: string;
  classId?: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function AttendanceCalendar({ studentId, classId }: AttendanceCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [viewMode, setViewMode] = useState<ViewMode>("day-wise");
  const [records, setRecords] = useState<RawRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMonthly = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        year: String(year),
        month: String(month),
      };
      if (studentId) params.student_id = studentId;
      if (classId) params.class_id = classId;
      const res = await getAttendanceMonthly(params);
      if (res.success && res.data) {
        // The backend returns { records: [...] }
        const data = res.data as unknown as { records: RawRecord[] };
        setRecords(data.records || []);
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [year, month, studentId, classId]);

  useEffect(() => {
    fetchMonthly();
  }, [fetchMonthly]);

  /* ─── Calendar grid calculation ─── */
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun

  /* ─── Aggregate records into day statuses ─── */
  const dayStatuses = useMemo(() => {
    const map = new Map<number, { present: number; total: number }>();
    for (const rec of records) {
      const d = new Date(rec.date);
      const day = d.getUTCDate();
      const prev = map.get(day) || { present: 0, total: 0 };
      prev.total += 1;
      if (rec.status === "present" || rec.status === "late") prev.present += 1;
      map.set(day, prev);
    }

    const result = new Map<number, DayStatus>();
    for (const [day, stats] of map) {
      // Day-wise: present if >= half classes were present/late
      result.set(day, stats.present >= stats.total / 2 ? "present" : "absent");
    }
    return result;
  }, [records]);

  /* ─── Subject-wise view data ─── */
  const subjectData = useMemo(() => {
    if (viewMode !== "subject-wise") return [];
    const map = new Map<string, { present: number; absent: number; late: number; total: number }>();
    for (const rec of records) {
      // We don't have subject info from the monthly endpoint, so subject-wise
      // grouping can be done by date. Fallback to day-wise in that case.
    }
    return [];
  }, [records, viewMode]);

  /* ─── Stats summary ─── */
  const stats = useMemo(() => {
    let present = 0, absent = 0;
    for (const [, status] of dayStatuses) {
      if (status === "present") present++;
      else if (status === "absent") absent++;
    }
    const total = present + absent;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, total, noClass: daysInMonth - total, percentage };
  }, [dayStatuses, daysInMonth]);

  /* ─── Month navigation ─── */
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
    if (isCurrentMonth) return; // Don't go past current month
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  /* ─── View mode navigation ─── */
  const viewModes: ViewMode[] = ["day-wise"];
  const currentModeIdx = viewModes.indexOf(viewMode);
  const prevView = () => {
    const idx = (currentModeIdx - 1 + viewModes.length) % viewModes.length;
    setViewMode(viewModes[idx]);
  };
  const nextView = () => {
    const idx = (currentModeIdx + 1) % viewModes.length;
    setViewMode(viewModes[idx]);
  };

  const isToday = (day: number) =>
    year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate();

  const isFuture = (day: number) => {
    const d = new Date(year, month - 1, day);
    return d > today;
  };

  const isCurrentOrFutureMonth = year > today.getFullYear() ||
    (year === today.getFullYear() && month > today.getMonth() + 1);

  /* ─── Build calendar grid (6 rows x 7 cols) ─── */
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  return (
    <Card className="shadow-card border-border/40">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Attendance Calendar
          </CardTitle>

          <div className="flex items-center gap-4">
            {/* View mode selector */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevView}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <SelectTrigger className="w-[150px] h-8 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day-wise">Day-wise View</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextView}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Month navigator */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold min-w-[140px] text-center">
                {MONTH_NAMES[month - 1]} {year}
              </span>
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                onClick={nextMonth}
                disabled={isCurrentOrFutureMonth || (year === today.getFullYear() && month === today.getMonth() + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {loading ? (
          <div className="flex items-center justify-center h-48 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading calendar...</span>
          </div>
        ) : (
          <>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Header */}
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}

              {/* Days */}
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="aspect-square" />;
                }

                const status = dayStatuses.get(day);
                const future = isFuture(day);
                const todayFlag = isToday(day);

                return (
                  <div
                    key={day}
                    className={cn(
                      "aspect-square flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 relative",
                      // Present
                      status === "present" && "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25",
                      // Absent
                      status === "absent" && "bg-red-500 text-white shadow-sm shadow-red-500/25",
                      // No record & not future = no class
                      !status && !future && "text-muted-foreground",
                      // Future dates
                      future && "text-muted-foreground/40",
                      // Today highlight
                      todayFlag && !status && "ring-2 ring-primary/50 rounded-lg",
                      todayFlag && status && "ring-2 ring-white/50",
                    )}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-4 border-t border-border/40">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-500" />
                <span className="text-xs text-muted-foreground">Present (Day)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span className="text-xs text-muted-foreground">Absent (Day)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-border bg-card" />
                <span className="text-xs text-muted-foreground">No Class</span>
              </div>
            </div>

            {/* Note */}
            <p className="text-xs text-muted-foreground/70 text-center mt-3">
              <span className="font-medium text-muted-foreground">Note:</span>{" "}
              Day-wise status is based on attending at least half of the classes on that day
            </p>

            {/* Monthly Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-border/40">
              <div className="text-center p-3 rounded-xl bg-emerald-500/10">
                <p className="text-xl font-bold text-emerald-600">{stats.present}</p>
                <p className="text-xs text-muted-foreground">Days Present</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-red-500/10">
                <p className="text-xl font-bold text-red-600">{stats.absent}</p>
                <p className="text-xs text-muted-foreground">Days Absent</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted">
                <p className="text-xl font-bold text-muted-foreground">{stats.noClass}</p>
                <p className="text-xs text-muted-foreground">No Class</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-primary/10">
                <p className="text-xl font-bold text-primary">{stats.percentage}%</p>
                <p className="text-xs text-muted-foreground">Attendance Rate</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
