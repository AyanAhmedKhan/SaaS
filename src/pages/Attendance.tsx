import { useState, useEffect, useCallback } from "react";
import { Calendar, Check, X, Clock, ChevronLeft, ChevronRight, Loader2, AlertCircle, Save, GraduationCap, CheckCircle2, XCircle, BookOpen, Target, Edit3, Book } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getStudents, getClasses, markAttendance as markAttendanceApi, getAttendance, getAttendanceSummary, getAttendanceMonthly, getAttendanceSubjectWise, getMyStudentProfile, getSyllabus, updateSyllabusEntry, getTimetable, getSubjectsByClass } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AttendanceCalendar } from "@/components/student/AttendanceCalendar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Student, Class as ClassType, AttendanceRecord, SyllabusEntry, TimetableEntry, Subject } from "@/types";

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | null;

/* ══════════════════════════════════════════════
   Student / Parent view — shows their own attendance
   ══════════════════════════════════════════════ */
function StudentAttendanceView() {
  const { isRole } = useAuth();
  const isParent = isRole('parent');
  const [summary, setSummary] = useState<{ total: number; present: number; absent: number; late: number; percentage: number } | null>(null);
  const [subjectStats, setSubjectStats] = useState<{ name: string; percentage: number; total: number; present: number }[]>([]);
  const [studentId, setStudentId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Get the student's own profile to find their student_id
        const profileRes = await getMyStudentProfile();
        if (profileRes.success && profileRes.data) {
          const profile = profileRes.data as { student: { id: string; class_id?: string } };
          setStudentId(profile.student?.id);

          // Fetch attendance summary for the student
          if (profile.student?.id) {
            const summaryRes = await getAttendanceSummary({ student_id: profile.student.id });
            if (summaryRes.success && summaryRes.data) {
              const rows = (summaryRes.data as {
                summary: Array<{
                  total_days: number | string;
                  present_days: number | string;
                  absent_days: number | string;
                  late_days: number | string;
                  attendance_percentage: number | string;
                }>
              }).summary;
              if (rows && rows.length > 0) {
                const row = rows[0];
                setSummary({
                  total: Number(row.total_days) || 0,
                  present: Number(row.present_days) || 0,
                  absent: Number(row.absent_days) || 0,
                  late: Number(row.late_days) || 0,
                  percentage: Number(row.attendance_percentage) || 0,
                });
              }
            }

            // Fetch subject-wise stats
            const subRes = await getAttendanceSubjectWise({ student_id: profile.student.id });
            if (subRes.success && subRes.data) {
              const dataList = (subRes.data as { subjectWise: { subject_name: string; percentage: string | number; total_classes: string | number; present: string | number }[] }).subjectWise || [];
              setSubjectStats(dataList.map(d => ({
                name: String(d.subject_name),
                percentage: Number(d.percentage) || 0,
                total: Number(d.total_classes) || 0,
                present: Number(d.present) || 0
              })));
            }
          }
        }
      } catch {
        // Silently fail — the calendar below will still work via auto-scoping
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const total = summary?.total || 0;
  const present = summary?.present || 0;
  const absent = summary?.absent || 0;
  const late = summary?.late || 0;
  const percentage = summary?.percentage || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {isParent ? "Child's Attendance" : 'My Attendance'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isParent ? "View your child's attendance records and calendar." : 'View your attendance records and calendar.'}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading attendance...</p>
          </div>
        )}

        {/* Summary Stats */}
        {!loading && summary && (
          <>
            {/* Attendance Percentage Hero */}
            <Card className="shadow-xl border border-white/20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl overflow-hidden animate-scale-in">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="relative flex items-center justify-center scale-110">
                    <svg width={120} height={120} className="transform -rotate-90 drop-shadow-lg">
                      <circle cx={60} cy={60} r={50} fill="none" stroke="currentColor" strokeWidth={10} className="text-muted/30" />
                      <circle
                        cx={60} cy={60} r={50} fill="none"
                        stroke="currentColor" strokeWidth={10}
                        strokeDasharray={2 * Math.PI * 50}
                        strokeDashoffset={2 * Math.PI * 50 - (Math.min(percentage, 100) / 100) * 2 * Math.PI * 50}
                        strokeLinecap="round"
                        className={`${percentage >= 90 ? 'text-emerald-500' : percentage >= 75 ? 'text-amber-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className={`text-3xl font-black tracking-tighter ${percentage >= 90 ? 'text-emerald-600 dark:text-emerald-400' : percentage >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}`}>
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-5 w-full">
                    <div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Overall Attendance</h3>
                      <p className="text-sm text-muted-foreground mt-1">{total} school days recorded</p>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground font-medium">Present</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{present} days</span>
                        </div>
                        <Progress value={total > 0 ? (present / total) * 100 : 0} className="h-2.5 bg-emerald-500/10 [&>div]:bg-gradient-to-r [&>div]:from-emerald-400 [&>div]:to-emerald-600" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground font-medium">Absent</span>
                          <span className="font-bold text-red-500 dark:text-red-400">{absent} days</span>
                        </div>
                        <Progress value={total > 0 ? (absent / total) * 100 : 0} className="h-2.5 bg-red-500/10 [&>div]:bg-gradient-to-r [&>div]:from-red-400 [&>div]:to-red-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subject-Wise Performance Chart */}
            {subjectStats.length > 0 && (
              <Card className="shadow-lg border-white/20 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md animate-fade-in-up hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Subject-Wise Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectStats} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" fontSize={13} tickLine={false} axisLine={false} dy={10} fontWeight={500} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                        <Tooltip
                          cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background/95 border border-border/50 p-4 rounded-xl shadow-2xl backdrop-blur-md">
                                  <p className="font-bold text-base">{data.name}</p>
                                  <div className="mt-2 space-y-1">
                                    <p className="text-sm font-medium">Attendance: <span className={cn(
                                      "font-bold",
                                      data.percentage >= 75 ? "text-emerald-500" : data.percentage >= 60 ? "text-amber-500" : "text-red-500"
                                    )}>{data.percentage}%</span></p>
                                    <p className="text-xs text-muted-foreground">{data.present} of {data.total} classes attended</p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={60}>
                          {subjectStats.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.percentage >= 75 ? "hsl(var(--primary))" : entry.percentage >= 60 ? "#f59e0b" : "#ef4444"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <Card className="shadow-lg border-white/20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{present}</p>
                    <p className="text-sm font-medium text-muted-foreground">Present</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-lg border-white/20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-500 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-red-500 dark:text-red-400">{absent}</p>
                    <p className="text-sm font-medium text-muted-foreground">Absent</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-lg border-white/20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-amber-500 dark:text-amber-400">{late}</p>
                    <p className="text-sm font-medium text-muted-foreground">Late</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-lg border-white/20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-primary">{total}</p>
                    <p className="text-xs text-muted-foreground">Total Days</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Attendance Calendar — backend auto-scopes for student role */}
        <AttendanceCalendar studentId={studentId} />
      </div>
    </DashboardLayout>
  );
}

/* ══════════════════════════════════════════════
   Admin / Teacher view — mark & manage attendance
   ══════════════════════════════════════════════ */
function AdminAttendanceView() {
  const { isRole } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Timetable State
  const [periods, setPeriods] = useState<TimetableEntry[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(true);

  // Marking View State
  const [selectedPeriod, setSelectedPeriod] = useState<TimetableEntry | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused' | null>>({});
  const [syllabusList, setSyllabusList] = useState<SyllabusEntry[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(true);

  // Monthly Data for Calendar Highlights
  const [monthlyTimetable, setMonthlyTimetable] = useState<TimetableEntry[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceRecord[]>([]);

  const canMark = isRole('super_admin', 'institute_admin', 'faculty');
  const dateStr = currentDate.toISOString().slice(0, 10);

  // 1. Fetch Schedule for the Selected Date
  const fetchPeriodsForDate = useCallback(async (date: Date) => {
    try {
      setLoadingPeriods(true);
      const dayNum = date.getDay().toString();
      const res = await getTimetable({ day: dayNum });
      if (res.success && res.data) {
        setPeriods((res.data as { timetable: TimetableEntry[] }).timetable || []);
      }
    } catch (err) {
      toast.error("Failed to load schedule for this date");
    } finally {
      setLoadingPeriods(false);
    }
  }, []);

  useEffect(() => {
    fetchPeriodsForDate(currentDate);
  }, [currentDate, fetchPeriodsForDate]);

  // Fetch Monthly Data for Calendar Highlighting
  useEffect(() => {
    async function loadMonthlyData() {
      try {
        const y = currentMonth.getFullYear().toString();
        const m = (currentMonth.getMonth() + 1).toString();
        const [ttRes, attRes] = await Promise.all([
          getTimetable(), // fetches all classes for this teacher
          getAttendanceMonthly({ year: y, month: m })
        ]);
        if (ttRes.success && ttRes.data) {
          setMonthlyTimetable((ttRes.data as { timetable: TimetableEntry[] }).timetable || []);
        }
        if (attRes.success && attRes.data) {
          setMonthlyAttendance((attRes.data as { records: AttendanceRecord[] }).records || []);
        }
      } catch (e) {
        console.error("Failed to load monthly data", e);
      }
    }
    if (canMark) {
      loadMonthlyData();
    }
  }, [currentMonth, canMark]);

  // 2. Fetch Details when a Period is Selected
  useEffect(() => {
    async function loadDetails() {
      if (!selectedPeriod) return;
      try {
        setLoadingDetails(true);
        setError(null);

        const params: Record<string, string> = { class_id: selectedPeriod.class_id, date: dateStr };
        if (selectedPeriod.subject_id) {
          params.subject_id = selectedPeriod.subject_id;
        }

        const [studentRes, attRes, syllabusRes] = await Promise.all([
          getStudents({ class_id: selectedPeriod.class_id, status: 'active' }),
          getAttendance(params),
          getSyllabus({ class_id: selectedPeriod.class_id })
        ]);

        if (studentRes.success && studentRes.data) {
          setStudents((studentRes.data as { students: Student[] }).students || []);
        }

        const existing: Record<string, 'present' | 'absent' | 'late' | 'excused' | null> = {};
        if (attRes.success && attRes.data) {
          const records = (attRes.data as { records: AttendanceRecord[] }).records || [];
          records.forEach(r => {
            existing[r.student_id] = r.status as 'present' | 'absent' | 'late' | 'excused';
          });
        }
        setAttendance(existing);

        if (syllabusRes.success && syllabusRes.data) {
          const allSyllabus = (syllabusRes.data as { syllabus: SyllabusEntry[] }).syllabus || [];
          setSyllabusList(selectedPeriod.subject_id ? allSyllabus.filter(s => s.subject_id === selectedPeriod.subject_id) : allSyllabus);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load details");
      } finally {
        setLoadingDetails(false);
      }
    }
    loadDetails();
  }, [selectedPeriod, dateStr]);

  // Calendar Helpers
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const handleCalendarDateClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setCurrentDate(newDate);
    setSelectedPeriod(null); // Return to list view
  };

  // Marking Actions
  const handleMarkAll = (status: 'present' | 'absent') => {
    const updated: Record<string, 'present' | 'absent' | 'late' | 'excused' | null> = {};
    students.forEach(s => { updated[s.id] = status; });
    setAttendance(updated);
  };

  const toggleAttendance = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }));
  };

  const handleSave = async () => {
    if (!selectedPeriod) return;
    const records = Object.entries(attendance)
      .filter(([, status]) => status !== null)
      .map(([student_id, status]) => ({ student_id, status: status as string }));

    if (records.length === 0) {
      toast.warning("Mark at least one student before saving.");
      return;
    }

    try {
      setSaving(true);
      const payload: Parameters<typeof markAttendanceApi>[0] = { records, class_id: selectedPeriod.class_id, date: dateStr };
      if (selectedPeriod.subject_id) payload.subject_id = selectedPeriod.subject_id;

      const res = await markAttendanceApi(payload);
      if (res.success) toast.success(`Attendance saved for ${records.length} students.`);
      else toast.error("Failed to save attendance.");
    } catch {
      toast.error("Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  const toggleTopicCompletion = async (topic: SyllabusEntry) => {
    const newStatus = topic.status === 'completed' ? 'not_started' : 'completed';
    const newPct = newStatus === 'completed' ? 100 : 0;

    setSyllabusList(prev => prev.map(t => t.id === topic.id ? { ...t, status: newStatus, completion_percentage: newPct } : t));

    try {
      const res = await updateSyllabusEntry(topic.id, { completion_percentage: newPct, status: newStatus });
      if (res.success) {
        toast.success(`Marked "${topic.topic_name}" as ${newStatus === 'completed' ? 'Done' : 'Pending'}`);
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Failed to update topic");
      setSyllabusList(prev => prev.map(t => t.id === topic.id ? topic : t));
    }
  };

  // Helper properties
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const getDayStatus = (day: number | null): 'mass_bunk' | 'scheduled' | null => {
    if (!day) return null;
    const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dayOfWeek = dateObj.getDay().toString();

    // Find all classes scheduled for this day of the week
    const scheduledClasses = monthlyTimetable.filter(t => t.day_of_week === dayOfWeek);
    if (scheduledClasses.length === 0) return null;

    // Check for mass bunk
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStrLocal = `${currentMonth.getFullYear()}-${pad(currentMonth.getMonth() + 1)}-${pad(day)}`;
    const scheduledClassIds = scheduledClasses.map(t => t.class_id);

    const dayRecords = monthlyAttendance.filter(r =>
      r.date.startsWith(dateStrLocal) &&
      scheduledClassIds.includes(r.class_id)
    );

    if (dayRecords.length > 0 && dayRecords.every(r => r.status === 'absent')) {
      return 'mass_bunk';
    }
    return 'scheduled';
  };

  const isCurrentRunningPeriod = (period: TimetableEntry) => {
    if (!isToday(currentDate)) return false;
    if (!period.start_time || !period.end_time) return false;

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = period.start_time.split(':').map(Number);
    const [endH, endM] = period.end_time.split(':').map(Number);
    return currentMins >= (startH * 60 + startM) && currentMins <= (endH * 60 + endM);
  };

  const getStatusColor = (status: 'present' | 'absent' | 'late' | 'excused' | null) => {
    switch (status) {
      case 'present': return 'bg-emerald-500 text-white border-emerald-500';
      case 'absent': return 'bg-red-500 text-white border-red-500';
      case 'late': return 'bg-amber-500 text-white border-amber-500';
      case 'excused': return 'bg-blue-500 text-white border-blue-500';
      default: return 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-muted-foreground';
    }
  };

  const stats = {
    present: Object.values(attendance).filter(s => s === 'present').length,
    absent: Object.values(attendance).filter(s => s === 'absent').length,
    late: Object.values(attendance).filter(s => s === 'late').length,
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const calendarDays = [...Array(getFirstDayOfMonth(currentMonth)).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendance Management</h1>
            <p className="text-muted-foreground text-sm mt-1">Select a date to view classes and mark student attendance</p>
          </div>
          <div className="flex items-center">
            <Button variant="outline" size="sm" onClick={() => setShowCalendar(!showCalendar)} className="gap-2">
              <Calendar className="h-4 w-4" />
              {showCalendar ? "Hide Calendar" : "Show Calendar"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Calendar (Span 4) */}
          <div className={cn("transition-all duration-300", showCalendar ? "lg:col-span-4 block" : "hidden")}>
            <div className="space-y-6">
              <Card className="shadow-lg border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Calendar</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-center mt-2">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-xs font-bold text-muted-foreground h-8 flex items-center justify-center">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, idx) => {
                      const isSelected = day && currentDate.getDate() === day && currentDate.getMonth() === currentMonth.getMonth() && currentDate.getFullYear() === currentMonth.getFullYear();
                      const isTdy = day && isToday(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
                      const status = getDayStatus(day);

                      return (
                        <button
                          key={idx}
                          onClick={() => day && handleCalendarDateClick(day)}
                          disabled={!day}
                          className={cn(
                            "h-10 w-full text-xs font-semibold rounded-lg transition-all relative overflow-hidden flex items-center justify-center",
                            !day && "invisible",
                            day && "hover:bg-blue-200 dark:hover:bg-blue-800 cursor-pointer",
                            day && !isTdy && !isSelected && status === null && "bg-white dark:bg-zinc-900 border border-transparent",
                            isTdy && !isSelected && "border-2 border-primary font-bold bg-white dark:bg-zinc-900",
                            isSelected && "bg-primary text-white shadow-lg scale-105 z-10",
                            !isSelected && status === 'scheduled' && "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
                            !isSelected && status === 'mass_bunk' && "bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-800"
                          )}
                          title={status === 'mass_bunk' ? 'Mass Bunk (All Absent)' : status === 'scheduled' ? 'Classes Scheduled' : ''}
                        >
                          <span className="relative z-10">{day}</span>
                          {status === 'scheduled' && !isSelected && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-emerald-500" />
                          )}
                          {status === 'mass_bunk' && !isSelected && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-red-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {!selectedPeriod && (
                <Card className="shadow-md border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 animate-fade-in-up">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-purple-600 dark:text-purple-400">Selected Date</p>
                      <p className="text-xl font-black">{formatDate(currentDate)}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Column: Schedule List OR Marking View */}
          <div className={cn("transition-all duration-300", showCalendar ? "lg:col-span-8" : "lg:col-span-12")}>
            {!selectedPeriod ? (
              /* =======================
                 CLASS PERIODS LIST VIEW 
                 ======================= */
              <div className="space-y-4 animate-fade-in-up">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Scheduled Classes
                </h2>

                {loadingPeriods ? (
                  <div className="flex items-center justify-center h-40 gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-muted-foreground text-sm">Loading schedule...</p>
                  </div>
                ) : periods.length === 0 ? (
                  <div className="text-center py-16 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 border-dashed">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-semibold text-muted-foreground">No classes scheduled</p>
                    <p className="text-sm text-muted-foreground mt-1">Select a different date from the calendar</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {periods.map((period, index) => {
                      const isRunning = isCurrentRunningPeriod(period);

                      return (
                        <Card
                          key={period.id}
                          className={cn(
                            "group cursor-pointer hover:shadow-xl transition-all duration-300 border-2",
                            isRunning
                              ? "border-primary shadow-primary/20 bg-primary/5 scale-[1.02]"
                              : "border-transparent hover:border-primary/50"
                          )}
                          onClick={() => setSelectedPeriod(period)}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-4">
                              <span className={cn(
                                "text-xs font-bold px-3 py-1 rounded-full",
                                isRunning ? "bg-primary text-white animate-pulse" : "bg-primary/10 text-primary"
                              )}>
                                {isRunning ? "Running Now" : `Period ${period.period_number}`}
                              </span>
                              <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {period.start_time} - {period.end_time}
                              </span>
                            </div>

                            <h3 className="text-2xl font-black mb-1">{period.class_name} {period.section}</h3>
                            <p className="text-muted-foreground font-medium flex items-center gap-2">
                              <Book className="h-4 w-4" />
                              {period.subject_name || 'General'}
                            </p>

                            <div className="mt-6 flex items-center justify-between">
                              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                <Target className="h-4 w-4 opacity-70" />
                                Room: {period.room || 'N/A'}
                              </p>
                              <Button size="sm" className={cn("rounded-full px-6 transition-all", isRunning && "px-8 shadow-lg shadow-primary/30")}>
                                Mark
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* =======================
                 MARKING VIEW 
                 ======================= */
              <div className="space-y-6 animate-slide-in-right">
                {/* Header Card */}
                <Card className="shadow-lg border-primary/20 bg-gradient-to-r from-primary/10 via-background to-primary/5 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPeriod(null)} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="h-4 w-4" /> Back to Schedule
                      </Button>
                      <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                        {formatDate(currentDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl font-black">
                          {selectedPeriod.class_name} {selectedPeriod.section}
                        </CardTitle>
                        <p className="text-muted-foreground font-medium mt-1 flex items-center gap-2">
                          <Book className="h-4 w-4" />
                          {selectedPeriod.subject_name || 'General Class'}
                          <span className="mx-2 opacity-50">•</span>
                          <Clock className="h-4 w-4" />
                          {selectedPeriod.start_time} - {selectedPeriod.end_time}
                        </p>
                      </div>

                      {isCurrentRunningPeriod(selectedPeriod) && (
                        <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/20">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping absolute" />
                          <div className="h-2 w-2 rounded-full bg-emerald-500 relative" />
                          <span className="text-sm font-bold uppercase tracking-wider">Live Class</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Stats & Topics Sidebar */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Real-time Stats */}
                    <Card className="shadow-lg border-white/10">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Snapshot</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-emerald-500" /> <span className="text-sm font-medium">Present</span></div>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.present}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-red-500" /> <span className="text-sm font-medium">Absent</span></div>
                          <span className="font-bold text-red-500 dark:text-red-400">{stats.absent}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-amber-500" /> <span className="text-sm font-medium">Late</span></div>
                          <span className="font-bold text-amber-500 dark:text-amber-400">{stats.late}</span>
                        </div>
                        <div className="pt-4 border-t border-border mt-4 flex justify-between items-center">
                          <span className="text-sm font-bold">Total Students</span>
                          <span className="font-black text-lg">{students.length}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Topics Checklist */}
                    {syllabusList.length > 0 && (
                      <Card className="shadow-lg border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            Topics Checklist
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {syllabusList.map(topic => {
                              const isCompleted = topic.status === 'completed';
                              return (
                                <button
                                  key={topic.id}
                                  onClick={() => toggleTopicCompletion(topic)}
                                  className={cn(
                                    "w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all text-sm group",
                                    isCompleted
                                      ? "bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700"
                                      : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:border-purple-400"
                                  )}
                                >
                                  <div className={cn(
                                    "mt-0.5 flex-shrink-0 h-5 w-5 rounded-md flex items-center justify-center border transition-colors",
                                    isCompleted ? "bg-purple-500 border-purple-500 text-white" : "border-gray-300 dark:border-gray-600 bg-transparent"
                                  )}>
                                    {isCompleted && <Check className="h-3.5 w-3.5" />}
                                  </div>
                                  <span className={cn(
                                    "font-medium leading-tight",
                                    isCompleted ? "text-purple-900 dark:text-purple-100 line-through opacity-70" : "text-foreground"
                                  )}>
                                    {topic.topic_name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Student Roster */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Bulk Actions Menu */}
                    {students.length > 0 && (
                      <Card className="shadow-sm">
                        <CardContent className="p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                              variant="outline"
                              onClick={() => handleMarkAll('present')}
                              className="flex-1 sm:flex-none border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 font-semibold shadow-sm"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" /> Mark All Present
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleMarkAll('absent')}
                              className="flex-1 sm:flex-none border-red-200 bg-red-50 hover:bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400 font-semibold shadow-sm"
                            >
                              <XCircle className="h-4 w-4 mr-2" /> Mark All Absent
                            </Button>
                          </div>
                          {canMark && (
                            <Button
                              onClick={handleSave}
                              disabled={saving || Object.values(attendance).every(s => s === null)}
                              className="w-full sm:w-auto bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg font-bold"
                            >
                              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                              Save Register
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {loadingDetails ? (
                      <div className="flex items-center justify-center h-40 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-muted-foreground text-sm">Loading students...</p>
                      </div>
                    ) : error ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center border-dashed border-2 rounded-xl">
                        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                        <p className="font-semibold">{error}</p>
                      </div>
                    ) : students.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 rounded-xl">
                        <GraduationCap className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="font-semibold text-lg">No Students Found</p>
                        <p className="text-muted-foreground text-sm mt-1">There are no active students in this class.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {students.map((student, index) => (
                          <div
                            key={student.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-white dark:bg-zinc-900 hover:border-primary/50 hover:shadow-md transition-all animate-scale-in"
                            style={{ animationDelay: `${index * 15}ms` }}
                          >
                            <div className="flex items-center gap-4">
                              <Avatar className="h-10 w-10 border-2 border-primary/10">
                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-blue-500/20 text-primary font-bold">
                                  {student.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-sm tracking-tight">{student.name}</p>
                                <p className="text-xs text-muted-foreground font-medium">Roll No. <span className="text-foreground">{student.roll_number}</span></p>
                              </div>
                            </div>

                            {canMark ? (
                              <div className="flex bg-muted/50 p-1.5 rounded-xl w-full sm:w-auto gap-1 border border-border/50 shadow-inner">
                                <button
                                  onClick={() => toggleAttendance(student.id, 'present')}
                                  className={cn("flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-1.5 px-4 rounded-lg text-xs font-bold transition-all", attendance[student.id] === 'present' ? "bg-emerald-500 text-white shadow-md" : "hover:bg-muted-foreground/10 text-muted-foreground")}
                                >
                                  P
                                </button>
                                <button
                                  onClick={() => toggleAttendance(student.id, 'absent')}
                                  className={cn("flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-1.5 px-4 rounded-lg text-xs font-bold transition-all", attendance[student.id] === 'absent' ? "bg-red-500 text-white shadow-md" : "hover:bg-muted-foreground/10 text-muted-foreground")}
                                >
                                  A
                                </button>
                                <button
                                  onClick={() => toggleAttendance(student.id, 'late')}
                                  className={cn("flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-1.5 px-4 rounded-lg text-xs font-bold transition-all", attendance[student.id] === 'late' ? "bg-amber-500 text-white shadow-md" : "hover:bg-muted-foreground/10 text-muted-foreground")}
                                >
                                  L
                                </button>
                              </div>
                            ) : (
                              <div className={cn("px-4 py-1.5 rounded-full text-xs font-bold border", getStatusColor(attendance[student.id]))}>
                                {attendance[student.id] ? attendance[student.id]?.toUpperCase() : 'UNMARKED'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ══════════════════════════════════════════════
   Main component — route to correct view by role
   ══════════════════════════════════════════════ */
export default function Attendance() {
  const { isRole } = useAuth();
  const isStudentOrParent = isRole('student', 'parent');

  if (isStudentOrParent) {
    return <StudentAttendanceView />;
  }

  return <AdminAttendanceView />;
}
