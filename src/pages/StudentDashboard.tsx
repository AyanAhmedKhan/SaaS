// ──────────────────────────────────────────────────────────────────────────────
// StudentDashboard — premium redesign v2
// ──────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import {
  BookOpen, Calendar, Clock, GraduationCap, TrendingUp,
  FileText, AlertCircle, ChevronRight, Target, Award,
  Zap, User, CalendarDays, CheckCircle2,
  RefreshCw, CheckCircle, HelpCircle, Flame, BarChart2, ArrowUpRight
} from "lucide-react";
import { SubjectPerformance } from "@/components/student/SubjectPerformance";
import { AssignmentsPanel } from "@/components/student/AssignmentsPanel";
import { NotificationsWidget } from "@/components/student/NotificationsWidget";
import { TeacherFeedback } from "@/components/student/TeacherFeedback";
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";
import { StudentAssignmentDetailsDialog } from "@/components/student/StudentAssignmentDetailsDialog";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from "recharts";
import { getStudentDashboard, getTimetable, getAttendanceSubjectWise, getExams } from "@/lib/api";
import type { Exam } from "@/types";

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
function CircularProgress({ value, size = 48, strokeWidth = 4.5, color }: { value: number; size?: number; strokeWidth?: number; color: string }) {
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

/** Colored SVG donut ring (uses stroke color directly, not currentColor) */
function DonutRing({ value, size = 56, sw = 5.5, color }: { value: number; size?: number; sw?: number; color: string }) {
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(value, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={sw} stroke="currentColor" className="text-muted/40" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={sw} stroke={color}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.47,1.64,.41,.8)" }} />
    </svg>
  );
}

/** Tiny sparkline bar chart */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <svg viewBox={`0 0 ${data.length * 8} 24`} className="w-16 h-5" preserveAspectRatio="none">
      {data.map((v, i) => {
        const h = Math.max(2, (v / max) * 22);
        return <rect key={i} x={i * 8} y={24 - h} width={6} height={h} rx={2} fill={color} opacity={i === data.length - 1 ? 1 : 0.4} />;
      })}
    </svg>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [attSummary, setAttSummary] = useState<AttSummary>({ total: 0, present: 0, percentage: 0 });
  const [recentExams, setRecentExams] = useState<ExamRow[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [remarks, setRemarks] = useState<RemarkRow[]>([]);
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [todayClasses, setTodayClasses] = useState<TimetableRow[]>([]);
  const [subjectStats, setSubjectStats] = useState<{ name: string; percentage: number; present: number; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const jsDay = new Date().getDay();
      const schemaDay = jsDay === 0 ? 6 : jsDay - 1;

      const [dashRes, ttRes, attRes, examRes] = await Promise.all([
        getStudentDashboard(),
        getTimetable({ day: String(schemaDay) }),
        getAttendanceSubjectWise(),
        getExams({ status: 'scheduled' }) // Fetch upcoming exams for the student's class
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

      if (examRes.success && examRes.data) {
        // the backend getExams naturally filters by the student's class if called by a student
        setUpcomingExams((examRes.data as { exams: Exam[] }).exams || []);
      }

      if (attRes.success && attRes.data) {
        const stats = (attRes.data as { subjectWise: { subject_name: string; percentage: string; present: string; total_classes: string }[] }).subjectWise || [];
        setSubjectStats(stats.map(s => ({
          name: s.subject_name.length > 10 ? s.subject_name.substring(0, 8) + '…' : s.subject_name,
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
  const todayLabel = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const todayLabelShort = now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

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
  const completedCount = todayClasses.filter(c => periodStatus(c) === "completed").length;

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
        <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4 px-4">
          <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-destructive" />
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

  /* color helpers */
  const attStroke = attendancePct >= 90 ? "#10b981" : attendancePct >= 75 ? "#f59e0b" : "#ef4444";
  const attText  = attendancePct >= 90 ? "text-emerald-600" : attendancePct >= 75 ? "text-amber-500" : "text-rose-600";
  const scoreStroke = avgScore >= 80 ? "#10b981" : avgScore >= 60 ? "#f59e0b" : "#ef4444";
  const scoreText   = avgScore >= 80 ? "text-emerald-600" : avgScore >= 60 ? "text-amber-500" : "text-rose-600";
  const scoreSpark  = recentExams.slice(-6).map(e => ((e.marks_obtained ?? 0) / (e.max_marks || 100)) * 100);

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-4 sm:space-y-6 page-enter pb-8">

          {/* ═══════════ HERO / WELCOME ═══════════ */}
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/15 p-4 sm:p-6 md:p-7">
            {/* Blobs */}
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Left: greeting + badges */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  <span className="sm:hidden">{todayLabelShort}</span>
                  <span className="hidden sm:inline">{todayLabel}</span>
                </p>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                  {getGreeting()}, {firstName}! 👋
                </h1>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {classLabel && (
                    <Badge variant="secondary" className="text-[10px] sm:text-xs font-medium bg-background/50 backdrop-blur">
                      <GraduationCap className="h-3 w-3 mr-1" />{classLabel}
                    </Badge>
                  )}
                  {student?.roll_number && (
                    <Badge variant="outline" className="text-[10px] sm:text-xs bg-background/50 backdrop-blur">Roll #{student.roll_number}</Badge>
                  )}
                  {student?.academic_year_name && (
                    <Badge variant="outline" className="text-[10px] sm:text-xs bg-background/50 backdrop-blur">{student.academic_year_name}</Badge>
                  )}
                </div>
              </div>

              {/* Right: attendance + score rings + buttons */}
              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                {/* Attendance ring */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-0.5 cursor-pointer" onClick={() => navigate("/attendance")}>
                      <div className="relative">
                        <DonutRing value={attendancePct} size={58} sw={5.5} color={attStroke} />
                        <span className={cn("absolute inset-0 flex items-center justify-center text-[11px] font-extrabold", attText)}>
                          {attendancePct}%
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Attend.</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{presentDays} present / {absentDays} absent of {totalDays} days</TooltipContent>
                </Tooltip>

                {/* Score ring */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-0.5 cursor-pointer" onClick={() => navigate("/exams")}>
                      <div className="relative">
                        <DonutRing value={avgScore} size={58} sw={5.5} color={scoreStroke} />
                        <span className={cn("absolute inset-0 flex items-center justify-center text-[11px] font-extrabold", scoreText)}>
                          {avgScore}%
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Score</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Avg across {recentExams.length} exams</TooltipContent>
                </Tooltip>

                <div className="flex flex-col gap-2 ml-1">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                    className="h-8 text-xs bg-background/50 backdrop-blur border-border/50"
                  >
                    <RefreshCw className={cn("h-3 w-3 mr-1.5", refreshing && "animate-spin")} />
                    Refresh
                  </Button>
                  <Button size="sm" onClick={() => navigate("/reports")} className="h-8 text-xs shadow-md shadow-primary/20">
                    <BarChart2 className="h-3 w-3 mr-1.5" /> Reports
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ CURRENT / NEXT CLASS & EXAMS ALERTS ═══════════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Class Alert */}
            {(currentClass || nextClass) ? (
              <Card className={`border-l-4 ${currentClass ? "border-l-green-500 bg-green-500/5" : "border-l-primary bg-primary/5"} animate-slide-in-up h-full flex flex-col justify-center`}>
                <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                    <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl shrink-0 ${currentClass ? "bg-green-500/15" : "bg-primary/15"}`}>
                      {currentClass ? <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" /> : <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <p className="font-semibold text-foreground text-sm sm:text-base truncate">
                          {currentClass ? "In class" : "Up next"}
                        </p>
                        {currentClass && (
                          <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-green-500" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        <span className="font-medium text-foreground">{(currentClass || nextClass)!.subject_name}</span>
                        <span className="hidden sm:inline">
                          {" — "}{(currentClass || nextClass)!.teacher_name}
                          {(currentClass || nextClass)!.room && ` — ${(currentClass || nextClass)!.room}`}
                        </span>
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-muted-foreground shrink-0 whitespace-nowrap bg-background/50 px-2 py-1 rounded-md border border-border/50">
                    {(currentClass || nextClass)!.start_time?.slice(0, 5)}–{(currentClass || nextClass)!.end_time?.slice(0, 5)}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="hidden md:block"></div>
            )}

            {/* Exam Alert Widget */}
            {upcomingExams.length > 0 && (
              <Card className="border-l-4 border-l-red-500 bg-red-500/5 animate-slide-in-up h-full flex flex-col justify-center cursor-pointer hover:bg-red-500/10 transition-colors" onClick={() => navigate("/exams")}>
                <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                    <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl shrink-0 bg-red-500/15">
                      <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <p className="font-semibold text-red-700 dark:text-red-400 text-sm sm:text-base truncate flex items-center gap-2">
                          Upcoming Exam
                          <Badge variant="outline" className="border-red-500/30 text-red-600 dark:text-red-400 text-[9px] uppercase tracking-wider scale-90 origin-left">
                            {upcomingExams[0].exam_type.replace('_', ' ')}
                          </Badge>
                        </p>
                      </div>
                      <p className="text-xs sm:text-sm text-red-600/80 dark:text-red-400/80 truncate">
                        <span className="font-medium">{upcomingExams[0].name}</span>
                        {upcomingExams[0].subject_name && ` — ${upcomingExams[0].subject_name}`}
                      </p>
                    </div>
                  </div>
                  {upcomingExams[0].exam_date && (
                    <div className="text-center shrink-0 bg-background/50 px-3 py-1.5 rounded-lg border border-red-500/20 shadow-sm">
                      <p className="text-[10px] uppercase font-bold text-red-600">
                        {new Date(upcomingExams[0].exam_date).toLocaleDateString('en-US', { month: 'short' })}
                      </p>
                      <p className="text-sm font-black text-foreground">
                        {new Date(upcomingExams[0].exam_date).getDate()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ═══════════ STATS GRID ═══════════ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">

            {/* Attendance */}
            <Card className="group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 border-border/40 hover:border-emerald-500/30 cursor-pointer overflow-hidden" onClick={() => navigate("/attendance")}>
              <div className="h-0.5 w-full bg-gradient-to-r from-emerald-400 to-teal-400" />
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                  </div>
                  <div className="relative flex items-center justify-center">
                    <CircularProgress value={attendancePct} size={42} strokeWidth={4.5} color={getAttendanceColor(attendancePct)} />
                    <span className={`absolute text-[10px] sm:text-[11px] font-extrabold ${getAttendanceColor(attendancePct)}`}>
                      {attendancePct}%
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm font-bold text-foreground">Attendance</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium">
                  {presentDays}/{totalDays} days
                </p>
                <div className="mt-2 flex gap-2">
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{presentDays}P
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-600 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />{absentDays}A
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Classes Today */}
            <Card className="group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 border-border/40 hover:border-blue-400/30 cursor-pointer overflow-hidden" onClick={() => navigate("/timetable")}>
              <div className="h-0.5 w-full bg-gradient-to-r from-blue-400 to-cyan-400" />
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform">
                    <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-foreground">{todayClasses.length}</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-foreground">Classes</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium">
                  {completedCount} done · {todayClasses.length - completedCount} to go
                </p>
                {todayClasses.length > 0 && (
                  <Progress value={(completedCount / todayClasses.length) * 100} className="mt-2.5 h-1 bg-blue-500/20" />
                )}
              </CardContent>
            </Card>

            {/* Assignments */}
            <Card className="group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 border-border/40 hover:border-orange-400/30 cursor-pointer overflow-hidden" onClick={() => navigate("/assignments")}>
              <div className="h-0.5 w-full bg-gradient-to-r from-orange-400 to-amber-400" />
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-orange-500/10 rounded-xl group-hover:scale-110 transition-transform">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  </div>
                  <div className="relative flex items-center justify-center">
                    <CircularProgress value={assignmentCompletionPct} size={42} strokeWidth={4.5} color={pendingAssignments > 0 ? "text-orange-500" : "text-green-600"} />
                    <span className={`absolute text-[10px] sm:text-[11px] font-extrabold ${pendingAssignments > 0 ? "text-orange-500" : "text-green-600"}`}>
                      {pendingAssignments}
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm font-bold text-foreground">Pending</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium">
                  {completedAssignments}/{assignments.length} submitted
                </p>
                <Progress value={assignmentCompletionPct} className="mt-2.5 h-1 bg-orange-500/20" />
              </CardContent>
            </Card>

            {/* Avg Score */}
            <Card className="group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 border-border/40 hover:border-violet-400/30 cursor-pointer overflow-hidden" onClick={() => navigate("/exams")}>
              <div className="h-0.5 w-full bg-gradient-to-r from-violet-400 to-purple-400" />
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-violet-500/10 rounded-xl group-hover:scale-110 transition-transform">
                    <Award className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600" />
                  </div>
                  {scoreSpark.length > 0
                    ? <Sparkline data={scoreSpark} color={scoreStroke} />
                    : (
                      <div className="relative flex items-center justify-center">
                        <CircularProgress value={avgScore} size={42} strokeWidth={4.5} color={getScoreColor(avgScore)} />
                        <span className={`absolute text-[10px] sm:text-[11px] font-extrabold ${getScoreColor(avgScore)}`}>
                          {avgScore}%
                        </span>
                      </div>
                    )
                  }
                </div>
                <p className="text-xs sm:text-sm font-bold text-foreground">Avg Score</p>
                <p className={cn("text-sm font-extrabold mt-0.5", scoreText)}>{avgScore}%</p>
                <p className="text-[10px] text-muted-foreground">across {recentExams.length} exams</p>
              </CardContent>
            </Card>

          </div>

          {/* ═══════════ QUICK ACTIONS ═══════════ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: "Timetable",  icon: Clock,       path: "/timetable",  accent: "hover:border-blue-400/40",   bg: "bg-blue-500/10",    text: "text-blue-600",    grad: "from-blue-500/10"    },
              { label: "Attendance", icon: CheckCircle, path: "/attendance", accent: "hover:border-emerald-400/40",bg: "bg-emerald-500/10", text: "text-emerald-600", grad: "from-emerald-500/10" },
              { label: "Exams",      icon: Award,       path: "/exams",      accent: "hover:border-violet-400/40", bg: "bg-violet-500/10",  text: "text-violet-600",  grad: "from-violet-500/10"  },
              { label: "Syllabus",   icon: BookOpen,    path: "/syllabus",   accent: "hover:border-amber-400/40",  bg: "bg-amber-500/10",   text: "text-amber-600",   grad: "from-amber-500/10"   },
            ].map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={cn(
                  "group relative flex items-center gap-2 sm:gap-3 p-3 sm:p-3.5 rounded-xl border border-border/50 bg-card hover:shadow-md active:scale-[0.97] transition-all duration-200 text-left overflow-hidden",
                  action.accent
                )}
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300", action.grad)} />
                <div className={cn("p-1.5 sm:p-2 rounded-lg shrink-0 group-hover:scale-110 transition-transform relative z-10", action.bg)}>
                  <action.icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", action.text)} />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate relative z-10">{action.label}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block relative z-10 shrink-0" />
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

          {/* ═══════════ ACADEMIC OVERVIEW ═══════════ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Best Subject */}
            <Card className="border-border/40 shadow-sm bg-gradient-to-br from-emerald-500/5 to-teal-500/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
              <div className="h-0.5 w-full bg-gradient-to-r from-emerald-400 to-teal-400" />
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <TrendingUp className="h-32 w-32" />
              </div>
              <CardContent className="p-5 flex flex-col justify-center h-full gap-2 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Award className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-700/80 dark:text-emerald-400/70">Strongest</p>
                </div>
                <p className="text-2xl font-black text-foreground">{topSubject}</p>
                <div className="flex items-center gap-1.5 mt-auto text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Excellent performance
                </div>
              </CardContent>
            </Card>

            {/* Weak Subject */}
            <Card className="border-border/40 shadow-sm bg-gradient-to-br from-amber-500/5 to-orange-500/5 relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
              <div className="h-0.5 w-full bg-gradient-to-r from-amber-400 to-orange-400" />
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <Flame className="h-32 w-32" />
              </div>
              <CardContent className="p-5 flex flex-col justify-center h-full gap-2 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Flame className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-amber-700/80 dark:text-amber-400/70">Focus Area</p>
                </div>
                <p className="text-2xl font-black text-foreground">{weakSubject}</p>
                <div className="flex items-center gap-1.5 mt-auto text-xs text-amber-700 dark:text-amber-400 font-semibold">
                  <HelpCircle className="h-3.5 w-3.5" /> Needs more attention
                </div>
              </CardContent>
            </Card>

            {/* Subject-Wise Attendance Chart Mini */}
            <Card className="border-border/40 shadow-sm md:col-span-1">
              <CardHeader className="pb-1 px-4 pt-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-primary" />
                    Attendance
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate("/attendance")}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {subjectStats.length > 0 ? (
                  <div className="h-[100px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectStats.slice(0, 5)} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} dy={5} />
                        <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="percentage" radius={[3, 3, 0, 0]} maxBarSize={20}>
                          {subjectStats.slice(0, 5).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.percentage >= 75 ? "hsl(var(--primary))" : entry.percentage >= 60 ? "#f59e0b" : "#ef4444"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[100px] flex items-center justify-center text-xs text-muted-foreground">Not enough data</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ═══════════ DETAILED PANELS ═══════════ */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">

            {/* Left Col: Exams & Subjects (Takes more space) */}
            <div className="xl:col-span-2 space-y-4 sm:space-y-6">
              <SubjectPerformance exams={recentExams} />

              {/* Upcoming Exams detailed list if available */}
              {upcomingExams.length > 0 && (
                <Card className="border-border/40 shadow-sm border-l-4 border-l-red-500 overflow-hidden">
                  <CardHeader className="pb-3 bg-red-500/5">
                    <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-red-700 dark:text-red-400">
                      <AlertCircle className="h-5 w-5" />
                      Upcoming Examinations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                      {upcomingExams.map(exam => (
                        <div key={exam.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-red-500/10 flex flex-col items-center justify-center border border-red-500/20 shrink-0">
                              <span className="text-[10px] uppercase font-bold text-red-600">{new Date(exam.exam_date!).toLocaleDateString('en-US', { month: 'short' })}</span>
                              <span className="text-sm font-black text-foreground leading-none">{new Date(exam.exam_date!).getDate()}</span>
                            </div>
                            <div>
                              <h4 className="font-bold text-foreground">{exam.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[10px] h-4 px-1 rounded-sm uppercase bg-background shadow-xs">{exam.exam_type.replace('_', ' ')}</Badge>
                                <span className="text-xs font-semibold text-muted-foreground">{exam.subject_name || exam.class_name}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-4 items-center shrink-0">
                            <div className="text-right hidden sm:block">
                              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Total</p>
                              <p className="text-sm font-bold text-foreground">{exam.total_marks}</p>
                            </div>
                            <Button size="sm" variant="outline" className="h-8 text-xs w-full sm:w-auto mt-2 sm:mt-0" onClick={() => navigate('/exams')}>View Details</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Col: Timeline & Notices */}
            <div className="space-y-4 sm:space-y-6">
              {/* Today's Schedule List */}
              <Card className="shadow-sm border-border/40">
                <CardHeader className="pb-2 sm:pb-3 flex flex-row items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 border-b border-border/30">
                  <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Today's Schedule
                  </CardTitle>
                  {todayClasses.length > 0 && (
                    <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {completedCount}/{todayClasses.length} done
                    </span>
                  )}
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  {todayClasses.length === 0 ? (
                    <div className="text-center py-6">
                      <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">No classes today</p>
                      <p className="text-xs text-muted-foreground mt-1">Enjoy your free time! 🎉</p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-muted pl-4 space-y-4 ml-2">
                      {todayClasses.map((cls) => {
                        const status = periodStatus(cls);

                        /* elapsed % for ongoing class */
                        let elapsed = 0;
                        if (status === "ongoing" && cls.start_time && cls.end_time) {
                          const [sh, sm2] = cls.start_time.split(":").map(Number);
                          const [eh, em2] = cls.end_time.split(":").map(Number);
                          const start = sh * 60 + sm2, end = eh * 60 + em2;
                          elapsed = Math.round(((nowMinutes - start) / (end - start)) * 100);
                        }

                        return (
                          <div key={cls.id} className="relative">
                            {/* Timeline Dot */}
                            <div className={cn(
                              "absolute -left-[21px] top-1.5 h-3 w-3 rounded-full border-2 border-background",
                              status === "ongoing"   ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)] animate-pulse" :
                              status === "completed" ? "bg-muted-foreground/30" : "bg-primary"
                            )} />

                            <div className={cn(
                              "rounded-xl p-3 border transition-colors",
                              status === "ongoing"   ? "bg-emerald-500/5 border-emerald-500/20" :
                              status === "completed" ? "bg-card/50 border-border/50 opacity-70" : "bg-card border-border/50 shadow-sm"
                            )}>
                              <div className="flex justify-between items-start mb-1 gap-2">
                                <h4 className={cn("text-xs font-bold", status === "completed" ? "text-muted-foreground" : "text-foreground")}>
                                  P{cls.period_number} · {cls.subject_name || "Free Period"}
                                </h4>
                                <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded shrink-0">
                                  {cls.start_time?.slice(0, 5)}–{cls.end_time?.slice(0, 5)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[10px] font-medium text-muted-foreground">
                                {cls.teacher_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{cls.teacher_name}</span>}
                                {cls.room && <span className="flex items-center gap-1"><Target className="h-3 w-3" />{cls.room}</span>}
                              </div>
                              {status === "ongoing" && (
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="flex items-center gap-1 font-bold text-emerald-600">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" /> In session
                                    </span>
                                    <span className="text-muted-foreground font-semibold">{elapsed}% elapsed</span>
                                  </div>
                                  <Progress value={elapsed} className="h-1 bg-emerald-500/20" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <AssignmentsPanel
                assignments={assignments}
                onClick={(id) => {
                  setSelectedAssignmentId(id);
                  setDetailsOpen(true);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6">
            <NotificationsWidget notices={notices} />
            <TeacherFeedback remarks={remarks} />
          </div>

        </div>
      </TooltipProvider>

      <StudentAssignmentDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        assignmentId={selectedAssignmentId}
        onSuccess={fetchData}
      />
    </DashboardLayout>
  );
}
