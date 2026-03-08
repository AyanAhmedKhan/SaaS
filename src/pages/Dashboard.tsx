import { useState, useEffect, useMemo } from "react";
import {
  GraduationCap, Users, UserCheck, IndianRupee, CalendarClock,
  Loader2, AlertCircle, ArrowRight,
  ClipboardList, Bell, Megaphone, UserPlus, Receipt,
  LayoutGrid, School
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { RecentStudents } from "@/components/dashboard/RecentStudents";
import { NoticeBoard } from "@/components/dashboard/NoticeBoard";
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getDashboardStats } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Notice } from "@/types";

interface ClassOverviewItem {
  id: string;
  name: string;
  section: string;
  student_count: number;
  class_teacher_name: string | null;
}

interface DashboardData {
  stats: {
    totalStudents: number;
    totalTeachers: number;
    totalParents: number;
    averageAttendance: number;
    pendingFees: number;
    upcomingEvents: number;
  };
  attendanceData: { month: string; attendance: number }[];
  performanceData: { subject: string; score: number }[];
  recentStudents?: { id: string; name: string; class_name?: string; section?: string; roll_number?: string; attendance?: number }[];
  recentNotices?: Notice[];
  classOverview?: ClassOverviewItem[];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatINR(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${n.toLocaleString('en-IN')}`;
}

// ── Quick Action Card ──
function QuickAction({ icon: Icon, label, description, onClick, color }: {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-200 text-left w-full"
    >
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 shrink-0",
        color
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground/40 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ── Class Overview Card ──
function ClassOverviewCard({ classes }: { classes: ClassOverviewItem[] }) {
  const displayClasses = classes.slice(0, 6);
  const totalStudents = classes.reduce((sum, c) => sum + Number(c.student_count), 0);

  return (
    <Card className="shadow-card border-border/50 hover:shadow-card-hover transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-primary" />
            Class Overview
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {classes.length} classes · {totalStudents} students
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {displayClasses.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No classes configured yet
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {displayClasses.map((cls, index) => (
              <div
                key={cls.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors animate-slide-in-up"
                style={{ animationDelay: `${index * 40}ms`, opacity: 0 }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm shrink-0">
                  {cls.name.replace(/class\s*/i, '').slice(0, 3)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">
                      {cls.name}{cls.section ? ` - ${cls.section}` : ''}
                    </p>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {cls.student_count}
                    </Badge>
                  </div>
                  {cls.class_teacher_name && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      CT: {cls.class_teacher_name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {classes.length > 6 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            +{classes.length - 6} more classes
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Attendance Health Indicator ──
function AttendanceHealthBar({ rate }: { rate: number }) {
  const getStatus = (r: number) => {
    if (r >= 90) return { bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Excellent" };
    if (r >= 80) return { bg: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", label: "Good" };
    if (r >= 70) return { bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", label: "Needs Attention" };
    return { bg: "bg-red-500", text: "text-red-500", label: "Critical" };
  };
  const status = getStatus(rate);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Institute Attendance Health</span>
        <span className={cn("text-xs font-semibold", status.text)}>{status.label} — {rate}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", status.bg)}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const greeting = useMemo(() => getGreeting(), []);
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }), []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getDashboardStats();
        if (response.success && response.data) {
          setData(response.data as DashboardData);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard';
        console.error('[Dashboard] Error:', message);
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-muted animate-spin border-t-primary" />
          </div>
          <p className="text-muted-foreground text-sm font-medium animate-pulse-slow">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <p className="text-foreground font-semibold mb-1">Dashboard Error</p>
            <p className="text-muted-foreground text-sm max-w-md">{error}</p>
            {error.includes('Unable to connect') && (
              <p className="text-muted-foreground/60 text-xs mt-2">Please ensure the backend server is running and accessible.</p>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const stats = data?.stats;
  const firstName = user?.name?.split(' ')[0] || 'Admin';

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">

        {/* ── Header with greeting ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {greeting}, {firstName}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">{todayStr}</p>
          </div>
          <Badge variant="outline" className="text-xs font-medium gap-1.5 w-fit">
            <School className="h-3 w-3" />
            Institute Admin
          </Badge>
        </div>

        {/* ── Key Metrics Grid ── */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            title="Students"
            value={stats?.totalStudents?.toLocaleString() || '0'}
            subtitle="Active enrolled"
            icon={GraduationCap}
            variant="primary"
            delay={0}
          />
          <StatCard
            title="Teachers"
            value={stats?.totalTeachers || 0}
            subtitle="Active faculty"
            icon={Users}
            variant="accent"
            delay={50}
          />
          <StatCard
            title="Parents"
            value={stats?.totalParents || 0}
            subtitle="Registered"
            icon={UserCheck}
            delay={100}
          />
          <StatCard
            title="Attendance"
            value={`${stats?.averageAttendance || 0}%`}
            subtitle="Overall average"
            icon={ClipboardList}
            variant={
              (stats?.averageAttendance || 0) >= 85 ? "success" :
              (stats?.averageAttendance || 0) >= 70 ? "warning" : "default"
            }
            delay={150}
          />
          <StatCard
            title="Pending Fees"
            value={formatINR(stats?.pendingFees || 0)}
            subtitle="To be collected"
            icon={IndianRupee}
            variant={(stats?.pendingFees || 0) > 100000 ? "warning" : "default"}
            delay={200}
          />
          <StatCard
            title="Today's Notices"
            value={stats?.upcomingEvents || 0}
            subtitle="Published today"
            icon={Megaphone}
            delay={250}
          />
        </div>

        {/* ── Attendance Health Bar ── */}
        <Card className="shadow-card border-border/50">
          <CardContent className="py-4 px-6">
            <AttendanceHealthBar rate={stats?.averageAttendance || 0} />
          </CardContent>
        </Card>

        {/* ── Quick Actions ── */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <QuickAction
              icon={UserPlus}
              label="Add Student"
              description="Enroll a new student"
              color="bg-primary/10 text-primary"
              onClick={() => navigate('/students')}
            />
            <QuickAction
              icon={CalendarClock}
              label="Mark Attendance"
              description="Today's attendance"
              color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              onClick={() => navigate('/attendance')}
            />
            <QuickAction
              icon={Receipt}
              label="Collect Fees"
              description="Record payments"
              color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
              onClick={() => navigate('/fees')}
            />
            <QuickAction
              icon={Bell}
              label="Post Notice"
              description="Send announcements"
              color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
              onClick={() => navigate('/notices')}
            />
          </div>
        </div>

        {/* ── AI Insight ── */}
        <AIInsightCard
          data={{
            attendance: stats?.averageAttendance || 0,
            avgScore: 76,
            assignmentCompletion: 82,
            recentTrend: "improving",
            topSubject: "Mathematics",
            weakSubject: "Biology",
          }}
          role="admin"
          showAdminToggle
        />

        {/* ── Charts Row ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AttendanceChart data={data?.attendanceData} />
          <PerformanceChart data={data?.performanceData} />
        </div>

        {/* ── Class Overview + Notice Board ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {data?.classOverview && data.classOverview.length > 0 ? (
            <ClassOverviewCard classes={data.classOverview} />
          ) : (
            <RecentStudents students={data?.recentStudents} />
          )}
          <NoticeBoard notices={data?.recentNotices} />
        </div>

        {/* ── Recent Students (shown below if class overview is above) ── */}
        {data?.classOverview && data.classOverview.length > 0 && (
          <RecentStudents students={data?.recentStudents} />
        )}
      </div>
    </DashboardLayout>
  );
}
