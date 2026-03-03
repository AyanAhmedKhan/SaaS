import { useState, useEffect, useCallback } from "react";
import { Calendar, Check, X, Clock, ChevronLeft, ChevronRight, Loader2, AlertCircle, Save, GraduationCap, CheckCircle2, XCircle, BookOpen, Target, Edit3 } from "lucide-react";
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
import { getStudents, getClasses, markAttendance as markAttendanceApi, getAttendance, getAttendanceSummary, getAttendanceSubjectWise, getMyStudentProfile, getSyllabus, updateSyllabusEntry, getTimetable } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AttendanceCalendar } from "@/components/student/AttendanceCalendar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Student, Class as ClassType, AttendanceRecord, SyllabusEntry, TimetableEntry } from "@/types";

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | null;

/* ══════════════════════════════════════════════
   Student / Parent view — shows their own attendance
   ══════════════════════════════════════════════ */
function StudentAttendanceView() {
  const [summary, setSummary] = useState<{ total: number; present: number; absent: number; late: number; percentage: number } | null>(null);
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
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
              const dataList = (subRes.data as { subjectWise: any[] }).subjectWise || [];
              setSubjectStats(dataList.map(d => ({
                name: d.subject_name,
                percentage: parseFloat(d.percentage) || 0,
                total: parseInt(d.total_classes) || 0,
                present: parseInt(d.present) || 0
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
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">My Attendance</h1>
          <p className="text-muted-foreground text-sm">View your attendance records and calendar.</p>
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
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [syllabusList, setSyllabusList] = useState<SyllabusEntry[]>([]);
  const [timetableList, setTimetableList] = useState<TimetableEntry[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late' | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTopicDialog, setShowTopicDialog] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<SyllabusEntry | null>(null);
  const [topicPercentage, setTopicPercentage] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showClassesDialog, setShowClassesDialog] = useState(false);
  const [classesForDate, setClassesForDate] = useState<TimetableEntry[]>([]);
  const [selectedDateForClasses, setSelectedDateForClasses] = useState<Date | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const canMark = isRole('super_admin', 'institute_admin', 'class_teacher', 'subject_teacher');
  const dateStr = currentDate.toISOString().slice(0, 10);

  // Load classes on mount
  useEffect(() => {
    getClasses().then(res => {
      if (res.success && res.data) {
        const classList = (res.data as { classes: ClassType[] }).classes || [];
        setClasses(classList);
        if (classList.length > 0 && !selectedClassId) {
          setSelectedClassId(classList[0].id);
        }
      }
    }).finally(() => setLoading(false));
  }, []);

  // Load students + existing attendance + syllabus items when class or date changes
  const fetchData = useCallback(async () => {
    if (!selectedClassId) return;
    try {
      setLoading(true);
      setError(null);

      const [studentRes, attRes, syllabusRes] = await Promise.all([
        getStudents({ class_id: selectedClassId, status: 'active' }),
        getAttendance({ class_id: selectedClassId, date: dateStr }),
        getSyllabus({ class_id: selectedClassId }),
      ]);

      if (studentRes.success && studentRes.data) {
        setStudents((studentRes.data as { students: Student[] }).students || []);
      }

      // Prefill attendance from existing records
      const existing: Record<string, 'present' | 'absent' | 'late' | null> = {};
      if (attRes.success && attRes.data) {
        const records = (attRes.data as { records: AttendanceRecord[] }).records || [];
        records.forEach(r => {
          existing[r.student_id] = r.status as 'present' | 'absent' | 'late';
        });
      }
      setAttendance(existing);

      // Load syllabus for the class
      if (syllabusRes.success && syllabusRes.data) {
        setSyllabusList((syllabusRes.data as { syllabus: SyllabusEntry[] }).syllabus || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, dateStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleCalendarDateClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setCurrentDate(newDate);
    setSelectedDateForClasses(newDate);
    fetchClassesForDate(newDate);
  };

  const getDayOfWeekName = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const fetchClassesForDate = async (date: Date) => {
    try {
      setLoadingClasses(true);
      const dayName = getDayOfWeekName(date);
      const res = await getTimetable({ day: dayName });
      if (res.success && res.data) {
        const entries = (res.data as { timetable: TimetableEntry[] }).timetable || [];
        setClassesForDate(entries);
        setShowClassesDialog(true);
      }
    } catch (err) {
      toast.error("Failed to load classes for this date");
    } finally {
      setLoadingClasses(false);
    }
  };

  const toggleAttendance = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }));
  };

  const handleSave = async () => {
    const records = Object.entries(attendance)
      .filter(([, status]) => status !== null)
      .map(([student_id, status]) => ({
        student_id,
        status: status as string,
      }));

    if (records.length === 0) {
      toast.warning("Mark at least one student before saving.");
      return;
    }

    try {
      setSaving(true);
      const res = await markAttendanceApi({
        records,
        class_id: selectedClassId,
        date: dateStr,
      });
      if (res.success) {
        toast.success(`Attendance saved for ${records.length} students.`);
      } else {
        toast.error("Failed to save attendance.");
      }
    } catch {
      toast.error("Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTopic = async () => {
    if (!selectedTopic) return;
    
    try {
      setSaving(true);
      const res = await updateSyllabusEntry(selectedTopic.id, {
        completion_percentage: topicPercentage,
        status: topicPercentage === 100 ? 'completed' : topicPercentage > 0 ? 'in_progress' : 'not_started',
      });
      if (res.success) {
        toast.success(`Updated "${selectedTopic.topic}" completion to ${topicPercentage}%`);
        setShowTopicDialog(false);
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to update topic");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: 'present' | 'absent' | 'late' | null) => {
    switch (status) {
      case 'present': return 'bg-emerald-500 text-white';
      case 'absent': return 'bg-red-500 text-white';
      case 'late': return 'bg-amber-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const stats = {
    present: Object.values(attendance).filter(s => s === 'present').length,
    absent: Object.values(attendance).filter(s => s === 'absent').length,
    late: Object.values(attendance).filter(s => s === 'late').length,
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarDays = [
    ...Array(firstDay).fill(null),
    ...days,
  ];

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && 
           currentMonth.getMonth() === today.getMonth() && 
           currentMonth.getFullYear() === today.getFullYear();
  };

  const isSelectedDate = (day: number) => {
    return day === currentDate.getDate() && 
           currentMonth.getMonth() === currentDate.getMonth() && 
           currentMonth.getFullYear() === currentDate.getFullYear();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendance Management</h1>
            <p className="text-muted-foreground text-sm mt-1">Track attendance and update lesson progress</p>
          </div>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-[200px] bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-2 border-blue-200 dark:border-blue-800">
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Calendar */}
          <Card className="lg:col-span-1 shadow-lg border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
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
              <p className="text-sm font-semibold text-center mt-2">{monthName}</p>
            </CardHeader>
            <CardContent>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-bold text-muted-foreground h-8 flex items-center justify-center">
                    {day}
                  </div>
                ))}
              </div>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => day && handleCalendarDateClick(day)}
                    disabled={!day}
                    className={cn(
                      "h-8 text-xs font-semibold rounded-lg transition-all",
                      !day && "invisible",
                      day && "hover:bg-blue-200 dark:hover:bg-blue-800",
                      isSelectedDate(day) && "bg-primary text-white shadow-lg",
                      isToday(day) && !isSelectedDate(day) && "border-2 border-primary font-bold",
                      day && !isToday(day) && !isSelectedDate(day) && "bg-white dark:bg-zinc-900"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <div className="mt-4 text-sm">
                <p className="font-semibold">{formatDate(currentDate)}</p>
                <p className="text-xs text-muted-foreground">{students.length} students</p>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Attendance & Topics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            {students.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <Card className="shadow-md border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.present}</p>
                      <p className="text-xs font-medium text-muted-foreground">Present</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-md border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.absent}</p>
                      <p className="text-xs font-medium text-muted-foreground">Absent</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-md border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.late}</p>
                      <p className="text-xs font-medium text-muted-foreground">Late</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Topic Completion Section */}
            {syllabusList.length > 0 && (
              <Card className="shadow-lg border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <CardTitle className="text-lg">Today's Topics</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">{syllabusList.length} topics</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {syllabusList.map(topic => (
                      <div key={topic.id} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-800 hover:shadow-md transition-shadow">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{topic.topic}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={topic.completion_percentage || 0} className="h-1.5 flex-1" />
                            <span className="text-xs font-bold text-muted-foreground w-8 text-right">{topic.completion_percentage || 0}%</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTopic(topic);
                            setTopicPercentage(topic.completion_percentage || 0);
                            setShowTopicDialog(true);
                          }}
                          className="ml-2"
                        >
                          <BookOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Students Attendance */}
            {!loading && !error && students.length > 0 && (
              <Card className="shadow-lg border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Mark Attendance
                      <span className="text-sm font-medium text-muted-foreground ml-2">({students.length} students)</span>
                    </CardTitle>
                    {canMark && (
                      <Button
                        onClick={handleSave}
                        disabled={saving || Object.values(attendance).every(s => s === null)}
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {students.map((student, index) => (
                      <div
                        key={student.id}
                        className="flex justify-between items-center p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-zinc-900 hover:shadow-md transition-shadow animate-scale-in"
                        style={{ animationDelay: `${index * 15}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{student.name}</p>
                            <p className="text-xs text-muted-foreground">Roll: {student.roll_number}</p>
                          </div>
                        </div>
                        {canMark ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleAttendance(student.id, 'present')}
                              className={cn("h-9 w-9 p-0 rounded-lg transition-all", attendance[student.id] === 'present' && "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600")}
                              title="Present"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleAttendance(student.id, 'absent')}
                              className={cn("h-9 w-9 p-0 rounded-lg transition-all", attendance[student.id] === 'absent' && "bg-red-500 text-white border-red-500 hover:bg-red-600")}
                              title="Absent"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleAttendance(student.id, 'late')}
                              className={cn("h-9 w-9 p-0 rounded-lg transition-all", attendance[student.id] === 'late' && "bg-amber-500 text-white border-amber-500 hover:bg-amber-600")}
                              title="Late"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className={cn("text-xs font-bold px-2.5 py-1.5 rounded-lg capitalize",
                            attendance[student.id] ? getStatusColor(attendance[student.id]) : "bg-muted text-muted-foreground"
                          )}>
                            {attendance[student.id] || 'Not marked'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center h-40 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Loading...</p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="flex flex-col items-center justify-center h-40 text-center gap-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-6">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="text-muted-foreground text-sm">{error}</p>
              </div>
            )}

            {!loading && !error && students.length === 0 && selectedClassId && (
              <div className="text-center py-12 rounded-lg bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800">
                <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground text-sm">No active students in this class.</p>
              </div>
            )}
          </div>
        </div>

        {/* Topic Completion Dialog */}
        <Dialog open={showTopicDialog} onOpenChange={setShowTopicDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Topic Progress</DialogTitle>
              <DialogDescription>
                Mark how much of "{selectedTopic?.topic}" was completed in today's class
              </DialogDescription>
            </DialogHeader>
            {selectedTopic && (
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Completion Percentage</label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={topicPercentage}
                      onChange={(e) => setTopicPercentage(Number(e.target.value))}
                      className="flex-1"
                    />
                    <div className="text-right">
                      <span className="text-2xl font-bold text-primary">{topicPercentage}%</span>
                    </div>
                  </div>
                  <Progress value={topicPercentage} className="mt-2" />
                </div>
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {[0, 25, 50, 75, 100].map(pct => (
                    <Button
                      key={pct}
                      variant={topicPercentage === pct ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTopicPercentage(pct)}
                    >
                      {pct}%
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTopicDialog(false)}>Cancel</Button>
              <Button onClick={handleUpdateTopic} disabled={saving} className="bg-primary hover:bg-primary/90">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Classes for Date Dialog */}
        <Dialog open={showClassesDialog} onOpenChange={setShowClassesDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">
                Classes on {selectedDateForClasses ? selectedDateForClasses.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : ''}
              </DialogTitle>
              <DialogDescription>
                {selectedDateForClasses && getDayOfWeekName(selectedDateForClasses)} — All scheduled classes
              </DialogDescription>
            </DialogHeader>
            
            {loadingClasses ? (
              <div className="flex items-center justify-center h-40 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Loading classes...</p>
              </div>
            ) : classesForDate.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground text-sm">No classes scheduled for this date</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto py-4">
                {classesForDate.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex flex-col p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 hover:shadow-md transition-shadow animate-scale-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                            Period {entry.period_number}
                          </span>
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {entry.start_time} - {entry.end_time}
                          </span>
                        </div>
                        <p className="font-bold text-lg">
                          {entry.class_name} {entry.section}
                        </p>
                        <div className="flex gap-4 mt-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Subject:</span>
                            <p className="font-semibold text-blue-700 dark:text-blue-300">{entry.subject_name || 'Not assigned'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Teacher:</span>
                            <p className="font-semibold text-green-700 dark:text-green-300">{entry.teacher_name || 'Not assigned'}</p>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowClassesDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
