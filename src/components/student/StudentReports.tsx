// ─────────────────────────────────────────────────────────────────────────────
// StudentReports — personal stats view for self-assessment
// No AI generation, no downloads, no class-wide data
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
    AreaChart, Area, Tooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell,
} from "recharts";
import {
    BarChart3, GraduationCap, Target, Trophy, TrendingUp, TrendingDown,
    AlertCircle, RefreshCw, Award, BookOpen, CheckCircle, Minus, FileText,
} from "lucide-react";
import { getExamResults, getPerformanceTrend, getAttendanceSubjectWise } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/* ── Types ── */
interface ResultRow {
    id: string;
    exam_name?: string;
    subject_name?: string;
    marks_obtained?: number;
    max_marks?: number;
    grade?: string;
    exam_type?: string;
    exam_date?: string;
}

interface TrendRow { exam: string; average: number;[key: string]: string | number }

interface SubjectStat {
    name: string;
    percentage: number;
    present: number;
    total: number;
}

/* ── Helpers ── */
const COLORS = [
    "hsl(var(--primary))",
    "#3b82f6",
    "#8b5cf6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#ec4899",
];

function getGradeColor(grade?: string) {
    if (!grade) return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
    if (grade.startsWith("A")) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    if (grade.startsWith("B")) return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    if (grade.startsWith("C")) return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20";
}

function ScoreBadge({ pct }: { pct: number }) {
    const color = pct >= 80 ? "text-emerald-600 dark:text-emerald-400"
        : pct >= 60 ? "text-amber-600 dark:text-amber-400"
            : "text-rose-600 dark:text-rose-400";
    const Icon = pct >= 80 ? TrendingUp : pct >= 60 ? Minus : TrendingDown;
    return (
        <div className={cn("flex items-center gap-1 text-xs font-bold", color)}>
            <Icon className="h-3.5 w-3.5" />
            {pct.toFixed(1)}%
        </div>
    );
}

/* ── Stat card ── */
function StatCard({
    label, value, sub, accent, icon: Icon, progress,
}: {
    label: string; value: string; sub?: string; accent: string; icon: React.ComponentType<{ className?: string }>; progress?: number;
}) {
    return (
        <Card className={cn("shadow-lg border-border/40 bg-card/60 backdrop-blur relative overflow-hidden group hover:border-primary/30 transition-all duration-300", accent)}>
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/60 to-violet-500/60 opacity-60 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">{label}</p>
                <p className="text-3xl font-black text-foreground">{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-1 font-medium">{sub}</p>}
                {progress !== undefined && (
                    <Progress value={progress} className="mt-3 h-1.5" />
                )}
            </CardContent>
        </Card>
    );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */
export default function StudentReports() {
    const { user } = useAuth();
    const firstName = user?.name?.split(" ")[0] || "Student";

    const [results, setResults] = useState<ResultRow[]>([]);
    const [trend, setTrend] = useState<TrendRow[]>([]);
    const [attStats, setAttStats] = useState<SubjectStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("overview");

    const fetchData = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            setError(null);

            const [resRes, trendRes, attRes] = await Promise.all([
                getExamResults({}),
                getPerformanceTrend({}),
                getAttendanceSubjectWise(),
            ]);

            if (resRes.success && resRes.data)
                setResults(((resRes.data as { results: ResultRow[] }).results || []));

            if (trendRes.success && trendRes.data)
                setTrend(((trendRes.data as { performanceTrend: TrendRow[] }).performanceTrend || []));

            if (attRes.success && attRes.data) {
                const raw = (attRes.data as { subjectWise: { subject_name: string; percentage: string; total_classes: string; present: string }[] }).subjectWise || [];
                setAttStats(raw.map(d => ({
                    name: d.subject_name,
                    percentage: parseFloat(d.percentage) || 0,
                    present: parseInt(d.present) || 0,
                    total: parseInt(d.total_classes) || 0,
                })));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load reports");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── Derived stats ── */
    const subjects = useMemo(() => {
        if (trend.length === 0) return [] as string[];
        return Object.keys(trend[0]).filter(k => k !== "exam" && k !== "average");
    }, [trend]);

    const radarData = useMemo(() => {
        if (trend.length === 0) return [];
        const last = trend[trend.length - 1];
        return subjects.map(s => ({ subject: s, score: Number(last[s]) || 0, fullMark: 100 }));
    }, [trend, subjects]);

    const personalStats = useMemo(() => {
        if (results.length === 0) return null;
        const totalMarks = results.reduce((s, r) => s + (r.marks_obtained || 0), 0);
        const totalMax = results.reduce((s, r) => s + (r.max_marks || 100), 0);
        const pct = totalMax > 0 ? (totalMarks / totalMax * 100) : 0;
        const latestAvg = trend.length > 0 ? (trend[trend.length - 1].average as number) : pct;
        const prevAvg = trend.length > 1 ? (trend[trend.length - 2].average as number) : latestAvg;
        const delta = latestAvg - prevAvg;

        // Best & worst
        const subMap: Record<string, { total: number; max: number }> = {};
        results.forEach(r => {
            if (!r.subject_name) return;
            const prev = subMap[r.subject_name] || { total: 0, max: 0 };
            subMap[r.subject_name] = { total: prev.total + (r.marks_obtained || 0), max: prev.max + (r.max_marks || 100) };
        });
        const subAvgs = Object.entries(subMap).map(([name, { total, max }]) => ({ name, avg: max > 0 ? (total / max) * 100 : 0 }));
        const bestSub = subAvgs.length > 0 ? subAvgs.reduce((a, b) => b.avg > a.avg ? b : a) : { name: "—", avg: 0 };
        const worstSub = subAvgs.length > 0 ? subAvgs.reduce((a, b) => b.avg < a.avg ? b : a) : { name: "—", avg: 0 };

        const overallAtt = attStats.length > 0
            ? attStats.reduce((s, a) => s + a.percentage, 0) / attStats.length
            : 0;

        return { pct, total: results.length, delta, bestSub, worstSub, overallAtt, latestAvg };
    }, [results, trend, attStats]);

    /* ── Loading ── */
    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-muted animate-spin border-t-primary" />
                    <p className="text-muted-foreground text-sm animate-pulse">Loading your reports…</p>
                </div>
            </DashboardLayout>
        );
    }

    /* ── Error ── */
    if (error) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4 px-4">
                    <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                        <AlertCircle className="h-7 w-7 text-destructive" />
                    </div>
                    <div>
                        <p className="font-semibold text-foreground mb-1">Something went wrong</p>
                        <p className="text-muted-foreground text-sm max-w-md">{error}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fetchData()}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Try Again
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 page-enter pb-10">

                {/* ── Hero Header ── */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/10 via-cyan-500/5 to-teal-500/10 border border-blue-500/20 p-6 sm:p-8">
                    <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
                    <div className="relative flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold tracking-wide uppercase mb-3 bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400">
                                <BarChart3 className="w-4 h-4" />
                                My Academic Report
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-2">
                                {firstName}'s Performance
                            </h1>
                            <p className="text-muted-foreground text-sm sm:text-base max-w-lg">
                                Track your academic journey — exam scores, attendance, and subject-wise progress.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchData(true)}
                            className="shrink-0 bg-background/50 backdrop-blur"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                        </Button>
                    </div>
                </div>

                {/* ── Stats Grid ── */}
                {personalStats && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <StatCard
                            label="Overall Score"
                            value={`${personalStats.pct.toFixed(1)}%`}
                            sub={`${personalStats.total} exam${personalStats.total !== 1 ? "s" : ""} recorded`}
                            accent=""
                            icon={Target}
                            progress={personalStats.pct}
                        />
                        <StatCard
                            label="Avg Attendance"
                            value={`${personalStats.overallAtt.toFixed(1)}%`}
                            sub={`${attStats.length} subject${attStats.length !== 1 ? "s" : ""} tracked`}
                            accent=""
                            icon={CheckCircle}
                            progress={personalStats.overallAtt}
                        />
                        <StatCard
                            label="Best Subject"
                            value={personalStats.bestSub.name}
                            sub={`${personalStats.bestSub.avg.toFixed(1)}% avg`}
                            accent=""
                            icon={Trophy}
                        />
                        <StatCard
                            label="Focus Area"
                            value={personalStats.worstSub.name}
                            sub={`${personalStats.worstSub.avg.toFixed(1)}% avg`}
                            accent=""
                            icon={Award}
                        />
                    </div>
                )}

                {/* ── No data ── */}
                {!personalStats && (
                    <div className="flex flex-col items-center justify-center py-20 px-4 border border-dashed border-border/60 rounded-2xl bg-background/30 text-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                            <GraduationCap className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">No exam data yet</h3>
                        <p className="text-muted-foreground text-sm max-w-sm">Your performance data will appear here once exams have been graded.</p>
                    </div>
                )}

                {/* ── Tabs ── */}
                {personalStats && (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
                        <TabsList className="bg-muted/50 p-1 border border-border/50 rounded-xl flex-wrap h-auto">
                            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5 px-4">
                                <BarChart3 className="w-4 h-4 mr-2" /> Score Trend
                            </TabsTrigger>
                            <TabsTrigger value="subjects" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5 px-4">
                                <BookOpen className="w-4 h-4 mr-2" /> Subject Breakdown
                            </TabsTrigger>
                            <TabsTrigger value="results" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5 px-4">
                                <FileText className="w-4 h-4 mr-2" /> My Results
                            </TabsTrigger>
                            <TabsTrigger value="attendance" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5 px-4">
                                <CheckCircle className="w-4 h-4 mr-2" /> Attendance
                            </TabsTrigger>
                        </TabsList>

                        {/* ── Score Trend ── */}
                        <TabsContent value="overview" className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-400">
                            {trend.length === 0 ? (
                                <div className="text-center py-20 border border-dashed border-border/60 rounded-2xl bg-background/30">
                                    <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-muted-foreground text-sm">Not enough exam data to draw a trend chart yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                    {/* Area Trend */}
                                    <Card className="shadow-xl bg-card/40 backdrop-blur border-border/50 overflow-hidden">
                                        <CardHeader className="pb-2 border-b border-border/30 bg-muted/10">
                                            <CardTitle className="text-base font-bold">Score Progression</CardTitle>
                                            <CardDescription>Your average score across exams over time</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            <div className="h-[240px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="colorAvgStu" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                                                        <XAxis dataKey="exam" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} dy={8} />
                                                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                                        <Tooltip
                                                            contentStyle={{ borderRadius: "10px", fontSize: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                                                            formatter={(v: number) => [`${v.toFixed(1)}%`, "Average"]}
                                                        />
                                                        <Area type="monotone" dataKey="average" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorAvgStu)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Skill Radar */}
                                    <Card className="shadow-xl bg-card/40 backdrop-blur border-border/50">
                                        <CardHeader className="pb-2 border-b border-border/30 bg-muted/10">
                                            <CardTitle className="text-base font-bold">Strength Radar</CardTitle>
                                            <CardDescription>Subject-wise competency map (latest exam)</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            <div className="h-[240px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                                                        <PolarGrid className="stroke-border/40" />
                                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 600 }} />
                                                        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                                        <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                                                        <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </TabsContent>

                        {/* ── Subject Breakdown ── */}
                        <TabsContent value="subjects" className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-400">
                            {radarData.length === 0 ? (
                                <div className="text-center py-20 border border-dashed border-border/60 rounded-2xl bg-background/30">
                                    <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-muted-foreground text-sm">Subject scores will appear after exams are graded.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Bar chart */}
                                    <Card className="shadow-xl bg-card/40 backdrop-blur border-border/50 overflow-hidden">
                                        <CardHeader className="pb-2 border-b border-border/30 bg-muted/10">
                                            <CardTitle className="text-base font-bold">Subject Scores (Latest Exam)</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            <div className="h-[220px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={radarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                                                        <XAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 500 }} axisLine={false} tickLine={false} dy={8} />
                                                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                                        <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} formatter={(v: number) => [`${v.toFixed(1)}%`, "Score"]} />
                                                        <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                                                            {radarData.map((_, i) => (
                                                                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Subject cards grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {radarData.map((sub, i) => {
                                            const pct = sub.score;
                                            const color = pct >= 80 ? "from-emerald-500/20 to-teal-500/10 border-emerald-500/20"
                                                : pct >= 60 ? "from-amber-500/20 to-orange-500/10 border-amber-500/20"
                                                    : "from-rose-500/20 to-red-500/10 border-rose-500/20";
                                            const label = pct >= 80 ? "Excellent" : pct >= 60 ? "Good" : "Needs Work";
                                            const labelColor = pct >= 80 ? "text-emerald-700 dark:text-emerald-400" : pct >= 60 ? "text-amber-700 dark:text-amber-400" : "text-rose-700 dark:text-rose-400";
                                            return (
                                                <Card key={sub.subject} className={cn("border bg-gradient-to-br shadow-md overflow-hidden", color)}>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                                                                style={{ background: COLORS[i % COLORS.length] }}
                                                            >
                                                                {sub.subject.charAt(0)}
                                                            </div>
                                                            <ScoreBadge pct={pct} />
                                                        </div>
                                                        <p className="font-bold text-foreground truncate">{sub.subject}</p>
                                                        <p className={cn("text-xs font-semibold mt-0.5", labelColor)}>{label}</p>
                                                        <Progress value={pct} className="mt-3 h-1.5" />
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </TabsContent>

                        {/* ── Results Table ── */}
                        <TabsContent value="results" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-400">
                            <Card className="shadow-xl bg-card/40 backdrop-blur border-border/50 overflow-hidden">
                                <CardHeader className="border-b border-border/30 bg-muted/10 p-4 sm:p-5">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-primary" /> My Exam Results
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {results.length === 0 ? (
                                        <div className="text-center py-16 px-4">
                                            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                                                <FileText className="h-7 w-7 text-muted-foreground/40" />
                                            </div>
                                            <p className="font-semibold text-foreground mb-1">No Results Yet</p>
                                            <p className="text-muted-foreground text-sm">Results will appear here once your exams are graded.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader className="bg-muted/30">
                                                    <TableRow className="border-border/30 hover:bg-transparent">
                                                        <TableHead className="py-3 font-bold text-foreground">Exam</TableHead>
                                                        <TableHead className="py-3 font-bold text-foreground">Subject</TableHead>
                                                        <TableHead className="py-3 font-bold text-foreground text-center">Score</TableHead>
                                                        <TableHead className="py-3 font-bold text-foreground text-center">Grade</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {results.map((r) => {
                                                        const pct = r.max_marks ? ((r.marks_obtained || 0) / r.max_marks) * 100 : 0;
                                                        return (
                                                            <TableRow key={r.id} className="border-border/30 hover:bg-muted/40 transition-colors">
                                                                <TableCell>
                                                                    <span className="font-medium text-foreground">{r.exam_name || "—"}</span>
                                                                    {r.exam_date && (
                                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                                            {new Date(r.exam_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                                        </p>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-muted-foreground font-medium">{r.subject_name || "—"}</TableCell>
                                                                <TableCell className="text-center">
                                                                    <div className="font-bold text-foreground">{r.marks_obtained ?? 0} <span className="text-xs text-muted-foreground font-normal">/ {r.max_marks ?? 100}</span></div>
                                                                    <div className="w-full max-w-[80px] mx-auto mt-1">
                                                                        <Progress value={pct} className="h-1" />
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Badge className={cn("px-2.5 py-0.5 shadow-none uppercase font-black tracking-wider text-[10px]", getGradeColor(r.grade))}>
                                                                        {r.grade || "N/A"}
                                                                    </Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ── Attendance by Subject ── */}
                        <TabsContent value="attendance" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-400">
                            {attStats.length === 0 ? (
                                <div className="text-center py-20 border border-dashed border-border/60 rounded-2xl bg-background/30">
                                    <CheckCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-muted-foreground text-sm">Subject-wise attendance will appear here once recorded.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Bar chart */}
                                    <Card className="shadow-xl bg-card/40 backdrop-blur border-border/50 overflow-hidden">
                                        <CardHeader className="pb-2 border-b border-border/30 bg-muted/10">
                                            <CardTitle className="text-base font-bold">Attendance by Subject</CardTitle>
                                            <CardDescription>Minimum 75% required to be eligible for exams</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            <div className="h-[220px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={attStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} dy={8} />
                                                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                                                        <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} formatter={(v: number, _: string, props) => [`${v.toFixed(1)}%  (${props.payload.present}/${props.payload.total} classes)`, "Attendance"]} />
                                                        <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                                            {attStats.map((entry, i) => (
                                                                <Cell key={`cell-att-${i}`} fill={entry.percentage >= 75 ? "hsl(var(--primary))" : entry.percentage >= 60 ? "#f59e0b" : "#ef4444"} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Subject-wise cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {attStats.map(sub => {
                                            const ok = sub.percentage >= 75;
                                            const warn = sub.percentage >= 60 && sub.percentage < 75;
                                            const attColor = ok ? "text-emerald-700 dark:text-emerald-400" : warn ? "text-amber-700 dark:text-amber-400" : "text-rose-700 dark:text-rose-400";
                                            const borderColor = ok ? "border-emerald-500/20" : warn ? "border-amber-500/20" : "border-rose-500/20";
                                            const bgColor = ok ? "from-emerald-500/10 to-teal-500/5" : warn ? "from-amber-500/10 to-orange-500/5" : "from-rose-500/10 to-red-500/5";
                                            const status = ok ? "✅ On track" : warn ? "⚠️ At risk" : "🚨 Low — action needed";

                                            return (
                                                <Card key={sub.name} className={cn("border bg-gradient-to-br shadow-md", borderColor, bgColor)}>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="font-bold text-foreground truncate pr-2">{sub.name}</p>
                                                            <span className={cn("text-xl font-black shrink-0", attColor)}>
                                                                {sub.percentage.toFixed(0)}%
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mb-2">{sub.present} of {sub.total} classes attended</p>
                                                        <Progress value={sub.percentage} className="h-1.5 mb-2" />
                                                        <p className={cn("text-xs font-semibold", attColor)}>{status}</p>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </DashboardLayout>
    );
}
