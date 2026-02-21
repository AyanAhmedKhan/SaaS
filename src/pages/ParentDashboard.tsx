import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { getParentDashboard } from "@/lib/api";
import { useNavigate } from "react-router-dom";

interface ChildStudent {
  id: string;
  name: string;
  class_name?: string;
  section?: string;
  roll_number?: string;
}
interface ChildAttendance { total: number; present: number; pct: number }
interface ExamRow { marks_obtained?: number; max_marks?: number; exam_name?: string; subject_name?: string }
interface RemarkRow { id: string; content: string; created_at?: string }
interface ChildData {
  student: ChildStudent;
  attendance: ChildAttendance;
  recentExams: ExamRow[];
  recentRemarks: RemarkRow[];
}
interface NoticeRow { id: string; title: string; date?: string; priority?: string; content?: string }

/* ──────────────────────── */
export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getParentDashboard();
      if (res.success && res.data) {
        const d = res.data as { children: ChildData[]; notices: NoticeRow[] };
        setChildren(d.children || []);
        setNotices(d.notices || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
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
            Welcome, {user?.name?.split(" ")[0] || "Parent"}!
          </h1>
          <p className="text-muted-foreground">
            Track your child's academic progress and stay connected
          </p>
        </div>

        {/* Children Tabs (or single child view) */}
        {children.length === 0 ? (
          <Card className="shadow-card border-border/40">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-sm">No children linked to your account yet.</p>
            </CardContent>
          </Card>
        ) : children.length === 1 ? (
          <ChildView child={children[0]} notices={notices} navigate={navigate} />
        ) : (
          <Tabs defaultValue={children[0].student.id} className="space-y-4">
            <TabsList>
              {children.map(c => (
                <TabsTrigger key={c.student.id} value={c.student.id}>{c.student.name}</TabsTrigger>
              ))}
            </TabsList>
            {children.map(c => (
              <TabsContent key={c.student.id} value={c.student.id}>
                <ChildView child={c} notices={notices} navigate={navigate} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ============================
   Per-child view
   ============================ */
function ChildView({
  child,
  notices,
  navigate,
}: {
  child: ChildData;
  notices: NoticeRow[];
  navigate: (to: string) => void;
}) {
  const { student, attendance, recentExams, recentRemarks } = child;
  const attPct = Number(attendance?.pct) || 0;
  const present = Number(attendance?.present) || 0;
  const total = Number(attendance?.total) || 0;

  const avgScore = useMemo(() => {
    if (recentExams.length === 0) return 0;
    const s = recentExams.reduce((acc, e) => acc + ((e.marks_obtained ?? 0) / (e.max_marks || 100)) * 100, 0);
    return Math.round(s / recentExams.length);
  }, [recentExams]);

  // Group exams by subject for the performance section
  const subjects = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const e of recentExams) {
      if (!e.subject_name) continue;
      const prev = map.get(e.subject_name) || { total: 0, count: 0 };
      map.set(e.subject_name, { total: prev.total + ((e.marks_obtained ?? 0) / (e.max_marks || 100)) * 100, count: prev.count + 1 });
    }
    return Array.from(map.entries()).map(([name, { total: t, count }]) => ({
      name,
      score: Math.round(t / count),
    }));
  }, [recentExams]);

  const topSubject = subjects.reduce((b, s) => (s.score > b.score ? s : b), { name: "—", score: 0 }).name;

  const priorityColors: Record<string, { dot: string; border: string; bg: string; text: string }> = {
    urgent: { dot: "bg-red-500", border: "border-red-500/30", bg: "bg-red-500/5", text: "text-red-600" },
    high: { dot: "bg-red-500", border: "border-red-500/30", bg: "bg-red-500/5", text: "text-red-600" },
    medium: { dot: "bg-amber-500", border: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-600" },
    low: { dot: "bg-green-500", border: "border-green-500/30", bg: "bg-green-500/5", text: "text-green-600" },
  };

  return (
    <div className="space-y-6">
      {/* Child Info Card */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-20 w-20 ring-4 ring-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {student.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{student.name}</h2>
              <p className="text-muted-foreground">
                {student.class_name ? `Class ${student.class_name}` : ""}{student.section ? ` ${student.section}` : ""}
                {student.roll_number ? ` • Roll No: ${student.roll_number}` : ""}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{attPct}%</p>
                <p className="text-xs text-muted-foreground">Attendance</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent-foreground">{avgScore}%</p>
                <p className="text-xs text-muted-foreground">Avg. Score</p>
              </div>
              <div className="text-center hidden md:block">
                <p className="text-2xl font-bold text-foreground">{recentExams.length}</p>
                <p className="text-xs text-muted-foreground">Recent Exams</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insight */}
      <AIInsightCard
        data={{
          attendance: attPct,
          avgScore,
          assignmentCompletion: 0,
          recentTrend: avgScore >= 75 ? "improving" : avgScore >= 50 ? "stable" : "declining",
          topSubject,
          weakSubject: "—",
        }}
        role="parent"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Summary */}
        <Card className="shadow-card border-border/40">
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
              <Progress value={attPct} className="h-3" />
            </div>
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-foreground">{attPct}% Overall</p>
                <p className="text-xs text-muted-foreground">{present} out of {total} school days</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/attendance")}>
              View Detailed Report
            </Button>
          </CardContent>
        </Card>

        {/* Subject Performance */}
        <Card className="shadow-card border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Subject Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No exam data yet.</p>
            ) : (
              subjects.map((subject) => (
                <div key={subject.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{subject.name}</span>
                    <span className="text-sm text-muted-foreground">{subject.score}%</span>
                  </div>
                  <Progress
                    value={subject.score}
                    className={`h-2 ${
                      subject.score >= 80 ? "[&>div]:bg-green-500" :
                      subject.score >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"
                    }`}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Teacher Remarks */}
        <Card className="shadow-card border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Recent Remarks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentRemarks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No remarks yet.</p>
            ) : (
              recentRemarks.map((r) => (
                <div key={r.id} className="p-3 rounded-lg border bg-card space-y-1">
                  <p className="text-sm text-foreground/80">{r.content}</p>
                  {r.created_at && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notices Section */}
      <Card className="shadow-card border-border/40">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Important Notices
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/notices")}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {notices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No recent notices.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {notices.slice(0, 3).map((notice) => {
                const p = priorityColors[notice.priority || "low"] || priorityColors.low;
                return (
                  <div key={notice.id} className={`p-4 rounded-lg border ${p.border} ${p.bg}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${p.dot}`} />
                      <span className={`text-xs font-medium ${p.text}`}>{notice.priority || "info"}</span>
                    </div>
                    <p className="font-medium text-foreground">{notice.title}</p>
                    {notice.date && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(notice.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
