import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Area, AreaChart
} from "recharts";
import {
  Download, FileText, TrendingUp, TrendingDown, Minus,
  Trophy, Target, BarChart3, Filter, Loader2, AlertCircle, Sparkles, BookOpen, GraduationCap, LayoutDashboard
} from "lucide-react";
import { getExamResults, getPerformanceTrend, getExams, getClasses } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { Exam, Class as ClassType } from "@/types";

/* ---------- tiny helpers ---------- */

interface ResultRow {
  id: string;
  exam_name?: string;
  subject_name?: string;
  student_name?: string;
  marks_obtained?: number;
  max_marks?: number;
  grade?: string;
  exam_type?: string;
  exam_date?: string;
  class_name?: string;
  roll_number?: string;
}

interface TrendRow { exam: string; average: number;[key: string]: string | number }

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <div className="flex items-center text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-xs font-bold"><TrendingUp className="h-3.5 w-3.5 mr-1" /> {value.toFixed(1)}%</div>;
  if (value < 0) return <div className="flex items-center text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full text-xs font-bold"><TrendingDown className="h-3.5 w-3.5 mr-1" /> {Math.abs(value).toFixed(1)}%</div>;
  return <div className="flex items-center text-muted-foreground bg-muted px-2 py-0.5 rounded-full text-xs font-bold"><Minus className="h-3.5 w-3.5 mr-1" /> 0.0%</div>;
}

function gradeBadgeVariant(grade?: string) {
  if (!grade) return "outline" as const;
  if (grade.startsWith("A")) return "default" as const;
  if (grade.startsWith("B")) return "secondary" as const;
  if (grade.startsWith("C")) return "outline" as const;
  return "destructive" as const;
}

function getGradeColor(grade?: string) {
  if (!grade) return "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20";
  if (grade.startsWith("A")) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
  if (grade.startsWith("B")) return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
  if (grade.startsWith("C")) return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
  return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20";
}

const SUBJECT_COLORS = [
  "hsl(var(--primary))",
  "hsl(220, 70%, 50%)", // Blue
  "hsl(280, 65%, 60%)", // Purple
  "hsl(160, 60%, 45%)", // Teal
  "hsl(35, 90%, 55%)",  // Orange
  "hsl(340, 75%, 60%)", // Pink
  "hsl(0, 70%, 55%)",   // Red
];

function handleDownload(reportType: string) {
  const content = `EduYantra Premium Report\n\nType: ${reportType}\nGenerated: ${new Date().toLocaleDateString()}\n\nPDF export functionality will be available shortly.`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${reportType.toLowerCase().replace(/\s+/g, "-")}-report.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ========================================== */
export default function Reports() {
  const { user, isRole } = useAuth();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [selectedExam, setSelectedExam] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isStaff = isRole('super_admin', 'institute_admin', 'faculty');
  const showClassFilter = isStaff;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (selectedExam !== "all") params.exam_id = selectedExam;
      if (classFilter !== "all" && showClassFilter) params.class_id = classFilter;

      const [resRes, trendRes, examRes, clsRes] = await Promise.all([
        getExamResults(params),
        getPerformanceTrend(classFilter !== "all" && showClassFilter ? { class_id: classFilter } : undefined),
        getExams(),
        showClassFilter ? getClasses() : Promise.resolve(null),
      ]);

      if (resRes.success && resRes.data) {
        setResults((resRes.data as { results: ResultRow[] }).results || []);
      }
      if (trendRes.success && trendRes.data) {
        setTrend((trendRes.data as { performanceTrend: TrendRow[] }).performanceTrend || []);
      }
      if (examRes.success && examRes.data) {
        setExams((examRes.data as { exams: Exam[] }).exams || []);
      }
      if (clsRes?.success && clsRes.data) {
        setClasses((clsRes.data as { classes: ClassType[] }).classes || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [selectedExam, classFilter, showClassFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ---- derived stats ---- */
  const subjects = useMemo(() => {
    if (trend.length === 0) return [] as string[];
    return Object.keys(trend[0]).filter(k => k !== 'exam' && k !== 'average');
  }, [trend]);

  const latestAvg = trend.length > 0 ? trend[trend.length - 1].average : 0;
  const prevAvg = trend.length > 1 ? trend[trend.length - 2].average : latestAvg;
  const avgDelta = latestAvg - prevAvg;

  // Best subject from latest trend row
  const bestSubject = useMemo(() => {
    if (trend.length === 0 || subjects.length === 0) return { name: "Pending", score: 0 };
    const last = trend[trend.length - 1];
    let best = { name: subjects[0], score: Number(last[subjects[0]]) || 0 };
    for (const s of subjects) {
      const v = Number(last[s]) || 0;
      if (v > best.score) best = { name: s, score: v };
    }
    return best;
  }, [trend, subjects]);

  const trendChartConfig = useMemo(() => {
    const cfg: Record<string, { label: string; color: string }> = {};
    subjects.forEach((s, i) => { cfg[s] = { label: s, color: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }; });
    cfg.average = { label: "Average", color: "hsl(var(--primary))" };
    return cfg;
  }, [subjects]);

  const radarData = useMemo(() => {
    if (trend.length === 0) return [];
    const last = trend[trend.length - 1];
    return subjects.map(s => ({ subject: s, score: Number(last[s]) || 0, fullMark: 100 }));
  }, [trend, subjects]);

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 page-enter pb-12">
        {/* PREMIUM HEADER - ROLE BASED */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl bg-gradient-to-br border p-6 sm:p-8",
          isStaff
            ? "from-violet-600/10 via-purple-500/5 to-fuchsia-500/10 border-violet-500/20"
            : "from-blue-600/10 via-cyan-500/5 to-teal-500/10 border-blue-500/20"
        )}>
          <div className={cn(
            "absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl mix-blend-multiply",
            isStaff ? "bg-violet-500/10" : "bg-blue-500/10"
          )} />
          <div className={cn(
            "absolute -bottom-24 -left-24 w-64 h-64 rounded-full blur-3xl mix-blend-multiply",
            isStaff ? "bg-fuchsia-500/10" : "bg-teal-500/10"
          )} />

          <div className="relative flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div>
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold tracking-wide uppercase mb-3",
                isStaff
                  ? "bg-violet-500/10 border-violet-500/20 text-violet-700 dark:text-violet-400"
                  : "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400"
              )}>
                <LayoutDashboard className="w-4 h-4" />
                {isStaff ? "Institute Analytics" : "My Academic Reports"}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-2">
                {isStaff ? "Performance Overview" : "Your Performance"}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
                {isStaff
                  ? "Comprehensive analytics, test results, and performance trends across your classes."
                  : "Track your academic journey, test results, and subject-wise progress over time."}
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button onClick={() => handleDownload("Comprehensive Sync")} className={cn(
                "shadow-lg pointer-events-auto transition-transform hover:scale-105 active:scale-95",
                isStaff ? "shadow-violet-500/25 bg-violet-600 hover:bg-violet-700 text-white" : "shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground"
              )}>
                <Sparkles className="h-4 w-4 mr-2" /> Generate AI Summary
              </Button>
            </div>
          </div>
        </div>

        {/* MODERN FILTERS */}
        <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between border-border/50 sticky top-4 z-20 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-2 text-muted-foreground px-2">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-bold uppercase tracking-wider">Refine Data</span>
          </div>
          <div className="flex flex-wrap w-full md:w-auto gap-3 items-center">
            {showClassFilter && (
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full md:w-[180px] h-10 bg-background/50 border-border/50 rounded-lg shadow-inner">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="w-full md:w-[220px] h-10 bg-background/50 border-border/50 rounded-lg shadow-inner">
                <SelectValue placeholder="All Exams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cumulative (All Exams)</SelectItem>
                {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* LOADING & ERROR STATES */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
            <p className="text-muted-foreground font-medium animate-pulse">Crunching numbers...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-destructive/5 rounded-2xl border border-destructive/20">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Failed to load analytics</p>
              <p className="text-muted-foreground text-sm max-w-sm mt-1">{error}</p>
            </div>
            <Button variant="outline" onClick={fetchData}>Try Again</Button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* PREMIUM OVERVIEW CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="shadow-xl shadow-primary/5 border-border/40 bg-card/60 backdrop-blur group hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Target className="w-6 h-6" />
                    </div>
                    <TrendIcon value={avgDelta} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Overall Average</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-4xl font-black text-foreground">{latestAvg.toFixed(1)}</p>
                      <span className="text-lg font-semibold text-muted-foreground">%</span>
                    </div>
                  </div>
                  <Progress value={latestAvg} className="mt-4 h-1.5" />
                </CardContent>
              </Card>

              <Card className="shadow-xl shadow-amber-500/5 border-border/40 bg-card/60 backdrop-blur group hover:border-amber-500/30 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-6 flex flex-col h-full justify-between">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Trophy className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Strongest Area</p>
                    <p className="text-2xl font-black text-foreground truncate" title={bestSubject.name}>{bestSubject.name}</p>
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-1">{bestSubject.score.toFixed(1)}% High Score</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-border/40 bg-card/60 backdrop-blur group transition-all duration-300 relative overflow-hidden">
                <CardContent className="p-6 flex flex-col h-full justify-between">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Total Results</p>
                    <p className="text-4xl font-black text-foreground">{results.length}</p>
                    <p className="text-sm font-medium text-muted-foreground mt-1">Across {subjects.length} subjects</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-border/40 bg-card/60 backdrop-blur group transition-all duration-300 relative overflow-hidden">
                <CardContent className="p-6 flex flex-col h-full justify-between">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Exams Logged</p>
                    <p className="text-4xl font-black text-foreground">{trend.length}</p>
                    <p className="text-sm font-medium text-muted-foreground mt-1">Historical track record</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* MODERNIZED TABS */}
            <Tabs defaultValue="performance" className="space-y-6">
              <TabsList className="bg-muted/50 p-1 border border-border/50 rounded-xl h-auto">
                <TabsTrigger value="performance" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5 px-4">
                  <BarChart3 className="w-4 h-4 mr-2" /> Performance Graph
                </TabsTrigger>
                <TabsTrigger value="results" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5 px-4">
                  <GraduationCap className="w-4 h-4 mr-2" /> Tabular Results
                </TabsTrigger>
                <TabsTrigger value="download" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5 px-4">
                  <Download className="w-4 h-4 mr-2" /> Report Cards
                </TabsTrigger>
              </TabsList>

              {/* Performance Graphs Tab */}
              <TabsContent value="performance" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {trend.length === 0 ? (
                  <div className="text-center py-20 px-4 border border-dashed border-border/60 rounded-2xl bg-background/30">
                    <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
                      <LineChart className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Awaiting Analytics</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                      Not enough historical data to plot performance graphs. Please adjust filters or wait for more exams to be logged.
                    </p>
                  </div>
                ) : (
                  <>
                    <Card className="shadow-xl bg-card/40 backdrop-blur border-border/50 overflow-hidden">
                      <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-border/30 bg-muted/10">
                        <div>
                          <CardTitle className="text-xl font-bold">Progression Trend</CardTitle>
                          <CardDescription className="mt-1">Tracking average score over time</CardDescription>
                        </div>
                        <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <ChartContainer config={trendChartConfig} className="h-[350px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                              <XAxis dataKey="exam" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} dy={10} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                              <ChartTooltip content={<ChartTooltipContent className="bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-xl" />} />

                              <Area type="monotone" dataKey="average" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorAvg)" />

                              {subjects.slice(0, 3).map((s, i) => (
                                <Line key={s} type="monotone" dataKey={s} stroke={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--background))" }} activeDot={{ r: 6 }} opacity={0.6} />
                              ))}
                            </AreaChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Radar Chart */}
                      <Card className="shadow-xl bg-card/40 backdrop-blur border-border/50">
                        <CardHeader className="pb-2 border-b border-border/30 bg-muted/10">
                          <CardTitle className="text-lg">Skill Radar</CardTitle>
                          <CardDescription>Subject strength profile</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <ChartContainer config={{ score: { label: "Score", color: "hsl(var(--chart-1))" } }} className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                                <PolarGrid className="stroke-border/40" />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'hsl(var(--foreground))', fontWeight: 600 }} />
                                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2} />
                                <ChartTooltip content={<ChartTooltipContent className="rounded-xl shadow-xl" />} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        </CardContent>
                      </Card>

                      {/* Bar Chart */}
                      <Card className="shadow-xl bg-card/40 backdrop-blur border-border/50">
                        <CardHeader className="pb-2 border-b border-border/30 bg-muted/10">
                          <CardTitle className="text-lg">Subject Breakdown</CardTitle>
                          <CardDescription>Latest exam standing</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <ChartContainer config={{ score: { label: "Score", color: "hsl(var(--primary))" } }} className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={radarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                                <XAxis dataKey="subject" tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                <ChartTooltip content={<ChartTooltipContent cursor={{ fill: 'hsl(var(--muted)/0.5)' }} className="rounded-xl shadow-xl" />} />
                                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                                  {radarData.map((entry, index) => (
                                    <cell key={`cell-${index}`} fill={SUBJECT_COLORS[index % SUBJECT_COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Test Results Tab */}
              <TabsContent value="results" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="shadow-xl bg-card/40 backdrop-blur border-border/50 overflow-hidden">
                  <CardHeader className="border-b border-border/30 bg-muted/10 p-4 sm:p-6">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" /> Examination Ledger
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {results.length === 0 ? (
                      <div className="text-center py-16 px-4">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                          <Search className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <p className="font-semibold text-foreground mb-1">No Entries Found</p>
                        <p className="text-muted-foreground text-sm">Adjust your filters to view test results.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-muted/30 pointer-events-none">
                            <TableRow className="border-border/30 hover:bg-transparent">
                              {showClassFilter && <TableHead className="py-4 font-bold text-foreground">Student</TableHead>}
                              <TableHead className="py-4 font-bold text-foreground">Exam Title</TableHead>
                              <TableHead className="py-4 font-bold text-foreground">Subject</TableHead>
                              <TableHead className="py-4 font-bold text-foreground text-center">Score</TableHead>
                              <TableHead className="py-4 font-bold text-foreground text-center">Grade</TableHead>
                              {showClassFilter && <TableHead className="py-4 font-bold text-foreground text-right">Class</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {results.slice(0, 50).map((r) => (
                              <TableRow key={r.id} className="border-border/30 hover:bg-muted/40 transition-colors group">
                                {showClassFilter && <TableCell className="font-semibold">{r.student_name || "—"}</TableCell>}
                                <TableCell>
                                  <span className="font-medium">{r.exam_name || "—"}</span>
                                  {r.exam_date && <p className="text-xs text-muted-foreground mt-0.5">{new Date(r.exam_date).toLocaleDateString()}</p>}
                                </TableCell>
                                <TableCell className="font-medium text-muted-foreground">{r.subject_name || "—"}</TableCell>
                                <TableCell className="text-center">
                                  <div className="font-bold text-foreground">{r.marks_obtained ?? 0} <span className="text-xs text-muted-foreground font-medium">/ {r.max_marks ?? 100}</span></div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={cn("px-2.5 py-0.5 shadow-none uppercase font-black tracking-wider text-[10px]", getGradeColor(r.grade))}>
                                    {r.grade || "N/A"}
                                  </Badge>
                                </TableCell>
                                {showClassFilter && <TableCell className="text-right text-muted-foreground text-sm font-medium">
                                  {r.class_name || "—"}
                                </TableCell>}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {results.length > 50 && (
                          <div className="p-4 text-center border-t border-border/30 bg-muted/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Showing top 50 results
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Downloadable Reports Tab */}
              <TabsContent value="download" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {[
                    { title: "Full Progress Report", desc: "Complete academic performance summary with attendance, grades, and remarks.", type: "Full Progress", gradient: "from-blue-500 to-cyan-500" },
                    { title: "Exam-wise Report Card", desc: "Detailed scorecard for each exam with subject breakdown and analysis.", type: "Exam Report Card", gradient: "from-violet-500 to-purple-500" },
                    { title: "Subject Performance", desc: "In-depth analysis of performance in each subject across all selected exams.", type: "Subject Performance", gradient: "from-emerald-500 to-teal-500" },
                  ].map((report) => (
                    <Card key={report.type} className="group overflow-hidden shadow-xl border-border/40 bg-card/50 backdrop-blur hover:border-primary/40 transition-all duration-300">
                      <div className={cn("h-1.5 w-full bg-gradient-to-r opacity-70 group-hover:opacity-100 transition-opacity", report.gradient)} />
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br bg-opacity-10 dark:bg-opacity-20", report.gradient)}>
                            <FileText className="h-5 w-5 text-white shadow-sm" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold">{report.title}</CardTitle>
                            <CardDescription className="text-xs mt-1 leading-relaxed">{report.desc}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="mt-auto pt-2 pb-4 px-4 sm:px-6">
                        <Button variant="outline" className="w-full bg-background/50 border-border/60 hover:bg-primary/5 hover:text-primary transition-colors group-hover:border-primary/30" onClick={() => handleDownload(report.type)}>
                          <Download className="h-4 w-4 mr-2" /> Select Format & Export
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
