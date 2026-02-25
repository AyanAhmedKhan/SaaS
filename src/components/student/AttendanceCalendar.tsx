import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Loader2,
  Plus,
  Trash2,
  PartyPopper,
} from "lucide-react";
import {
  getAttendanceMonthly,
  getHolidays,
  createHoliday,
  deleteHoliday,
  type Holiday,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ViewMode = "day-wise";

interface RawRecord {
  date: string;
  status: string;
  student_id: string;
  student_name?: string;
}

type DayStatus = "present" | "absent" | null;

interface AttendanceCalendarProps {
  studentId?: string;
  classId?: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const HOLIDAY_TYPES = [
  { value: "general", label: "General" },
  { value: "national", label: "National" },
  { value: "religious", label: "Religious" },
  { value: "exam", label: "Exam" },
  { value: "custom", label: "Custom" },
];

export function AttendanceCalendar({ studentId, classId }: AttendanceCalendarProps) {
  const today = new Date();
  const { isRole } = useAuth();
  const { toast } = useToast();
  const isAdmin = isRole("institute_admin", "super_admin");

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [viewMode, setViewMode] = useState<ViewMode>("day-wise");
  const [records, setRecords] = useState<RawRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);

  /* ─── Holiday dialog state ─── */
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDate, setAddDate] = useState("");
  const [addName, setAddName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addType, setAddType] = useState("general");
  const [addLoading, setAddLoading] = useState(false);

  const [viewHoliday, setViewHoliday] = useState<Holiday | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ─── Fetch attendance + holidays (independent so one failure doesn't block the other) ─── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {
      year: String(year),
      month: String(month),
    };
    if (studentId) params.student_id = studentId;
    if (classId) params.class_id = classId;

    // Fetch attendance records
    try {
      const attRes = await getAttendanceMonthly(params);
      if (attRes.success && attRes.data) {
        const data = attRes.data as unknown as { records: RawRecord[] };
        setRecords(data.records || []);
      } else {
        setRecords([]);
      }
    } catch {
      setRecords([]);
    }

    // Fetch holidays (independent — don't let failure break attendance)
    try {
      const holRes = await getHolidays({ year: String(year), month: String(month) });
      if (holRes.success && holRes.data) {
        setHolidays(holRes.data.holidays || []);
      } else {
        setHolidays([]);
      }
    } catch {
      setHolidays([]);
    }

    setLoading(false);
  }, [year, month, studentId, classId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── Calendar grid calculation ─── */
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  /* ─── Holiday lookup by day number ─── */
  const holidayByDay = useMemo(() => {
    const map = new Map<number, Holiday>();
    for (const h of holidays) {
      const d = new Date(h.date);
      map.set(d.getUTCDate(), h);
    }
    return map;
  }, [holidays]);

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
    for (const [day, s] of map) {
      result.set(day, s.present >= s.total / 2 ? "present" : "absent");
    }
    return result;
  }, [records]);

  /* ─── Stats summary ─── */
  const stats = useMemo(() => {
    let present = 0, absent = 0;
    for (const [, status] of dayStatuses) {
      if (status === "present") present++;
      else if (status === "absent") absent++;
    }
    const total = present + absent;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, total, noClass: daysInMonth - total, percentage, holidays: holidays.length };
  }, [dayStatuses, daysInMonth, holidays.length]);

  /* ─── Month navigation ─── */
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (year === today.getFullYear() && month === today.getMonth() + 1) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const isToday = (day: number) =>
    year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate();

  const isFuture = (day: number) => new Date(year, month - 1, day) > today;

  const isCurrentOrFutureMonth = year > today.getFullYear() ||
    (year === today.getFullYear() && month > today.getMonth() + 1);

  /* ─── Build calendar grid ─── */
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  /* ─── Add holiday handler ─── */
  const handleAddHoliday = async () => {
    if (!addName.trim() || !addDate) return;
    try {
      setAddLoading(true);
      const res = await createHoliday({ date: addDate, name: addName.trim(), description: addDescription.trim() || undefined, holiday_type: addType });
      if (res.success) {
        toast({ title: "Holiday added", description: `${addName} has been marked as a holiday.` });
        setAddDialogOpen(false);
        setAddDate("");
        setAddName("");
        setAddDescription("");
        setAddType("general");
        fetchData();
      } else {
        toast({ title: "Error", description: (res as { message?: string }).message || "Failed to add holiday", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to add holiday", variant: "destructive" });
    } finally {
      setAddLoading(false);
    }
  };

  /* ─── Delete holiday handler ─── */
  const handleDeleteHoliday = async (id: string) => {
    try {
      setDeleteLoading(true);
      const res = await deleteHoliday(id);
      if (res.success) {
        toast({ title: "Holiday removed", description: "The holiday has been removed." });
        setViewHoliday(null);
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to remove holiday", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to remove holiday", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  /* ─── Open add dialog pre-filled with a date ─── */
  const openAddForDate = (day: number) => {
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    setAddDate(`${year}-${mm}-${dd}`);
    setAddDialogOpen(true);
  };

  /* ─── Click handler on a day cell ─── */
  const handleDayClick = (day: number) => {
    const hol = holidayByDay.get(day);
    if (hol) {
      setViewHoliday(hol);
    } else if (isAdmin) {
      openAddForDate(day);
    }
  };

  return (
    <TooltipProvider>
      <Card className="shadow-card border-border/40">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Attendance Calendar
            </CardTitle>

            <div className="flex items-center gap-4">
              {/* Admin: Add Holiday button */}
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => {
                    setAddDate("");
                    setAddDialogOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Holiday
                </Button>
              )}

              {/* View mode selector */}
              <div className="flex items-center gap-1">
                <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day-wise">Day-wise View</SelectItem>
                  </SelectContent>
                </Select>
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
                  <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
                    {day}
                  </div>
                ))}

                {/* Days */}
                {calendarCells.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="aspect-square" />;
                  }

                  const status = dayStatuses.get(day);
                  const holiday = holidayByDay.get(day);
                  const future = isFuture(day);
                  const todayFlag = isToday(day);

                  const cell = (
                    <div
                      key={day}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 relative cursor-pointer select-none",
                        // Holiday (takes visual priority)
                        holiday && "bg-blue-500 text-white shadow-sm shadow-blue-500/25",
                        // Present (when not holiday)
                        !holiday && status === "present" && "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25",
                        // Absent (when not holiday)
                        !holiday && status === "absent" && "bg-red-500 text-white shadow-sm shadow-red-500/25",
                        // No record & not future & not holiday
                        !holiday && !status && !future && "text-muted-foreground hover:bg-muted/60",
                        // Future dates
                        !holiday && future && "text-muted-foreground/40",
                        // Today highlight
                        todayFlag && !status && !holiday && "ring-2 ring-primary/50",
                        todayFlag && (status || holiday) && "ring-2 ring-white/50",
                        // Admin clickable hint
                        isAdmin && !holiday && "hover:ring-1 hover:ring-primary/30",
                      )}
                    >
                      {day}
                      {/* Tiny holiday icon indicator */}
                      {holiday && (
                        <PartyPopper className="h-2.5 w-2.5 absolute bottom-0.5 right-0.5 opacity-70" />
                      )}
                    </div>
                  );

                  // Wrap with tooltip if holiday
                  if (holiday) {
                    return (
                      <Tooltip key={day}>
                        <TooltipTrigger asChild>{cell}</TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p className="font-semibold text-xs">{holiday.name}</p>
                          {holiday.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{holiday.description}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{holiday.holiday_type} holiday</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return cell;
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-4 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-500" />
                  <span className="text-xs text-muted-foreground">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500" />
                  <span className="text-xs text-muted-foreground">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500" />
                  <span className="text-xs text-muted-foreground">Holiday</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border border-border bg-card" />
                  <span className="text-xs text-muted-foreground">No Class</span>
                </div>
              </div>

              {/* Holidays list for this month */}
              {holidays.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/40">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <PartyPopper className="h-3.5 w-3.5" />
                    Holidays this month ({holidays.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {holidays.map((h) => {
                      const d = new Date(h.date);
                      return (
                        <button
                          key={h.id}
                          onClick={() => setViewHoliday(h)}
                          className="flex items-center gap-2 text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full hover:bg-blue-500/20 transition-colors"
                        >
                          <span className="font-bold">{d.getUTCDate()}</span>
                          <span>{h.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Note */}
              <p className="text-xs text-muted-foreground/70 text-center mt-3">
                <span className="font-medium text-muted-foreground">Note:</span>{" "}
                Day-wise status is based on attending at least half of the classes on that day
              </p>

              {/* Monthly Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-4 border-t border-border/40">
                <div className="text-center p-3 rounded-xl bg-emerald-500/10">
                  <p className="text-xl font-bold text-emerald-600">{stats.present}</p>
                  <p className="text-xs text-muted-foreground">Days Present</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-red-500/10">
                  <p className="text-xl font-bold text-red-600">{stats.absent}</p>
                  <p className="text-xs text-muted-foreground">Days Absent</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-blue-500/10">
                  <p className="text-xl font-bold text-blue-600">{stats.holidays}</p>
                  <p className="text-xs text-muted-foreground">Holidays</p>
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

      {/* ─── Add Holiday Dialog ─── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-blue-500" />
              Add Holiday
            </DialogTitle>
            <DialogDescription>
              Mark a date as a holiday. This will be visible to all users in the institute.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="hol-date">Date</Label>
              <Input
                id="hol-date"
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hol-name">Holiday Name</Label>
              <Input
                id="hol-name"
                placeholder="e.g. Republic Day"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hol-desc">Description (optional)</Label>
              <Input
                id="hol-desc"
                placeholder="Additional details..."
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hol-type">Type</Label>
              <Select value={addType} onValueChange={setAddType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOLIDAY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddHoliday} disabled={addLoading || !addName.trim() || !addDate}>
              {addLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View / Delete Holiday Dialog ─── */}
      <Dialog open={!!viewHoliday} onOpenChange={(open) => !open && setViewHoliday(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-blue-500" />
              {viewHoliday?.name}
            </DialogTitle>
            <DialogDescription>
              {viewHoliday && new Date(viewHoliday.date).toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              })}
            </DialogDescription>
          </DialogHeader>

          {viewHoliday && (
            <div className="py-3 space-y-3">
              {viewHoliday.description && (
                <p className="text-sm text-muted-foreground">{viewHoliday.description}</p>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Type:</span>
                <span className="text-xs capitalize bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  {viewHoliday.holiday_type}
                </span>
              </div>
              {viewHoliday.created_by_name && (
                <p className="text-xs text-muted-foreground">
                  Added by {viewHoliday.created_by_name}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewHoliday(null)}>Close</Button>
            {isAdmin && viewHoliday && (
              <Button
                variant="destructive"
                onClick={() => handleDeleteHoliday(viewHoliday.id)}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Remove Holiday
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
