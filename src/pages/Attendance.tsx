import { useState, useEffect, useCallback } from "react";
import { Calendar, Check, X, Clock, ChevronLeft, ChevronRight, Loader2, AlertCircle, Save, GraduationCap, CheckCircle2, XCircle } from "lucide-react";
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
import { getStudents, getClasses, markAttendance as markAttendanceApi, getAttendance, getAttendanceSummary, getAttendanceSubjectWise, getMyStudentProfile } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AttendanceCalendar } from "@/components/student/AttendanceCalendar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Student, Class as ClassType, AttendanceRecord } from "@/types";

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
  const [selectedClassId, setSelectedClassId] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Load students + existing attendance when class or date changes
  const fetchData = useCallback(async () => {
    if (!selectedClassId) return;
    try {
      setLoading(true);
      setError(null);

      const [studentRes, attRes] = await Promise.all([
        getStudents({ class_id: selectedClassId, status: 'active' }),
        getAttendance({ class_id: selectedClassId, date: dateStr }),
      ]);

      if (studentRes.success && studentRes.data) {
        setStudents((studentRes.data as { students: Student[] }).students || []);
      }

      // Prefill attendance from existing records
      const existing: Record<string, AttendanceStatus> = {};
      if (attRes.success && attRes.data) {
        const records = (attRes.data as { records: AttendanceRecord[] }).records || [];
        records.forEach(r => {
          existing[r.student_id] = r.status as AttendanceStatus;
        });
      }
      setAttendance(existing);
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
    date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    if (d <= new Date()) setCurrentDate(d);
  };

  const toggleAttendance = (studentId: string, status: AttendanceStatus) => {
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

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return 'bg-emerald-500 text-white';
      case 'absent': return 'bg-destructive text-destructive-foreground';
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

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Attendance</h1>
            <p className="text-muted-foreground text-sm">Track and manage student attendance records.</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-[180px] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-white/20"><SelectValue placeholder="Select Class" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canMark && (
              <Button
                onClick={handleSave}
                disabled={saving || Object.values(attendance).every(s => s === null)}
                className="rounded-xl bg-gradient-to-r from-primary to-blue-600"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Attendance
              </Button>
            )}
          </div>
        </div>

        {/* Date Navigation */}
        <Card className="shadow-lg border-white/20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={prevDay}><ChevronLeft className="h-5 w-5" /></Button>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-semibold">{formatDate(currentDate)}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={nextDay} disabled={currentDate >= new Date()}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {students.length > 0 && (
          <div className="grid grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <Card className="shadow-xl border-white/20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.present}</p>
                  <p className="text-sm font-medium text-muted-foreground">Present</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-xl border-white/20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <X className="h-6 w-6 text-red-500 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-black text-red-500 dark:text-red-400">{stats.absent}</p>
                  <p className="text-sm font-medium text-muted-foreground">Absent</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-xl border-white/20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-500 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-black text-amber-500 dark:text-amber-400">{stats.late}</p>
                  <p className="text-sm font-medium text-muted-foreground">Late</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading students...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive/60" />
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        )}

        {/* Student List */}
        {!loading && !error && students.length > 0 && (
          <Card className="shadow-xl border-white/20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Mark Attendance — {selectedClass ? `${selectedClass.name} ${selectedClass.section}` : ''}
                <span className="text-sm font-medium text-muted-foreground ml-2">({students.length} students)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {students.map((student, index) => (
                  <div
                    key={student.id}
                    className="flex justify-between items-center p-3 sm:p-4 rounded-2xl border border-white/20 bg-white/40 dark:bg-zinc-800/40 hover:bg-white/60 dark:hover:bg-zinc-800/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-scale-in"
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{student.name}</p>
                        <p className="text-xs text-muted-foreground">Roll: {student.roll_number}</p>
                      </div>
                    </div>
                    {canMark ? (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Button
                          variant="outline" size="sm"
                          onClick={() => toggleAttendance(student.id, 'present')}
                          className={cn("h-10 w-10 p-0 rounded-full transition-transform hover:scale-110", attendance[student.id] === 'present' && getStatusColor('present'))}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          onClick={() => toggleAttendance(student.id, 'absent')}
                          className={cn("h-10 w-10 p-0 rounded-full transition-transform hover:scale-110", attendance[student.id] === 'absent' && getStatusColor('absent'))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          onClick={() => toggleAttendance(student.id, 'late')}
                          className={cn("h-10 w-10 p-0 rounded-full transition-transform hover:scale-110", attendance[student.id] === 'late' && getStatusColor('late'))}
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className={cn("text-xs font-medium px-2 py-1 rounded-md capitalize",
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

        {!loading && !error && students.length === 0 && selectedClassId && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">No active students in this class.</p>
          </div>
        )}

        {/* Attendance Calendar */}
        <AttendanceCalendar
          classId={selectedClassId || undefined}
        />
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
