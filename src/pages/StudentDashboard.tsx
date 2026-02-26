import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import {
  BookOpen, Calendar, Clock, GraduationCap, TrendingUp, TrendingDown,
  FileText, Loader2, AlertCircle, ChevronRight, Target, Award,
  Zap, User, CalendarDays, ArrowRight, CheckCircle2, XCircle,
  RefreshCw,
} from "lucide-react";
import { SubjectPerformance } from "@/components/student/SubjectPerformance";
import { AssignmentsPanel } from "@/components/student/AssignmentsPanel";
import { NotificationsWidget } from "@/components/student/NotificationsWidget";
import { TeacherFeedback } from "@/components/student/TeacherFeedback";
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from "recharts";
import { getStudentDashboard, getTimetable, getAttendanceSubjectWise } from "@/lib/api";

interface StudentData {
  name: string;
  email?: string;
  roll_number?: string;
  parent_name?: string;
  parent_phone?: string;
  class_id?: string;
  class_name?: string;
  class_section?: string;
  academic_year_name?: string;
}
interface AttSummary { total: number; present: number; percentage: number }
interface ExamRow { subject_name?: string; marks_obtained?: number; max_marks?: number; exam_name?: string }
interface AssignmentRow { id: string; title: string; subject_name?: string; due_date: string; submission_status?: string | null }
interface RemarkRow { id: string; teacher_name?: string; content: string; remark_type?: string; created_at?: string }
interface NoticeRow { id: string; title: string; date?: string; created_at?: string; priority?: string }
interface TimetableRow { id: string; subject_name?: string; teacher_name?: string; room?: string; start_time?: string; end_time?: string; period_number: number; day_of_week: number }

/* ─── Helpers ─── */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getAttendanceColor(pct: number): string {
  if (pct >= 90) return "text-green-600";
  if (pct >= 75) return "text-amber-500";
  return "text-destructive";
}

function getScoreColor(pct: number): string {
  if (pct >= 80) return "text-green-600";
  if (pct >= 60) return "text-amber-500";
  return "text-destructive";
}

/** SVG circular progress ring */
function CircularProgress({ value, size = 52, strokeWidth = 5, color }: { value: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/60" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="currentColor" strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        className={`${color} transition-all duration-1000 ease-out`}
      />
    </svg>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [attSummary, setAttSummary] = useState<AttSummary>({ total: 0, present: 0, percentage: 0 });
  const [recentExams, setRecentExams] = useState<ExamRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [remarks, setRemarks] = useState<RemarkRow[]>([]);
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [todayClasses, setTodayClasses] = useState<TimetableRow[]>([]);
  const [subjectStats, setSubjectStats] = useState<{ name: string; percentage: number; present: number; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const jsDay = new Date().getDay();
      const schemaDay = jsDay === 0 ? 6 : jsDay - 1;

      const [dashRes, ttRes, attRes] = await Promise.all([
        getStudentDashboard(),
        getTimetable({ day: String(schemaDay) }),
        getAttendanceSubjectWise(),
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

      if (attRes.success && attRes.data) {
        const stats = (attRes.data as { subjectWise: { subject_name: string; percentage: string; present: string; total_classes: string }[] }).subjectWise || [];
        setSubjectStats(stats.map(s => ({
          name: s.subject_name.length > 12 ? s.subject_name.substring(0, 10) + '...' : s.subject_name,
          percentage: parseFloat(s.percentage),
          present: parseInt(s.present),
          total: parseInt(s.total_classes)
        })));
      }

      if (ttRes.success && ttRes.data) {
        const entries = (ttRes.data as { timetable: TimetableRow[] }).timetable || [];
        setTodayClasses(entries.sort((a, b) => a.period_number - b.period_number));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── Derived stats ─── */
  const attendancePct = Number(attSummary.percentage) || 0;
  const totalDays = Number(attSummary.total) || 0;
  const presentDays = Number(attSummary.present) || 0;
  const absentDays = totalDays - presentDays;

  const avgScore = useMemo(() => {
    if (recentExams.length === 0) return 0;
    const total = recentExams.reduce((s, e) => s + ((e.marks_obtained ?? 0) / (e.max_marks || 100)) * 100, 0);
    return Math.round(total / recentExams.length);
  }, [recentExams]);

  const pendingAssignments = assignments.filter(a => !a.submission_status || a.submission_status === "pending").length;
  const completedAssignments = assignments.length - pendingAssignments;
  const assignmentCompletionPct = assignments.length > 0 ? Math.round((completedAssignments / assignments.length) * 100) : 0;

  const { topSubject, weakSubject } = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const e of recentExams) {
      if (!e.subject_name) continue;
      const prev = map.get(e.subject_name) || { total: 0, count: 0 };
      map.set(e.subject_name, { total: prev.total + ((e.marks_obtained ?? 0) / (e.max_marks || 100)) * 100, count: prev.count + 1 });
    }
    let best = { name: "—", avg: 0 };
    let worst = { name: "—", avg: 101 };
    for (const [name, { total, count }] of map) {
      const avg = total / count;
      if (avg > best.avg) best = { name, avg };
      if (avg < worst.avg) worst = { name, avg };
    }
    return { topSubject: best.name, weakSubject: worst.avg <= 100 ? worst.name : "—" };
  }, [recentExams]);

  /* ─── Current / next period ─── */
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayLabel = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

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

  const currentClass = todayClasses.find(c => periodStatus(c) === "ongoing");
  const nextClass = todayClasses.find(c => periodStatus(c) === "upcoming");

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-muted animate-spin border-t-primary" />
          </div>
          <p className="text-muted-foreground text-sm font-medium animate-pulse-slow">Loading your dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  /* ─── Error state ─── */
  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <p className="text-foreground font-semibold mb-1">Something went wrong</p>
            <p className="text-muted-foreground text-sm max-w-md">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const firstName = user?.name?.split(" ")[0] || student?.name?.split(" ")[0] || "Student";
  const classLabel = student?.class_name
    ? `${student.class_name}${student.class_section ? ` - ${student.class_section}` : ""}`
    : null;

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-6 page-enter">

          {/* ═══════════ HERO / WELCOME ═══════════ */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/15 p-6 md:p-8">
            {/* Decorative circles */}
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/5 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-accent/10 blur-2xl" />

            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground font-medium">{todayLabel}</p>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                  {getGreeting()}, {firstName}!
                </h1>
                <p className="text-muted-foreground text-sm flex items-center gap-2 flex-wrap">
                  {classLabel && (
                    <>
                      <Badge variant="secondary" className="text-xs font-medium">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {classLabel}
                      </Badge>
                    </>
                  )}
                  {student?.roll_number && (
                    <Badge variant="outline" className="text-xs">Roll #{student.roll_number}</Badge>
                  )}
                  {student?.academic_year_name && (
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      {student.academic_year_name}
                    </Badge>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => fetchData(true)}
                  disabled={refreshing}
                  className="h-9"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button size="sm" onClick={() => navigate("/profile")} className="h-9">
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  My Profile
                </Button>
              </div>
            </div>
          </div>

          {/* ═══════════ CURRENT / NEXT CLASS BANNER ═══════════ */}
          {(currentClass || nextClass) && (
            <Card className={`border-l-4 ${currentClass ? "border-l-green-500 bg-green-500/5" : "border-l-primary bg-primary/5"} animate-slide-in-up`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${currentClass ? "bg-green-500/15" : "bg-primary/15"}`}>
                    {currentClass ? <Zap className="h-5 w-5 text-green-600" /> : <Clock className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {currentClass ? "Currently in class" : "Up next"}
                      </p>
                      {currentClass && (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{(currentClass || nextClass)!.subject_name}</span>
                      {" — "}
                      {(currentClass || nextClass)!.teacher_name}
                      {(currentClass || nextClass)!.room && ` — Room ${(currentClass || nextClass)!.room}`}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground hidden sm:block">
                  {(currentClass || nextClass)!.start_time?.slice(0, 5)} – {(currentClass || nextClass)!.end_time?.slice(0, 5)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* ═══════════ STATS WITH CIRCULAR PROGRESS ═══════════ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Attendance */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 cursor-pointer" onClick={() => navigate("/attendance")}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary/15 transition-colors">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="relative flex items-center justify-center">
                        <CircularProgress value={attendancePct} color={getAttendanceColor(attendancePct)} />
                        <span className={`absolute text-xs font-bold ${getAttendanceColor(attendancePct)}`}>
                          {attendancePct}%
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{presentDays} present / {totalDays} total days</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm font-semibold text-foreground">Attendance</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {presentDays} of {totalDays} days
                </p>
              </CardContent>
            </Card>

            {/* Avg Score */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-accent/30 cursor-pointer" onClick={() => navigate("/exams")}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-accent/10 rounded-xl group-hover:bg-accent/15 transition-colors">
                    <Award className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="relative flex items-center justify-center">
                        <CircularProgress value={avgScore} color={getScoreColor(avgScore)} />
                        <span className={`absolute text-xs font-bold ${getScoreColor(avgScore)}`}>
                          {avgScore}%
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Based on {recentExams.length} exam(s)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm font-semibold text-foreground">Avg. Score</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {recentExams.length} exam{recentExams.length !== 1 ? "s" : ""} scored
                </p>
              </CardContent>
            </Card>

            {/* Assignments */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-orange-400/30 cursor-pointer" onClick={() => navigate("/assignments")}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-orange-500/10 rounded-xl group-hover:bg-orange-500/15 transition-colors">
                    <FileText className="h-5 w-5 text-orange-600" />
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="relative flex items-center justify-center">
                        <CircularProgress value={assignmentCompletionPct} color={pendingAssignments > 0 ? "text-orange-500" : "text-green-600"} />
                        <span className={`absolute text-xs font-bold ${pendingAssignments > 0 ? "text-orange-500" : "text-green-600"}`}>
                          {pendingAssignments}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{completedAssignments} done, {pendingAssignments} pending</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm font-semibold text-foreground">Pending Work</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {completedAssignments} of {assignments.length} done
                </p>
              </CardContent>
            </Card>

            {/* Classes Today */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-blue-400/30 cursor-pointer" onClick={() => navigate("/timetable")}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/15 transition-colors">
                    <CalendarDays className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-foreground">{todayClasses.length}</span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground">Classes Today</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {todayClasses.filter(c => periodStatus(c) === "completed").length} completed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ═══════════ QUICK ACTIONS ═══════════ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Timetable", icon: Clock, path: "/timetable", color: "text-blue-600 bg-blue-500/10 hover:bg-blue-500/15" },
              { label: "Attendance", icon: CheckCircle2, path: "/attendance", color: "text-green-600 bg-green-500/10 hover:bg-green-500/15" },
              { label: "Exams & Results", icon: Award, path: "/exams", color: "text-purple-600 bg-purple-500/10 hover:bg-purple-500/15" },
              { label: "Fee Status", icon: Target, path: "/fees", color: "text-amber-600 bg-amber-500/10 hover:bg-amber-500/15" },
            ].map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all duration-200 group text-left`}
              >
                <div className={`p-2 rounded-lg transition-colors ${action.color}`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{action.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>

          {/* ═══════════ AI INSIGHT ═══════════ */}
          <AIInsightCard
            data={{
              attendance: attendancePct,
              avgScore,
              assignmentCompletion: assignmentCompletionPct,
              recentTrend: avgScore >= 75 ? "improving" : avgScore >= 50 ? "stable" : "declining",
              topSubject,
              weakSubject,
            }}
            role="student"
          />

          {/* ═══════════ ATTENDANCE MINI + TOP/WEAK SUBJECT ═══════════ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Attendance Breakdown */}
            <Card className="md:col-span-1 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  Attendance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Present</span>
                  <span className="text-xs font-medium text-green-600">{presentDays} days</span>
                </div>
                <Progress value={totalDays > 0 ? (presentDays / totalDays) * 100 : 0} className="h-2 [&>div]:bg-green-500" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Absent</span>
                  <span className="text-xs font-medium text-destructive">{absentDays} days</span>
                </div>
                <Progress value={totalDays > 0 ? (absentDays / totalDays) * 100 : 0} className="h-2 [&>div]:bg-destructive" />

                <Separator />
                <Button variant="ghost" size="sm" className="w-full text-xs h-8" onClick={() => navigate("/attendance")}>
                  View Full Report <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Best Subject */}
            <Card className="border-border/40">
              <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full gap-2">
                <div className="p-3 rounded-2xl bg-green-500/10">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Strongest Subject</p>
                <p className="text-lg font-bold text-foreground">{topSubject}</p>
                <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700 border-green-500/20">Keep it up!</Badge>
              </CardContent>
            </Card>

            {/* Weak Subject */}
            <Card className="border-border/40">
              <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full gap-2">
                <div className="p-3 rounded-2xl bg-amber-500/10">
                  <TrendingDown className="h-6 w-6 text-amber-600" />
                </div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Needs Attention</p>
                <p className="text-lg font-bold text-foreground">{weakSubject}</p>
                <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-700 border-amber-500/20">Focus here</Badge>
              </CardContent>
            </Card>
          </div>

          {/* ═══════════ SCHEDULE + PERFORMANCE ═══════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Schedule */}
            <Card className="shadow-card border-border/40">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Today's Schedule
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate("/timetable")}>
                  Full Timetable <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {todayClasses.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-muted-foreground">No classes scheduled today</p>
                    <p className="text-xs text-muted-foreground/60">Enjoy your day off!</p>
                  </div>
                ) : (
                  todayClasses.map((cls, idx) => {
                    const status = periodStatus(cls);
                    return (
                      <div
                        key={cls.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${status === "ongoing"
                            ? "bg-green-500/5 border-green-500/30 shadow-sm"
                            : status === "completed"
                              ? "bg-muted/40 border-border/50 opacity-60"
                              : "bg-card border-border/50 hover:bg-muted/30 hover:shadow-sm"
                          }`}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${status === "ongoing"
                              ? "bg-green-500/15 text-green-700"
                              : status === "completed"
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary/10 text-primary"
                            }`}>
                            P{cls.period_number}
                          </div>
                          <div>
                            <p className={`font-medium ${status === "completed" ? "text-muted-foreground" : "text-foreground"}`}>
                              {cls.subject_name || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cls.teacher_name || "—"}{cls.room ? ` · Room ${cls.room}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              {cls.start_time?.slice(0, 5)} – {cls.end_time?.slice(0, 5)}
                            </p>
                          </div>
                          {status === "ongoing" && (
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                            </span>
                          )}
                          {status === "completed" && <CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
                          {status === "upcoming" && <Clock className="h-4 w-4 text-muted-foreground/50" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <SubjectPerformance exams={recentExams} />

              {/* Subject-Wise Attendance Chart */}
              {subjectStats.length > 0 && (
                <Card className="shadow-card border-border/40 hover:shadow-md transition-all duration-300">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-green-600" />
                      Attendance Trends
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate("/attendance")}>
                      Details <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px] w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectStats} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} dy={10} fontWeight={500} />
                          <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                          <RechartsTooltip
                            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-background border border-border/50 p-3 rounded-xl shadow-xl backdrop-blur-md">
                                    <p className="font-bold text-sm">{data.name}</p>
                                    <div className="mt-1 space-y-0.5">
                                      <p className="text-xs font-medium">Attendance: <span className={cn(
                                        "font-bold",
                                        data.percentage >= 75 ? "text-emerald-500" : data.percentage >= 60 ? "text-amber-500" : "text-red-500"
                                      )}>{data.percentage}%</span></p>
                                      <p className="text-[11px] text-muted-foreground">{data.present} of {data.total} classes attended</p>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="percentage" radius={[4, 4, 0, 0]} maxBarSize={45}>
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
            </div>
          </div>

          {/* ═══════════ ASSIGNMENTS + NOTICES ═══════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AssignmentsPanel assignments={assignments} />
            <NotificationsWidget notices={notices} />
          </div>

          {/* ═══════════ TEACHER FEEDBACK ═══════════ */}
          <TeacherFeedback remarks={remarks} />
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
