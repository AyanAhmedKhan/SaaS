import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  GraduationCap,
  Layers,
  Plus,
  RefreshCcw,
  Server,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getSuperAdminDashboard, getPlans } from "@/lib/api";
import type { SubscriptionPlan } from "@/types";

interface InstituteSummary {
  [key: string]: string;
  status: string;
  c: string;
}

interface UserSummary {
  [key: string]: string;
  role: string;
  c: string;
}

interface SubscriptionDistribution {
  plan: string;
  instituteCount: number;
  monthlyPrice: number;
  monthlyRevenue: number;
}

interface RecentInstitute {
  id: string;
  name: string;
  code: string;
  city?: string;
  status: string;
  subscription_plan: string;
  created_at: string;
  student_count: number;
  teacher_count: number;
}

interface SystemActivity {
  action: string;
  count: string;
  last_occurrence: string;
}

interface MonthlyGrowth {
  month: string;
  newInstitutes: number;
}

interface SuperAdminStats {
  instituteSummary: InstituteSummary[];
  userSummary: UserSummary[];
  totalActiveStudents: number;
  revenue?: {
    mrr: number;
    arr: number;
    subscriptionDistribution: SubscriptionDistribution[];
  };
  recentInstitutes?: RecentInstitute[];
  systemActivity?: SystemActivity[];
  monthlyGrowth?: MonthlyGrowth[];
  alerts?: {
    expiringSoon: number;
    suspendedInstitutes: number;
  };
}

function countFromSummary(list: { [key: string]: string }[], key: string, value: string) {
  const found = list.find((row) => row[key] === value);
  return parseInt(found?.c || "0", 10);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-slate-500',
  professional: 'bg-blue-500',
  enterprise: 'bg-purple-500',
  'ai-pro': 'bg-gradient-to-r from-violet-500 to-purple-500',
};

const ACTION_ICONS: Record<string, string> = {
  CREATE: '🆕',
  UPDATE: '✏️',
  DELETE: '🗑️',
  LOGIN: '🔐',
  LOGOUT: '🚪',
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [overviewRes, plansRes] = await Promise.all([
        getSuperAdminDashboard(),
        getPlans(true),
      ]);

      if (!overviewRes.success || !overviewRes.data) {
        throw new Error("Failed to load dashboard data");
      }

      setStats(overviewRes.data as SuperAdminStats);
      if (plansRes.success && plansRes.data?.plans) {
        setPlans(plansRes.data.plans);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load dashboard";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const computed = useMemo(() => {
    const instituteSummary = stats?.instituteSummary || [];
    const userSummary = stats?.userSummary || [];

    const activeInstitutes = countFromSummary(instituteSummary, "status", "active");
    const suspendedInstitutes = countFromSummary(instituteSummary, "status", "suspended");
    const archivedInstitutes = countFromSummary(instituteSummary, "status", "archived");
    const trialInstitutes = countFromSummary(instituteSummary, "status", "trial");
    const totalInstitutes = activeInstitutes + suspendedInstitutes + archivedInstitutes + trialInstitutes;

    const facultyCount = countFromSummary(userSummary, "role", "faculty");
    const instituteAdmins = countFromSummary(userSummary, "role", "institute_admin");
    const parentCount = countFromSummary(userSummary, "role", "parent");
    const studentUsers = countFromSummary(userSummary, "role", "student");
    const totalUsers = userSummary.reduce((acc, row) => acc + parseInt(row.c || "0", 10), 0);

    const activeRate = totalInstitutes > 0 ? Math.round((activeInstitutes / totalInstitutes) * 100) : 0;

    return {
      totalInstitutes,
      activeInstitutes,
      suspendedInstitutes,
      archivedInstitutes,
      trialInstitutes,
      totalUsers,
      facultyCount,
      instituteAdmins,
      parentCount,
      studentUsers,
      activeRate,
      totalActiveStudents: stats?.totalActiveStudents || 0,
      mrr: stats?.revenue?.mrr || 0,
      arr: stats?.revenue?.arr || 0,
      subscriptionDistribution: stats?.revenue?.subscriptionDistribution || [],
      recentInstitutes: stats?.recentInstitutes || [],
      systemActivity: stats?.systemActivity || [],
      monthlyGrowth: stats?.monthlyGrowth || [],
      alerts: stats?.alerts || { expiringSoon: 0, suspendedInstitutes: 0 },
    };
  }, [stats]);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-primary/20 animate-spin border-t-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4 px-4">
          <div className="h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <div>
            <p className="text-foreground font-semibold text-lg mb-1">Dashboard Error</p>
            <p className="text-muted-foreground text-sm max-w-md mb-4">{error}</p>
            <Button onClick={() => fetchData()}>Try Again</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 p-6 md:p-8">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
          
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <Calendar className="h-4 w-4" />
                {currentDate}
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight">
                Platform Control Center
              </h1>
              <p className="text-white/60 text-sm md:text-base mt-2 max-w-xl">
                Monitor institute health, manage subscriptions, and track platform-wide metrics in real-time.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                <RefreshCcw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/institutes")}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Institutes
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/manage-plans")}
                className="bg-primary hover:bg-primary/90"
              >
                <Layers className="h-4 w-4 mr-2" />
                Manage Plans
              </Button>
            </div>
          </div>

          {/* Alert Banner */}
          {(computed.alerts.expiringSoon > 0 || computed.alerts.suspendedInstitutes > 0) && (
            <div className="relative mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-200">Attention Required</p>
                  <p className="text-xs text-amber-200/70 mt-0.5">
                    {computed.alerts.expiringSoon > 0 && `${computed.alerts.expiringSoon} subscription(s) expiring soon. `}
                    {computed.alerts.suspendedInstitutes > 0 && `${computed.alerts.suspendedInstitutes} institute(s) currently suspended.`}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="text-amber-200 hover:text-amber-100 hover:bg-amber-500/20">
                  Review
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monthly Revenue</p>
                  <h3 className="text-2xl md:text-3xl font-bold mt-2 text-emerald-600">{formatCurrency(computed.mrr)}</h3>
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium">MRR</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Institutes</p>
                  <h3 className="text-2xl md:text-3xl font-bold mt-2 text-blue-600">{computed.activeInstitutes}</h3>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs text-muted-foreground">{computed.activeRate}% of total</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-violet-500/10 to-violet-600/5">
            <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Users</p>
                  <h3 className="text-2xl md:text-3xl font-bold mt-2 text-violet-600">{formatNumber(computed.totalUsers)}</h3>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs text-muted-foreground">{computed.totalActiveStudents} students</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-amber-500/10 to-amber-600/5">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Annual Revenue</p>
                  <h3 className="text-2xl md:text-3xl font-bold mt-2 text-amber-600">{formatCurrency(computed.arr)}</h3>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs text-amber-600 font-medium">ARR</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <BadgeDollarSign className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Subscriptions & Revenue */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subscription Distribution */}
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Subscription Distribution</CardTitle>
                    <CardDescription>Revenue breakdown by plan</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/manage-plans")}>
                    <Settings className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {computed.subscriptionDistribution.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Layers className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No active subscriptions</p>
                    </div>
                  ) : (
                    computed.subscriptionDistribution.map((dist, idx) => {
                      const totalRevenue = computed.subscriptionDistribution.reduce((s, d) => s + d.monthlyRevenue, 0);
                      const percentage = totalRevenue > 0 ? (dist.monthlyRevenue / totalRevenue) * 100 : 0;
                      const planData = plans.find(p => p.slug === dist.plan);
                      
                      return (
                        <div key={idx} className="relative">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={cn("h-3 w-3 rounded-full", PLAN_COLORS[dist.plan] || 'bg-gray-400')} />
                              <div>
                                <p className="text-sm font-medium capitalize">{planData?.name || dist.plan}</p>
                                <p className="text-xs text-muted-foreground">{dist.instituteCount} institutes</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">{formatCurrency(dist.monthlyRevenue)}</p>
                              <p className="text-xs text-muted-foreground">/month</p>
                            </div>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })
                  )}
                </div>

                {computed.subscriptionDistribution.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total MRR</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(computed.mrr)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Institute Health */}
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Institute Health Overview</CardTitle>
                    <CardDescription>Status distribution across all institutes</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-emerald-600">{computed.activeInstitutes}</p>
                    <p className="text-xs text-muted-foreground mt-1">Active</p>
                  </div>
                  <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/30 p-4 text-center">
                    <Clock className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-amber-600">{computed.trialInstitutes}</p>
                    <p className="text-xs text-muted-foreground mt-1">Trial</p>
                  </div>
                  <div className="rounded-xl border bg-red-50 dark:bg-red-950/30 p-4 text-center">
                    <AlertTriangle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">{computed.suspendedInstitutes}</p>
                    <p className="text-xs text-muted-foreground mt-1">Suspended</p>
                  </div>
                  <div className="rounded-xl border bg-slate-50 dark:bg-slate-950/30 p-4 text-center">
                    <Building2 className="h-6 w-6 text-slate-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-600">{computed.archivedInstitutes}</p>
                    <p className="text-xs text-muted-foreground mt-1">Archived</p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Overall Health Score</span>
                    <span className="font-semibold text-emerald-600">{computed.activeRate}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                    <div 
                      className="h-full bg-emerald-500 transition-all" 
                      style={{ width: `${(computed.activeInstitutes / Math.max(computed.totalInstitutes, 1)) * 100}%` }} 
                    />
                    <div 
                      className="h-full bg-amber-500 transition-all" 
                      style={{ width: `${(computed.trialInstitutes / Math.max(computed.totalInstitutes, 1)) * 100}%` }} 
                    />
                    <div 
                      className="h-full bg-red-500 transition-all" 
                      style={{ width: `${(computed.suspendedInstitutes / Math.max(computed.totalInstitutes, 1)) * 100}%` }} 
                    />
                    <div 
                      className="h-full bg-slate-400 transition-all" 
                      style={{ width: `${(computed.archivedInstitutes / Math.max(computed.totalInstitutes, 1)) * 100}%` }} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Institutes */}
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Recent Institutes</CardTitle>
                    <CardDescription>Latest registered organizations</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/institutes")}>
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {computed.recentInstitutes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No institutes found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {computed.recentInstitutes.slice(0, 5).map((inst) => (
                      <div 
                        key={inst.id} 
                        className="flex items-center justify-between p-3 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/institutes`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{inst.name}</p>
                            <p className="text-xs text-muted-foreground">{inst.code} • {inst.city || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-muted-foreground">{inst.student_count} students</p>
                            <p className="text-xs text-muted-foreground">{inst.teacher_count} teachers</p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "capitalize text-xs",
                              inst.status === 'active' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                              inst.status === 'trial' && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                              inst.status === 'suspended' && "bg-red-500/10 text-red-600 border-red-500/20"
                            )}
                          >
                            {inst.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Activity & Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 hover:bg-primary/5 hover:border-primary/30" 
                  onClick={() => navigate("/institutes")}
                >
                  <Plus className="h-4 w-4 mr-3 text-primary" />
                  <span>Add New Institute</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 hover:bg-blue-500/5 hover:border-blue-500/30"
                  onClick={() => navigate("/manage-plans")}
                >
                  <Layers className="h-4 w-4 mr-3 text-blue-500" />
                  <span>Configure Plans</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 hover:bg-violet-500/5 hover:border-violet-500/30"
                  onClick={() => navigate("/pricing")}
                >
                  <CreditCard className="h-4 w-4 mr-3 text-violet-500" />
                  <span>View Pricing Page</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 hover:bg-emerald-500/5 hover:border-emerald-500/30"
                  onClick={() => navigate("/reports")}
                >
                  <BarChart3 className="h-4 w-4 mr-3 text-emerald-500" />
                  <span>Platform Reports</span>
                </Button>
              </CardContent>
            </Card>

            {/* User Composition */}
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">User Composition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Institute Admins", value: computed.instituteAdmins, icon: ShieldCheck, color: "text-blue-600 bg-blue-500/10" },
                  { label: "Faculty", value: computed.facultyCount, icon: Users, color: "text-amber-600 bg-amber-500/10" },
                  { label: "Students", value: computed.studentUsers, icon: GraduationCap, color: "text-violet-600 bg-violet-500/10" },
                  { label: "Parents", value: computed.parentCount, icon: Users, color: "text-emerald-600 bg-emerald-500/10" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", item.color)}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="text-sm font-bold">{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* System Activity */}
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">System Activity</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    <Activity className="h-3 w-3 mr-1" />
                    24h
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {computed.systemActivity.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {computed.systemActivity.slice(0, 6).map((activity, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{ACTION_ICONS[activity.action] || '📝'}</span>
                          <span className="text-muted-foreground capitalize">{activity.action.toLowerCase()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {activity.count}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Growth Chart */}
            {computed.monthlyGrowth.length > 0 && (
              <Card className="shadow-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold">Growth Trend</CardTitle>
                  <CardDescription className="text-xs">New institutes per month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between gap-2 h-24">
                    {computed.monthlyGrowth.map((month, idx) => {
                      const maxVal = Math.max(...computed.monthlyGrowth.map(m => m.newInstitutes), 1);
                      const height = (month.newInstitutes / maxVal) * 100;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <div 
                            className="w-full bg-primary/20 rounded-t transition-all hover:bg-primary/40"
                            style={{ height: `${Math.max(height, 8)}%` }}
                          />
                          <span className="text-[10px] text-muted-foreground">{month.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Focus Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="shadow-card border-l-4 border-l-emerald-500">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Operations</p>
                  <p className="font-medium text-sm mt-1">Monitor suspended institutes and provide re-activation support.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-l-4 border-l-blue-500">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Growth</p>
                  <p className="font-medium text-sm mt-1">Promote premium plans to high-volume institutes for upsell.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-l-4 border-l-violet-500">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Server className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Platform</p>
                  <p className="font-medium text-sm mt-1">Maintain balanced user distribution through targeted onboarding.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
