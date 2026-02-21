import { useState, useEffect } from "react";
import { GraduationCap, Users, UserCheck, DollarSign, Calendar, Loader2, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { RecentStudents } from "@/components/dashboard/RecentStudents";
import { NoticeBoard } from "@/components/dashboard/NoticeBoard";
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";
import { getDashboardStats } from "@/lib/api";

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
  recentStudents: any[];
  recentNotices: any[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            <p className="text-foreground font-semibold mb-1">Connection Error</p>
            <p className="text-muted-foreground text-sm max-w-md">{error}</p>
            <p className="text-muted-foreground/60 text-xs mt-2">Please ensure the backend server is running on port 3001.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const stats = data?.stats;

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Welcome back! Here's an overview of your institution.
          </p>
        </div>

        {/* Stats Grid — staggered entrance */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            title="Total Students"
            value={stats?.totalStudents?.toLocaleString() || '0'}
            subtitle="Across all classes"
            icon={GraduationCap}
            variant="primary"
            trend={{ value: 5.2, isPositive: true }}
            delay={0}
          />
          <StatCard
            title="Total Teachers"
            value={stats?.totalTeachers || 0}
            subtitle="Active faculty"
            icon={Users}
            variant="accent"
            delay={50}
          />
          <StatCard
            title="Avg. Attendance"
            value={`${stats?.averageAttendance || 0}%`}
            subtitle="This month"
            icon={UserCheck}
            trend={{ value: 2.1, isPositive: true }}
            delay={100}
          />
          <StatCard
            title="Total Parents"
            value={stats?.totalParents?.toLocaleString() || '0'}
            subtitle="Registered"
            icon={Users}
            delay={150}
          />
          <StatCard
            title="Pending Fees"
            value={`₹${((stats?.pendingFees || 0) / 1000).toFixed(0)}k`}
            subtitle="To be collected"
            icon={DollarSign}
            delay={200}
          />
          <StatCard
            title="Upcoming Events"
            value={stats?.upcomingEvents || 0}
            subtitle="This month"
            icon={Calendar}
            delay={250}
          />
        </div>

        {/* AI Insight — Admin */}
        <AIInsightCard
          data={{
            attendance: stats?.averageAttendance || 92,
            avgScore: 76,
            assignmentCompletion: 82,
            recentTrend: "improving",
            topSubject: "Mathematics",
            weakSubject: "Biology",
          }}
          role="admin"
          showAdminToggle
        />

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AttendanceChart data={data?.attendanceData} />
          <PerformanceChart data={data?.performanceData} />
        </div>

        {/* Bottom Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentStudents students={data?.recentStudents} />
          <NoticeBoard notices={data?.recentNotices} />
        </div>
      </div>
    </DashboardLayout>
  );
}
