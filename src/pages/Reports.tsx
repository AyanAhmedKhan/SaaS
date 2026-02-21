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
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  Download, FileText, TrendingUp, TrendingDown, Minus,
  Trophy, Target, BarChart3, Filter, Loader2, AlertCircle,
} from "lucide-react";
import { getExamResults, getPerformanceTrend, getExams, getClasses } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
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

interface TrendRow { exam: string; average: number; [key: string]: string | number }

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (value < 0) return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function gradeBadgeVariant(grade?: string) {
  if (!grade) return "outline" as const;
  if (grade.startsWith("A")) return "default" as const;
  if (grade.startsWith("B")) return "secondary" as const;
  return "outline" as const;
}

const SUBJECT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(30, 70%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)",
];

function handleDownload(reportType: string) {
  const content = `EduYantra Report\n\nType: ${reportType}\nGenerated: ${new Date().toLocaleDateString()}\n\nPDF export coming soon.`;
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
  const { isRole } = useAuth();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [selectedExam, setSelectedExam] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const showClassFilter = isRole('super_admin', 'institute_admin', 'class_teacher');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (selectedExam !== "all") params.exam_id = selectedExam;
      if (classFilter !== "all") params.class_id = classFilter;

      const [resRes, trendRes, examRes, clsRes] = await Promise.all([
        getExamResults(params),
        getPerformanceTrend(classFilter !== "all" ? { class_id: classFilter } : undefined),
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
    if (trend.length === 0 || subjects.length === 0) return { name: "—", score: 0 };
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
    cfg.average = { label: "Average", color: "hsl(var(--destructive))" };
    return cfg;
  }, [subjects]);

  const radarData = useMemo(() => {
    if (trend.length === 0) return [];
    const last = trend[trend.length - 1];
    return subjects.map(s => ({ subject: s, score: Number(last[s]) || 0, fullMark: 100 }));
  }, [trend, subjects]);

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Reports</h1>
            <p className="text-muted-foreground text-sm">Academic performance, test results, and progress analytics.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleDownload("Progress Summary")}>
              <Download className="h-4 w-4 mr-2" /> Download Report
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {showClassFilter && (
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Exams" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading reports...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive/60" />
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-card border-border/40">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Overall Average</p>
                      <p className="text-2xl font-bold mt-1">{latestAvg}%</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendIcon value={avgDelta} />
                      <span className="text-xs text-muted-foreground">{Math.abs(avgDelta).toFixed(1)}%</span>
                    </div>
                  </div>
                  <Progress value={latestAvg} className="mt-3 h-2" />
                </CardContent>
              </Card>

              <Card className="shadow-card border-border/40">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Best Subject</p>
                      <p className="text-2xl font-bold mt-1">{bestSubject.name}</p>
                    </div>
                    <Trophy className="h-8 w-8 text-amber-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Scored {bestSubject.score}% in latest exam</p>
                </CardContent>
              </Card>

              <Card className="shadow-card border-border/40">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Total Results</p>
                      <p className="text-2xl font-bold mt-1">{results.length}</p>
                    </div>
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{subjects.length} subjects tracked</p>
                </CardContent>
              </Card>

              <Card className="shadow-card border-border/40">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Exams Completed</p>
                      <p className="text-2xl font-bold mt-1">{exams.filter(e => e.status === 'completed').length}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">of {exams.length} total</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="results" className="space-y-4">
              <TabsList>
                <TabsTrigger value="results">Test Results</TabsTrigger>
                <TabsTrigger value="performance">Performance Graphs</TabsTrigger>
                <TabsTrigger value="download">Downloadable Reports</TabsTrigger>
              </TabsList>

              {/* Test Results Tab */}
              <TabsContent value="results" className="space-y-4">
                <Card className="shadow-card border-border/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Exam Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {results.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-8">No results found for the selected filters.</p>
                    ) : (
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student</TableHead>
                              <TableHead>Exam</TableHead>
                              <TableHead>Subject</TableHead>
                              <TableHead className="text-center">Score</TableHead>
                              <TableHead className="text-center">Grade</TableHead>
                              <TableHead className="text-right">Class</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {results.slice(0, 100).map((r) => (
                              <TableRow key={r.id}>
                                <TableCell className="font-medium">{r.student_name || "—"}</TableCell>
                                <TableCell>{r.exam_name || "—"}</TableCell>
                                <TableCell>{r.subject_name || "—"}</TableCell>
                                <TableCell className="text-center">
                                  {r.marks_obtained ?? 0}/{r.max_marks ?? 100}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={gradeBadgeVariant(r.grade)}>{r.grade || "—"}</Badge>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground text-sm">
                                  {r.class_name || "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Performance Graphs Tab */}
              <TabsContent value="performance" className="space-y-4">
                {trend.length === 0 ? (
                  <Card className="shadow-card border-border/40">
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground text-sm">No performance trend data available.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Trend Line Chart */}
                      <Card className="shadow-card border-border/40">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Performance Trend</CardTitle>
                          <CardDescription>Subject-wise score progression across exams</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
                            <LineChart data={trend}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                              <XAxis dataKey="exam" tick={{ fontSize: 12 }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              {subjects.map((s, i) => (
                                <Line key={s} type="monotone" dataKey={s} stroke={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
                              ))}
                              <Line type="monotone" dataKey="average" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                            </LineChart>
                          </ChartContainer>
                        </CardContent>
                      </Card>

                      {/* Radar Chart */}
                      <Card className="shadow-card border-border/40">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Subject Strength Map</CardTitle>
                          <CardDescription>Latest exam performance by subject</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ChartContainer config={{ score: { label: "Score", color: "hsl(var(--primary))" } }} className="h-[300px] w-full">
                            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                              <PolarGrid className="stroke-border/40" />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                              <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                            </RadarChart>
                          </ChartContainer>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Bar Chart */}
                    <Card className="shadow-card border-border/40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Latest Exam Scores</CardTitle>
                        <CardDescription>Subject-wise breakdown</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={{ score: { label: "Score", color: "hsl(var(--primary))" } }} className="h-[280px] w-full">
                          <BarChart data={radarData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                            <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="score" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* Downloadable Reports Tab */}
              <TabsContent value="download" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { title: "Full Progress Report", desc: "Complete academic performance summary with attendance, grades, and teacher remarks.", type: "Full Progress" },
                    { title: "Exam-wise Report Card", desc: "Detailed scorecard for each exam with subject breakdown and grade analysis.", type: "Exam Report Card" },
                    { title: "Attendance Report", desc: "Monthly and cumulative attendance records with day-wise breakdown.", type: "Attendance" },
                    { title: "Subject Performance Report", desc: "In-depth analysis of performance in each subject across all exams.", type: "Subject Performance" },
                    { title: "Comparative Analysis", desc: "Performance comparison with class average and topper scores.", type: "Comparative Analysis" },
                    { title: "Fee Summary Report", desc: "Fee collection status with paid/pending/overdue breakdown.", type: "Fee Summary" },
                  ].map((report) => (
                    <Card key={report.type} className="shadow-card flex flex-col border-border/40">
                      <CardHeader className="pb-2">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-sm">{report.title}</CardTitle>
                            <CardDescription className="text-xs mt-1">{report.desc}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="mt-auto pt-0">
                        <Button variant="outline" size="sm" className="w-full" onClick={() => handleDownload(report.type)}>
                          <Download className="h-4 w-4 mr-2" /> Download
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
