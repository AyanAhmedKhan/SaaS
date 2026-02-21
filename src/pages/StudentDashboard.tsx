import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, Calendar, Clock, GraduationCap, TrendingUp, FileText, Loader2, AlertCircle } from "lucide-react";
import { StudentProfile } from "@/components/student/StudentProfile";
import { SubjectPerformance } from "@/components/student/SubjectPerformance";
import { AssignmentsPanel } from "@/components/student/AssignmentsPanel";
import { NotificationsWidget } from "@/components/student/NotificationsWidget";
import { AttendanceHistory } from "@/components/student/AttendanceHistory";
import { TeacherFeedback } from "@/components/student/TeacherFeedback";
import { AIPlaceholders } from "@/components/student/AIPlaceholders";
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";
import { getStudentDashboard, getTimetable } from "@/lib/api";

interface StudentData {
  name: string;
  email?: string;
  roll_number?: string;
  parent_name?: string;
  parent_phone?: string;
  class_id?: string;
}
interface AttSummary { total: number; present: number; percentage: number }
interface ExamRow { subject_name?: string; marks_obtained?: number; max_marks?: number; exam_name?: string }
interface AssignmentRow { id: string; title: string; subject_name?: string; due_date: string; submission_status?: string | null }
interface RemarkRow { id: string; teacher_name?: string; content: string; remark_type?: string; created_at?: string }
interface NoticeRow { id: string; title: string; date?: string; created_at?: string; priority?: string }
interface TimetableRow { id: string; subject_name?: string; teacher_name?: string; room?: string; start_time?: string; end_time?: string; period_number: number; day_of_week: number }

export default function StudentDashboard() {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [attSummary, setAttSummary] = useState<AttSummary>({ total: 0, present: 0, percentage: 0 });
  const [recentExams, setRecentExams] = useState<ExamRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [remarks, setRemarks] = useState<RemarkRow[]>([]);
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [todayClasses, setTodayClasses] = useState<TimetableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get today's day of week (schema: 0=Monday...6=Sunday)
      const jsDay = new Date().getDay(); // 0=Sun 1=Mon
      const schemaDay = jsDay === 0 ? 6 : jsDay - 1;

      const [dashRes, ttRes] = await Promise.all([
        getStudentDashboard(),
        getTimetable({ day: String(schemaDay) }),
      ]);

      if (dashRes.success && dashRes.data) {
        const d = dashRes.data as {
          student: StudentData;
          attendanceSummary: AttSummary;
          recentExams: ExamRow[];
          upcomingAssignments: AssignmentRow[];
          recentRemarks: RemarkRow[];
          notices: NoticeRow[];
        };
        setStudent(d.student || null);
        setAttSummary(d.attendanceSummary || { total: 0, present: 0, percentage: 0 });
        setRecentExams(d.recentExams || []);
        setAssignments(d.upcomingAssignments || []);
        setRemarks(d.recentRemarks || []);
        setNotices(d.notices || []);
      }

      if (ttRes.success && ttRes.data) {
        const entries = (ttRes.data as { timetable: TimetableRow[] }).timetable || [];
        setTodayClasses(entries.sort((a, b) => a.period_number - b.period_number));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── Derived stats ─── */
  const attendancePct = Number(attSummary.percentage) || 0;
  const avgScore = useMemo(() => {
    if (recentExams.length === 0) return 0;
    const total = recentExams.reduce((s, e) => s + ((e.marks_obtained ?? 0) / (e.max_marks || 100)) * 100, 0);
    return Math.round(total / recentExams.length);
  }, [recentExams]);
  const pendingAssignments = assignments.filter(a => !a.submission_status || a.submission_status === "pending").length;

  const topSubject = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const e of recentExams) {
      if (!e.subject_name) continue;
      const prev = map.get(e.subject_name) || { total: 0, count: 0 };
      map.set(e.subject_name, { total: prev.total + ((e.marks_obtained ?? 0) / (e.max_marks || 100)) * 100, count: prev.count + 1 });
    }
    let best = { name: "—", avg: 0 };
    for (const [name, { total, count }] of map) {
      const avg = total / count;
      if (avg > best.avg) best = { name, avg };
    }
    return best.name;
  }, [recentExams]);

  /* ─── Determine current period ─── */
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  function periodStatus(entry: TimetableRow): "completed" | "ongoing" | "upcoming" {
    if (!entry.start_time || !entry.end_time) return "upcoming";
    const [sh, sm] = entry.start_time.split(":").map(Number);
    const [eh, em] = entry.end_time.split(":").map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (nowMinutes >= end) return "completed";
    if (nowMinutes >= start) return "ongoing";
    return "upcoming";
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading your dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive/60" />
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Welcome Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Welcome back, {user?.name?.split(" ")[0] || student?.name?.split(" ")[0] || "Student"}!
          </h1>
          <p className="text-muted-foreground">Here's your academic overview for today</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{attendancePct}%</p>
                  <p className="text-xs text-muted-foreground">Attendance</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{avgScore}%</p>
                  <p className="text-xs text-muted-foreground">Avg. Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/20 rounded-lg">
                  <FileText className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{pendingAssignments}</p>
                  <p className="text-xs text-muted-foreground">Pending Work</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-muted to-muted/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted-foreground/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{todayClasses.length}</p>
                  <p className="text-xs text-muted-foreground">Classes Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insight */}
        <AIInsightCard
          data={{
            attendance: attendancePct,
            avgScore,
            assignmentCompletion: assignments.length > 0 ? Math.round(((assignments.length - pendingAssignments) / assignments.length) * 100) : 0,
            recentTrend: avgScore >= 75 ? "improving" : avgScore >= 50 ? "stable" : "declining",
            topSubject,
            weakSubject: "—",
          }}
          role="student"
        />

        {/* Student Profile */}
        {student && <StudentProfile student={student} />}

        {/* Schedule + Subject Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No classes scheduled today.</p>
              ) : (
                todayClasses.map((cls) => {
                  const status = periodStatus(cls);
                  return (
                    <div
                      key={cls.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        status === "ongoing"
                          ? "bg-primary/5 border-primary/30"
                          : status === "completed"
                          ? "bg-muted/50 border-border"
                          : "bg-card border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${status === "ongoing" ? "bg-primary/20" : "bg-muted"}`}>
                          <BookOpen className={`h-4 w-4 ${status === "ongoing" ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{cls.subject_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{cls.teacher_name || "—"}{cls.room ? ` - ${cls.room}` : ""}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {cls.start_time?.slice(0, 5)} - {cls.end_time?.slice(0, 5)}
                        </p>
                        <Badge
                          variant={status === "ongoing" ? "default" : status === "completed" ? "secondary" : "outline"}
                          className="text-xs mt-1"
                        >
                          {status}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <SubjectPerformance exams={recentExams} />
        </div>

        {/* Assignments + Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AssignmentsPanel assignments={assignments} />
          <div className="space-y-6">
            <NotificationsWidget notices={notices} />
            <AttendanceHistory summary={attSummary} />
          </div>
        </div>

        {/* Teacher Feedback */}
        <TeacherFeedback remarks={remarks} />

        {/* AI Placeholders */}
        <AIPlaceholders />
      </div>
    </DashboardLayout>
  );
}
