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
import { getStudents, getClasses, markAttendance as markAttendanceApi, getAttendance, getAttendanceSummary, getMyStudentProfile } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AttendanceCalendar } from "@/components/student/AttendanceCalendar";
import type { Student, Class as ClassType, AttendanceRecord } from "@/types";

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | null;

/* ══════════════════════════════════════════════
   Student / Parent view — shows their own attendance
   ══════════════════════════════════════════════ */
function StudentAttendanceView() {
  const [summary, setSummary] = useState<{ total: number; present: number; absent: number; late: number; percentage: number } | null>(null);
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
            <Card className="shadow-card border-border/40 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative flex items-center justify-center">
                    <svg width={100} height={100} className="transform -rotate-90">
                      <circle cx={50} cy={50} r={42} fill="none" stroke="currentColor" strokeWidth={8} className="text-muted/40" />
                      <circle
                        cx={50} cy={50} r={42} fill="none"
                        stroke="currentColor" strokeWidth={8}
                        strokeDasharray={2 * Math.PI * 42}
                        strokeDashoffset={2 * Math.PI * 42 - (Math.min(percentage, 100) / 100) * 2 * Math.PI * 42}
                        strokeLinecap="round"
                        className={`${percentage >= 90 ? 'text-green-500' : percentage >= 75 ? 'text-amber-500' : 'text-destructive'} transition-all duration-1000 ease-out`}
                      />
                    </svg>
                    <span className={`absolute text-2xl font-bold ${percentage >= 90 ? 'text-green-600' : percentage >= 75 ? 'text-amber-600' : 'text-destructive'}`}>
                      {percentage}%
                    </span>
                  </div>
                  <div className="flex-1 space-y-3 w-full">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Overall Attendance</p>
                      <p className="text-xs text-muted-foreground">{total} school days recorded</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Present</span>
                        <span className="text-xs font-medium text-green-600">{present} days</span>
                      </div>
                      <Progress value={total > 0 ? (present / total) * 100 : 0} className="h-2 [&>div]:bg-green-500" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Absent</span>
                        <span className="text-xs font-medium text-destructive">{absent} days</span>
                      </div>
                      <Progress value={total > 0 ? (absent / total) * 100 : 0} className="h-2 [&>div]:bg-destructive" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="shadow-card border-border/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-600">{present}</p>
                    <p className="text-xs text-muted-foreground">Present</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card border-border/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-destructive">{absent}</p>
                    <p className="text-xs text-muted-foreground">Absent</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card border-border/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-amber-600">{late}</p>
                    <p className="text-xs text-muted-foreground">Late</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card border-border/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-primary" />
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
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select Class" /></SelectTrigger>
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
        <Card className="shadow-card border-border/40">
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
          <div className="grid grid-cols-3 gap-4">
            <Card className="shadow-card border-border/40">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Check className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{stats.present}</p>
                  <p className="text-sm text-muted-foreground">Present</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-border/40">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <X className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{stats.absent}</p>
                  <p className="text-sm text-muted-foreground">Absent</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-border/40">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{stats.late}</p>
                  <p className="text-sm text-muted-foreground">Late</p>
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
          <Card className="shadow-card border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Mark Attendance — {selectedClass ? `${selectedClass.name} ${selectedClass.section}` : ''}
                <span className="text-sm font-normal text-muted-foreground ml-2">({students.length} students)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {students.map((student, index) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors animate-scale-in"
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline" size="sm"
                          onClick={() => toggleAttendance(student.id, 'present')}
                          className={cn("h-9 w-9 p-0 rounded-lg", attendance[student.id] === 'present' && getStatusColor('present'))}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          onClick={() => toggleAttendance(student.id, 'absent')}
                          className={cn("h-9 w-9 p-0 rounded-lg", attendance[student.id] === 'absent' && getStatusColor('absent'))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          onClick={() => toggleAttendance(student.id, 'late')}
                          className={cn("h-9 w-9 p-0 rounded-lg", attendance[student.id] === 'late' && getStatusColor('late'))}
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
