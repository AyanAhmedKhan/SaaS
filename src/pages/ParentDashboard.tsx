import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";
import {
  Calendar,
  CreditCard,
  TrendingUp,
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  MessageSquare,
  BookOpen,
  FileText,
  GraduationCap,
  CalendarDays,
  ClipboardList,
  Users,
  IndianRupee,
  ChevronRight,
  AlertTriangle,
  Target,
  Award,
  Sparkles,
} from "lucide-react";
import { getParentDashboard } from "@/lib/api";
import { useNavigate } from "react-router-dom";

// ═══════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════

interface ChildStudent {
  id: string;
  name: string;
  class_name?: string;
  section?: string;
  roll_number?: string;
}

interface ChildAttendance {
  total: number;
  present: number;
  pct: number;
}

interface ExamRow {
  marks_obtained?: number;
  max_marks?: number;
  exam_name?: string;
  subject_name?: string;
  exam_date?: string;
}

interface RemarkRow {
  id: string;
  content: string;
  created_at?: string;
  teacher_name?: string;
}

interface AssignmentRow {
  id: string;
  title: string;
  due_date: string;
  subject_name?: string;
  status: 'submitted' | 'pending';
  submitted_at?: string;
  marks_obtained?: number;
  max_marks?: number;
}

interface FeeSummary {
  total_fees: number;
  paid_count: number;
  total_paid: number;
  pending_amount: number;
}

interface UpcomingExam {
  id: string;
  name: string;
  exam_date: string;
  subject_name?: string;
  syllabus_topics?: string;
}

interface ChildData {
  student: ChildStudent;
  attendance: ChildAttendance;
  recentExams: ExamRow[];
  recentRemarks: RemarkRow[];
  assignments: AssignmentRow[];
  feeSummary: FeeSummary;
  upcomingExams: UpcomingExam[];
}

interface NoticeRow {
  id: string;
  title: string;
  date?: string;
  priority?: string;
  content?: string;
}

interface EventRow {
  id: string;
  name: string;
  holiday_date: string;
  reason?: string;
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getParentDashboard();
      if (res.success && res.data) {
        const d = res.data as { children: ChildData[]; notices: NoticeRow[]; upcomingEvents: EventRow[] };
        setChildren(d.children || []);
        setNotices(d.notices || []);
        setUpcomingEvents(d.upcomingEvents || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Calculate aggregate stats across all children
  const aggregateStats = useMemo(() => {
    const totalPending = children.reduce((sum, c) => sum + (parseFloat(String(c.feeSummary?.pending_amount)) || 0), 0);
    const totalAssignments = children.reduce((sum, c) => sum + (c.assignments?.length || 0), 0);
    const pendingAssignments = children.reduce((sum, c) => sum + (c.assignments?.filter(a => a.status === 'pending').length || 0), 0);
    const avgAttendance = children.length > 0 
      ? children.reduce((sum, c) => sum + (Number(c.attendance?.pct) || 0), 0) / children.length 
      : 0;
    return { totalPending, totalAssignments, pendingAssignments, avgAttendance };
  }, [children]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          </div>
          <p className="text-muted-foreground text-sm">Loading your dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
          <div className="p-4 rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <p className="font-medium text-foreground">Unable to load dashboard</p>
            <p className="text-muted-foreground text-sm mt-1">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            Try Again
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* ═══════════════ Welcome Header ═══════════════ */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white shadow-xl">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-white/20">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-white/80">Parent Portal</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  Welcome, {user?.name?.split(" ")[0] || "Parent"}!
                </h1>
                <p className="text-emerald-100 mt-1">
                  Track your child's academic progress and stay connected with the school
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                  <p className="text-2xl font-bold">{children.length}</p>
                  <p className="text-xs text-white/80">Children</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                  <p className="text-2xl font-bold">{Math.round(aggregateStats.avgAttendance)}%</p>
                  <p className="text-xs text-white/80">Attendance</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                  <p className="text-2xl font-bold">{aggregateStats.pendingAssignments}</p>
                  <p className="text-xs text-white/80">Pending Tasks</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════ Quick Summary Cards ═══════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Children</p>
                  <p className="text-2xl font-bold">{children.length}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-500/10">
                  <GraduationCap className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Attendance</p>
                  <p className="text-2xl font-bold">{Math.round(aggregateStats.avgAttendance)}%</p>
                </div>
                <div className="p-3 rounded-full bg-green-500/10">
                  <Calendar className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Tasks</p>
                  <p className="text-2xl font-bold">{aggregateStats.pendingAssignments}/{aggregateStats.totalAssignments}</p>
                </div>
                <div className="p-3 rounded-full bg-amber-500/10">
                  <ClipboardList className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-l-4 hover:shadow-lg transition-shadow ${
            aggregateStats.totalPending > 0 ? 'border-l-red-500' : 'border-l-emerald-500'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Fees</p>
                  <p className="text-2xl font-bold">₹{aggregateStats.totalPending.toLocaleString('en-IN')}</p>
                </div>
                <div className={`p-3 rounded-full ${
                  aggregateStats.totalPending > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'
                }`}>
                  <IndianRupee className={`h-6 w-6 ${
                    aggregateStats.totalPending > 0 ? 'text-red-500' : 'text-emerald-500'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══════════════ Children Tabs or Single View ═══════════════ */}
        {children.length === 0 ? (
          <Card className="shadow-lg border-dashed border-2">
            <CardContent className="py-16 text-center">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Children Linked</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                No children are currently linked to your account. Please contact the school administration for assistance.
              </p>
            </CardContent>
          </Card>
        ) : children.length === 1 ? (
          <ChildView 
            child={children[0]} 
            notices={notices} 
            upcomingEvents={upcomingEvents}
            navigate={navigate} 
          />
        ) : (
          <Tabs defaultValue={children[0].student.id} className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto p-1 bg-muted/50">
              {children.map((c) => (
                <TabsTrigger 
                  key={c.student.id} 
                  value={c.student.id}
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {c.student.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {c.student.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {children.map((c) => (
              <TabsContent key={c.student.id} value={c.student.id}>
                <ChildView 
                  child={c} 
                  notices={notices} 
                  upcomingEvents={upcomingEvents}
                  navigate={navigate} 
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}

// ═══════════════════════════════════════════
// CHILD VIEW COMPONENT
// ═══════════════════════════════════════════

function ChildView({
  child,
  notices,
  upcomingEvents,
  navigate,
}: {
  child: ChildData;
  notices: NoticeRow[];
  upcomingEvents: EventRow[];
  navigate: (to: string) => void;
}) {
  const { student, attendance, recentExams, recentRemarks, assignments, feeSummary, upcomingExams } = child;
  const attPct = Number(attendance?.pct) || 0;
  const present = Number(attendance?.present) || 0;
  const total = Number(attendance?.total) || 0;

  const avgScore = useMemo(() => {
    if (!recentExams || recentExams.length === 0) return 0;
    const s = recentExams.reduce((acc, e) => acc + ((e.marks_obtained ?? 0) / (e.max_marks || 100)) * 100, 0);
    return Math.round(s / recentExams.length);
  }, [recentExams]);

  // Group exams by subject
  const subjects = useMemo(() => {
    if (!recentExams) return [];
    const map = new Map<string, { total: number; count: number }>();
    for (const e of recentExams) {
      if (!e.subject_name) continue;
      const prev = map.get(e.subject_name) || { total: 0, count: 0 };
      map.set(e.subject_name, { 
        total: prev.total + ((e.marks_obtained ?? 0) / (e.max_marks || 100)) * 100, 
        count: prev.count + 1 
      });
    }
    return Array.from(map.entries()).map(([name, { total: t, count }]) => ({
      name,
      score: Math.round(t / count),
    })).sort((a, b) => b.score - a.score);
  }, [recentExams]);

  const topSubject = subjects.length > 0 ? subjects[0].name : "—";
  const weakSubject = subjects.length > 1 ? subjects[subjects.length - 1].name : "—";

  const pendingAssignments = assignments?.filter(a => a.status === 'pending') || [];
  const submittedAssignments = assignments?.filter(a => a.status === 'submitted') || [];

  const totalFees = Number(feeSummary?.total_fees) || 0;
  const paidFees = Number(feeSummary?.paid_count) || 0;
  const pendingAmount = parseFloat(String(feeSummary?.pending_amount)) || 0;
  const totalPaid = parseFloat(String(feeSummary?.total_paid)) || 0;

  const priorityColors: Record<string, { dot: string; border: string; bg: string; text: string }> = {
    urgent: { dot: "bg-red-500", border: "border-red-500/30", bg: "bg-red-500/5", text: "text-red-600" },
    high: { dot: "bg-red-500", border: "border-red-500/30", bg: "bg-red-500/5", text: "text-red-600" },
    medium: { dot: "bg-amber-500", border: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-600" },
    low: { dot: "bg-green-500", border: "border-green-500/30", bg: "bg-green-500/5", text: "text-green-600" },
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", { 
      day: "numeric", 
      month: "short", 
      year: "numeric" 
    });
  };

  const daysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff < 0) return "Overdue";
    return `${diff} days`;
  };

  return (
    <div className="space-y-6">
      {/* ═══════════════ Child Info Card ═══════════════ */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-20 w-20 ring-4 ring-primary/20 shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-2xl font-bold">
                {student.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-foreground">{student.name}</h2>
                <Badge variant="secondary" className="text-xs">
                  {student.roll_number ? `Roll: ${student.roll_number}` : "Active"}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {student.class_name ? `Class ${student.class_name}` : ""}
                {student.section ? ` - Section ${student.section}` : ""}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  attPct >= 80 ? 'text-green-600' : attPct >= 60 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {attPct}%
                </div>
                <p className="text-xs text-muted-foreground">Attendance</p>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  avgScore >= 80 ? 'text-green-600' : avgScore >= 60 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {avgScore}%
                </div>
                <p className="text-xs text-muted-foreground">Avg. Score</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{recentExams?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Recent Exams</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ═══════════════ AI Insight ═══════════════ */}
      <AIInsightCard
        data={{
          attendance: attPct,
          avgScore,
          assignmentCompletion: assignments?.length ? Math.round((submittedAssignments.length / assignments.length) * 100) : 0,
          recentTrend: avgScore >= 75 ? "improving" : avgScore >= 50 ? "stable" : "declining",
          topSubject,
          weakSubject,
        }}
        role="parent"
        studentId={student.id}
      />

      {/* ═══════════════ Quick Actions ═══════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
              onClick={() => navigate("/attendance")}
            >
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-xs">View Attendance</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
              onClick={() => navigate("/exams")}
            >
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-xs">Exam Results</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
              onClick={() => navigate("/fees")}
            >
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="text-xs">Pay Fees</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
              onClick={() => navigate("/assignments")}
            >
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="text-xs">Assignments</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════ Main Grid ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Summary */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Attendance Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Present</span>
                <span className="font-medium">{present}/{total} days</span>
              </div>
              <Progress 
                value={attPct} 
                className={`h-3 ${
                  attPct >= 80 ? '[&>div]:bg-green-500' : 
                  attPct >= 60 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'
                }`} 
              />
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              attPct >= 80 ? 'bg-green-500/10 border-green-500/30' :
              attPct >= 60 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'
            }`}>
              {attPct >= 80 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : attPct >= 60 ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">{attPct}% Overall</p>
                <p className="text-xs text-muted-foreground">
                  {attPct >= 80 ? 'Excellent attendance!' : attPct >= 60 ? 'Needs improvement' : 'Critical - Action needed'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/attendance")}>
              View Detailed Report
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {/* Fee Summary */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Fee Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-lg font-bold text-green-600">₹{totalPaid.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">{paidFees} payments</p>
              </div>
              <div className={`p-3 rounded-lg border ${
                pendingAmount > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'
              }`}>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className={`text-lg font-bold ${pendingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{pendingAmount.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pendingAmount > 0 ? 'Due soon' : 'All cleared'}
                </p>
              </div>
            </div>
            {totalFees > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Progress</span>
                  <span className="font-medium">{paidFees}/{totalFees}</span>
                </div>
                <Progress 
                  value={totalFees > 0 ? (paidFees / totalFees) * 100 : 0} 
                  className="h-2 [&>div]:bg-green-500" 
                />
              </div>
            )}
            <Button 
              variant={pendingAmount > 0 ? "default" : "outline"} 
              size="sm" 
              className="w-full" 
              onClick={() => navigate("/fees")}
            >
              {pendingAmount > 0 ? "Pay Now" : "View History"}
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {/* Subject Performance */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Subject Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <div className="text-center py-6">
                <Target className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No exam data yet.</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px] pr-2">
                <div className="space-y-3">
                  {subjects.map((subject, idx) => (
                    <div key={subject.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <Award className="h-4 w-4 text-amber-500" />}
                          <span className="text-sm font-medium text-foreground">{subject.name}</span>
                        </div>
                        <span className={`text-sm font-semibold ${
                          subject.score >= 80 ? 'text-green-600' : 
                          subject.score >= 60 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {subject.score}%
                        </span>
                      </div>
                      <Progress
                        value={subject.score}
                        className={`h-2 ${
                          subject.score >= 80 ? "[&>div]:bg-green-500" :
                          subject.score >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════ Assignments & Upcoming Exams ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignments */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Assignments
              </CardTitle>
              <CardDescription>
                {pendingAssignments.length} pending, {submittedAssignments.length} submitted
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/assignments")}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {(!assignments || assignments.length === 0) ? (
              <div className="text-center py-6">
                <ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No assignments yet.</p>
              </div>
            ) : (
              <ScrollArea className="h-[220px]">
                <div className="space-y-3 pr-2">
                  {assignments.slice(0, 6).map((assignment) => {
                    const isPending = assignment.status === 'pending';
                    const isOverdue = isPending && new Date(assignment.due_date) < new Date();
                    return (
                      <div 
                        key={assignment.id} 
                        className={`p-3 rounded-lg border ${
                          isOverdue ? 'bg-red-500/5 border-red-500/30' :
                          isPending ? 'bg-amber-500/5 border-amber-500/30' :
                          'bg-green-500/5 border-green-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {assignment.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {assignment.subject_name || "General"}
                            </p>
                          </div>
                          <Badge 
                            variant={isPending ? (isOverdue ? "destructive" : "secondary") : "default"}
                            className="shrink-0"
                          >
                            {isOverdue ? 'Overdue' : isPending ? 'Pending' : 'Done'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Due: {formatDate(assignment.due_date)}</span>
                          {!isPending && assignment.marks_obtained !== undefined && (
                            <span className="ml-auto text-green-600 font-medium">
                              Score: {assignment.marks_obtained}/{assignment.max_marks}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Exams */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Upcoming Exams
              </CardTitle>
              <CardDescription>
                {upcomingExams?.length || 0} exams scheduled
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/exams")}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {(!upcomingExams || upcomingExams.length === 0) ? (
              <div className="text-center py-6">
                <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming exams.</p>
              </div>
            ) : (
              <ScrollArea className="h-[220px]">
                <div className="space-y-3 pr-2">
                  {upcomingExams.map((exam) => {
                    const days = daysUntil(exam.exam_date);
                    const isUrgent = days === "Today" || days === "Tomorrow";
                    return (
                      <div 
                        key={exam.id} 
                        className={`p-3 rounded-lg border ${
                          isUrgent ? 'bg-amber-500/10 border-amber-500/30' : 'bg-blue-500/5 border-blue-500/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {exam.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {exam.subject_name || "General"}
                            </p>
                          </div>
                          <Badge variant={isUrgent ? "secondary" : "outline"} className="shrink-0">
                            {days}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          <span>{formatDate(exam.exam_date)}</span>
                        </div>
                        {exam.syllabus_topics && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            Syllabus: {exam.syllabus_topics}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════ Teacher Remarks ═══════════════ */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Recent Teacher Remarks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!recentRemarks || recentRemarks.length === 0) ? (
            <div className="text-center py-6">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No remarks yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentRemarks.map((r) => (
                <div key={r.id} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <p className="text-sm text-foreground/80 line-clamp-3">{r.content}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    {r.teacher_name && (
                      <span className="text-xs font-medium text-primary">{r.teacher_name}</span>
                    )}
                    {r.created_at && (
                      <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════ Notices & Events Grid ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notices */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Important Notices
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/notices")}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {notices.length === 0 ? (
              <div className="text-center py-6">
                <Bell className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent notices.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notices.slice(0, 4).map((notice) => {
                  const p = priorityColors[notice.priority || "low"] || priorityColors.low;
                  return (
                    <div 
                      key={notice.id} 
                      className={`p-3 rounded-lg border ${p.border} ${p.bg} hover:shadow-sm transition-shadow`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${p.dot}`} />
                        <span className={`text-xs font-medium uppercase ${p.text}`}>
                          {notice.priority || "info"}
                        </span>
                        {notice.date && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDate(notice.date)}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-sm text-foreground">{notice.title}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Upcoming Holidays & Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-6">
                <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming events.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 4).map((event) => (
                  <div 
                    key={event.id} 
                    className="flex items-center gap-4 p-3 rounded-lg border bg-purple-500/5 border-purple-500/20"
                  >
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-purple-500/20 text-purple-600">
                      <span className="text-lg font-bold leading-none">
                        {new Date(event.holiday_date).getDate()}
                      </span>
                      <span className="text-[10px] uppercase">
                        {new Date(event.holiday_date).toLocaleDateString("en-IN", { month: "short" })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{event.name}</p>
                      {event.reason && (
                        <p className="text-xs text-muted-foreground truncate">{event.reason}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {daysUntil(event.holiday_date)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
