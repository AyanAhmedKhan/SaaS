import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, Save, GraduationCap, BarChart3, Users, AlertCircle,
  Lock, Trophy, TrendingUp, TrendingDown, Award, Sigma, ArrowDownUp
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  Cell, PieChart, Pie, Legend
} from "recharts";
import { getExam, enterExamResults, getExamClassStudents, getExamMetrics } from "@/lib/api";
import type { ExamMetrics } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Exam, ExamResult } from "@/types";

interface Props {
  examId: string | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/* colour palette for grade bars */
const GRADE_COLORS: Record<string, string> = {
  "A+": "#10b981", A: "#34d399", B: "#60a5fa", C: "#f59e0b",
  D: "#fb923c", E: "#ef4444", F: "#dc2626",
};
const BAND_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#22c55e", "#10b981"];
const PASSFAIL_COLORS = ["#10b981", "#ef4444"];

export function ExamDetailsDialog({ examId, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const { isRole } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exam, setExam] = useState<Exam | null>(null);
  const [roster, setRoster] = useState<{ student_id: string; student_name: string; roll_number: string }[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [metrics, setMetrics] = useState<ExamMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [editedResults, setEditedResults] = useState<
    Record<string, { marks_obtained: string; is_absent: boolean; remarks: string }>
  >({});

  /* role-based edit access — admins always, teachers always (server rejects if unassigned) */
  const canEnterMarks = isRole("super_admin", "institute_admin", "faculty");

  /* ─── Load ─── */
  useEffect(() => {
    if (examId) loadAll(examId);
    else { setExam(null); setResults([]); setRoster([]); setMetrics(null); setEditedResults({}); }
  }, [examId]);

  const loadAll = async (id: string) => {
    setLoading(true);
    try {
      const [examRes, rosterRes] = await Promise.all([
        getExam(id),
        canEnterMarks ? getExamClassStudents(id) : Promise.resolve(null),
      ]);

      if (examRes.success && examRes.data) {
        const fetchedExam = examRes.data.exam;
        const fetchedResults = examRes.data.results || [];
        setExam(fetchedExam);
        setResults(fetchedResults);

        /* build result map for existing entries */
        const resultMap: Record<string, ExamResult> = {};
        fetchedResults.forEach(r => { resultMap[r.student_id] = r; });

        /* merge full roster (if available) with existing results */
        const students = rosterRes?.data?.students ?? [];
        setRoster(students);

        /* For students without entries yet, include them with blank marks */
        const allStudents = students.length > 0 ? students : fetchedResults.map(r => ({
          student_id: r.student_id,
          student_name: r.student_name ?? "",
          roll_number: r.roll_number ?? "",
        }));

        const initEdits: typeof editedResults = {};
        allStudents.forEach(s => {
          const existing = resultMap[s.student_id];
          initEdits[s.student_id] = {
            marks_obtained: existing?.marks_obtained?.toString() ?? "",
            is_absent: existing?.is_absent ?? false,
            remarks: existing?.remarks ?? "",
          };
        });
        setEditedResults(initEdits);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load exam", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    if (!examId || metrics) return;
    setMetricsLoading(true);
    try {
      const res = await getExamMetrics(examId);
      if (res.success && res.data) setMetrics(res.data);
    } catch { /* silent */ } finally { setMetricsLoading(false); }
  };

  /* ─── Save marks ─── */
  const handleSave = async () => {
    if (!exam) return;
    setSaving(true);
    try {
      const allStudents = roster.length > 0 ? roster : results.map(r => ({
        student_id: r.student_id, student_name: r.student_name ?? "", roll_number: r.roll_number ?? "",
      }));
      const payload = allStudents
        .filter(s => editedResults[s.student_id] !== undefined)
        .map(s => ({
          student_id: s.student_id,
          marks_obtained: editedResults[s.student_id].is_absent
            ? 0
            : Number(editedResults[s.student_id].marks_obtained),
          is_absent: editedResults[s.student_id].is_absent,
          remarks: editedResults[s.student_id].remarks,
        }));

      const res = await enterExamResults(exam.id, payload);
      if (res.success) {
        toast({ title: "Saved", description: "Marks entered. Ranks & grades calculated." });
        setMetrics(null); // reset so analytics reload fresh
        await loadAll(exam.id);
        onSuccess?.();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Save failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const updateField = (studentId: string, field: string, value: any) =>
    setEditedResults(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));

  /* ─── Derived display data ─── */
  const displayRoster = useMemo(() => {
    if (roster.length > 0) return roster;
    return results.map(r => ({ student_id: r.student_id, student_name: r.student_name ?? "", roll_number: r.roll_number ?? "" }));
  }, [roster, results]);

  const resultMap = useMemo(() => {
    const m: Record<string, ExamResult> = {};
    results.forEach(r => { m[r.student_id] = r; });
    return m;
  }, [results]);

  /* quick stats from existing results (pre-metrics endpoint) */
  const quickStats = useMemo(() => {
    const present = results.filter(r => !r.is_absent && r.marks_obtained != null);
    const marks = present.map(r => r.marks_obtained ?? 0);
    const avg = marks.length ? (marks.reduce((a, b) => a + b, 0) / marks.length) : 0;
    const passed = present.filter(r => (r.marks_obtained ?? 0) >= (exam?.passing_marks ?? 0)).length;
    const highest = marks.length ? Math.max(...marks) : 0;
    return { present: present.length, total: results.length, avg, passed, highest };
  }, [results, exam]);

  /* grade distribution for charts */
  const gradeData = useMemo(() => {
    if (!metrics) return [];
    return Object.entries(metrics.gradeDist)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([grade, count]) => ({ grade, count, fill: GRADE_COLORS[grade] ?? "#6366f1" }));
  }, [metrics]);

  if (!exam && !loading) return null;

  return (
    <Dialog open={!!examId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[960px] h-[88vh] flex flex-col p-0 overflow-hidden border-border/50 shadow-2xl">

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse text-sm">Loading exam…</p>
          </div>
        ) : exam && (
          <>
            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 p-6 pb-4 border-b border-border/40 shrink-0">
              <DialogHeader>
                <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-lg font-extrabold">{exam.name}</div>
                      <div className="text-sm font-medium text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-background/50 capitalize">{exam.exam_type?.replace("_", " ")}</Badge>
                        <span>·</span><span>{exam.class_name}</span>
                        {exam.subject_name && <><span>·</span><span>{exam.subject_name}</span></>}
                        {exam.exam_date && (
                          <><span>·</span><span>{new Date(exam.exam_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Marks info + lock indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-3 bg-background/60 backdrop-blur px-4 py-2 rounded-xl text-sm border border-border/50">
                      <div className="text-center">
                        <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Total</div>
                        <div className="font-extrabold">{exam.total_marks}</div>
                      </div>
                      <div className="w-px h-7 bg-border" />
                      <div className="text-center">
                        <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Pass</div>
                        <div className="font-extrabold text-amber-600">{exam.passing_marks}</div>
                      </div>
                      <div className="w-px h-7 bg-border" />
                      <div className="text-center">
                        <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Students</div>
                        <div className="font-extrabold">{displayRoster.length || results.length}</div>
                      </div>
                    </div>
                    {!canEnterMarks && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-lg border">
                        <Lock className="h-3 w-3" /> Read-only
                      </div>
                    )}
                  </div>
                </DialogTitle>
              </DialogHeader>
            </div>

            <Tabs defaultValue={canEnterMarks ? "entry" : "ranks"} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 border-b border-border/40 shrink-0">
                <TabsList className="h-12 bg-transparent gap-4 sm:gap-6">
                  {[
                    canEnterMarks && { value: "entry",    label: "Result Entry",   icon: Users },
                    { value: "ranks",    label: "Rank List",      icon: Trophy },
                    { value: "analysis", label: "Analytics",      icon: BarChart3 },
                  ].filter(Boolean).map((t: any) => (
                    <TabsTrigger key={t.value} value={t.value}
                      onClick={() => t.value === "analysis" && loadMetrics()}
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-0 font-medium pb-2 pt-4 flex items-center gap-1.5">
                      <t.icon className="h-4 w-4" />{t.label}
                    </TabsTrigger>
                  ))}
                  {!canEnterMarks && (
                    <TabsTrigger value="entry" disabled className="hidden" />
                  )}
                </TabsList>
              </div>

              {/* ══════════════ RESULT ENTRY TAB ══════════════ */}
              {canEnterMarks && (
                <TabsContent value="entry" className="flex-1 flex flex-col overflow-hidden m-0 border-none outline-none">
                  <div className="px-6 py-3 bg-muted/20 border-b border-border/40 flex items-center justify-between shrink-0 gap-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Enter marks for all students. Ranks, grades &amp; percentiles auto-calculate on save.
                    </p>
                    <Button onClick={handleSave} disabled={saving} size="sm"
                      className="rounded-lg shadow bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shrink-0">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                      Save & Calculate
                    </Button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-5">
                      {displayRoster.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
                          <Users className="h-12 w-12 text-muted-foreground/30" />
                          <p className="text-sm">No students enrolled in this class yet.</p>
                        </div>
                      ) : (
                        <div className="border border-border/50 rounded-xl overflow-hidden shadow-sm">
                          <Table>
                            <TableHeader className="bg-muted/40 sticky top-0 z-10">
                              <TableRow>
                                <TableHead className="w-16">Roll</TableHead>
                                <TableHead>Student</TableHead>
                                <TableHead className="w-20 text-center">Absent</TableHead>
                                <TableHead className="w-32">Marks<span className="text-[10px] text-muted-foreground font-normal ml-1">/{exam.total_marks}</span></TableHead>
                                <TableHead className="w-20">Grade</TableHead>
                                <TableHead className="w-20">Rank</TableHead>
                                <TableHead>Remarks</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {displayRoster.map((s) => {
                                const saved = resultMap[s.student_id];
                                const ed = editedResults[s.student_id] ?? { marks_obtained: "", is_absent: false, remarks: "" };
                                const marksNum = Number(ed.marks_obtained);
                                const pct = ed.marks_obtained && !ed.is_absent ? (marksNum / (exam.total_marks || 100)) * 100 : null;
                                return (
                                  <TableRow key={s.student_id} className={cn("hover:bg-muted/20", ed.is_absent && "opacity-50 bg-muted/10")}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{s.roll_number || "—"}</TableCell>
                                    <TableCell>
                                      <div className="font-semibold text-sm">{s.student_name}</div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Checkbox checked={ed.is_absent}
                                        onCheckedChange={(v) => updateField(s.student_id, "is_absent", v)} />
                                    </TableCell>
                                    <TableCell>
                                      <div className="space-y-1">
                                        <Input type="number" className="h-8 w-full rounded-lg border-border/50 text-center text-sm"
                                          value={ed.is_absent ? "" : ed.marks_obtained}
                                          disabled={ed.is_absent} max={exam.total_marks} min={0}
                                          onChange={(e) => updateField(s.student_id, "marks_obtained", e.target.value)}
                                          placeholder="—" />
                                        {pct !== null && (
                                          <Progress value={pct} className={cn("h-1",
                                            pct >= 75 ? "bg-emerald-500/20" : pct >= 50 ? "bg-amber-500/20" : "bg-rose-500/20"
                                          )} />
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {saved?.grade
                                        ? <Badge variant="secondary" className="font-extrabold text-xs" style={{ background: `${GRADE_COLORS[saved.grade]}20`, color: GRADE_COLORS[saved.grade] ?? undefined }}>{saved.grade}</Badge>
                                        : <span className="text-muted-foreground text-xs block text-center">—</span>}
                                    </TableCell>
                                    <TableCell>
                                      {saved?.rank
                                        ? <Badge variant="outline" className="text-xs font-bold">#{saved.rank}</Badge>
                                        : <span className="text-muted-foreground text-xs block text-center">—</span>}
                                    </TableCell>
                                    <TableCell>
                                      <Input className="h-8 w-full rounded-lg border-border/50 text-xs"
                                        value={ed.remarks}
                                        onChange={(e) => updateField(s.student_id, "remarks", e.target.value)}
                                        placeholder="Optional" />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}

              {/* ══════════════ RANK LIST TAB ══════════════ */}
              <TabsContent value="ranks" className="flex-1 flex flex-col overflow-hidden m-0 border-none outline-none">
                <div className="px-6 py-3 bg-muted/20 border-b border-border/40 shrink-0 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ArrowDownUp className="h-3.5 w-3.5" /> Students sorted by rank · percentile shows position in class
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {results.filter(r => !r.is_absent).length} ranked
                  </Badge>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-5">
                    {results.filter(r => !r.is_absent).length === 0 ? (
                      <div className="text-center py-16 flex flex-col items-center gap-3 text-muted-foreground">
                        <Trophy className="h-12 w-12 text-muted-foreground/25" />
                        <p className="text-sm">No results entered yet{canEnterMarks ? " — go to Result Entry to add marks." : "."}</p>
                      </div>
                    ) : (
                      <div className="border border-border/50 rounded-xl overflow-hidden shadow-sm">
                        <Table>
                          <TableHeader className="bg-muted/40">
                            <TableRow>
                              <TableHead className="w-16 text-center">Rank</TableHead>
                              <TableHead className="w-16">Roll</TableHead>
                              <TableHead>Student</TableHead>
                              <TableHead className="w-24 text-center">Marks</TableHead>
                              <TableHead className="w-20 text-center">%</TableHead>
                              <TableHead className="w-20 text-center">Grade</TableHead>
                              <TableHead className="w-24 text-center">Percentile</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[...results]
                              .filter(r => !r.is_absent && r.marks_obtained != null)
                              .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))
                              .map((r, i) => {
                                const pct = ((r.marks_obtained ?? 0) / (exam.total_marks || 100)) * 100;
                                const topThree = (r.rank ?? 9999) <= 3;
                                return (
                                  <TableRow key={r.id ?? r.student_id} className={cn("hover:bg-muted/20", topThree && "bg-amber-500/5")}>
                                    <TableCell className="text-center">
                                      {r.rank === 1 ? <span className="text-lg">🥇</span>
                                        : r.rank === 2 ? <span className="text-lg">🥈</span>
                                        : r.rank === 3 ? <span className="text-lg">🥉</span>
                                        : <span className="font-bold text-sm text-muted-foreground">#{r.rank}</span>}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{r.roll_number ?? "—"}</TableCell>
                                    <TableCell className="font-semibold text-sm">{r.student_name}</TableCell>
                                    <TableCell className="text-center">
                                      <span className="font-bold">{r.marks_obtained}</span>
                                      <span className="text-muted-foreground text-xs">/{exam.total_marks}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <span className={cn("text-xs font-extrabold",
                                        pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-500" : "text-rose-600")}>
                                        {pct.toFixed(1)}%
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {r.grade
                                        ? <Badge className="text-xs font-bold" style={{ background: `${GRADE_COLORS[r.grade] ?? "#6366f1"}20`, color: GRADE_COLORS[r.grade] ?? "#6366f1" }}>{r.grade}</Badge>
                                        : <span className="text-muted-foreground text-xs">—</span>}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span className="text-xs font-extrabold text-primary">
                                          {/* compute client-side approximation when metrics not loaded */}
                                          {i === 0 && results.filter(r2 => !r2.is_absent).length > 1
                                            ? "—"
                                            : `${Math.round(((results.filter(r2 => !r2.is_absent && (r2.marks_obtained ?? 0) < (r.marks_obtained ?? 0)).length) / Math.max(1, results.filter(r2 => !r2.is_absent).length - 1)) * 100)}ᵖ`
                                          }
                                        </span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ══════════════ ANALYTICS TAB ══════════════ */}
              <TabsContent value="analysis" className="flex-1 overflow-auto m-0 border-none outline-none">
                <div className="p-5 space-y-6">
                  {metricsLoading ? (
                    <div className="flex items-center justify-center h-64 gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Computing metrics…</span>
                    </div>
                  ) : metrics ? (
                    <>
                      {/* Metric cards row */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                          { label: "Average", value: `${metrics.avg}`, sub: `/ ${exam.total_marks}`, icon: Sigma, color: "text-blue-600", bg: "bg-blue-500/10" },
                          { label: "Median", value: `${metrics.median}`, sub: null, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-500/10" },
                          { label: "Highest", value: `${metrics.highest}`, sub: null, icon: Award, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                          { label: "Lowest", value: `${metrics.lowest}`, sub: null, icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-500/10" },
                          { label: "Pass %", value: `${metrics.passPercentage}%`, sub: `${metrics.passed}/${metrics.present}`, icon: GraduationCap, color: "text-green-600", bg: "bg-green-500/10" },
                          { label: "Std Dev", value: `${metrics.stdDev}`, sub: "marks", icon: BarChart3, color: "text-violet-600", bg: "bg-violet-500/10" },
                        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                          <div key={label} className="p-3 rounded-xl border border-border/50 bg-card shadow-sm">
                            <div className={cn("p-1.5 rounded-lg w-fit mb-2", bg)}>
                              <Icon className={cn("h-3.5 w-3.5", color)} />
                            </div>
                            <p className={cn("text-xl font-extrabold leading-none", color)}>{value}</p>
                            {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Charts row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Pass / Fail donut */}
                        <div className="border border-border/50 rounded-xl p-4 bg-card shadow-sm">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Pass / Fail</h4>
                          <div className="h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={[
                                    { name: `Pass (${metrics.passed})`, value: metrics.passed },
                                    { name: `Fail (${metrics.failed})`, value: metrics.failed },
                                  ]}
                                  cx="50%" cy="50%" innerRadius={44} outerRadius={70}
                                  dataKey="value" stroke="none">
                                  {[0, 1].map(i => <Cell key={i} fill={PASSFAIL_COLORS[i]} />)}
                                </Pie>
                                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-foreground">{v}</span>} />
                                <RTooltip contentStyle={{ borderRadius: "8px", fontSize: "12px", border: "1px solid hsl(var(--border))" }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Grade distribution */}
                        <div className="border border-border/50 rounded-xl p-4 bg-card shadow-sm">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Grade Distribution</h4>
                          {gradeData.length > 0 ? (
                            <div className="h-[180px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={gradeData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                                  <XAxis dataKey="grade" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                  <RTooltip contentStyle={{ borderRadius: "8px", fontSize: "12px", border: "1px solid hsl(var(--border))" }} formatter={(v) => [v, "Students"]} />
                                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                                    {gradeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">No grade data yet</div>
                          )}
                        </div>

                        {/* Score band distribution */}
                        <div className="border border-border/50 rounded-xl p-4 bg-card shadow-sm">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Score Bands</h4>
                          <div className="h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={metrics.scoreBands} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                                <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                <RTooltip contentStyle={{ borderRadius: "8px", fontSize: "12px", border: "1px solid hsl(var(--border))" }} formatter={(v) => [v, "Students"]} />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                                  {metrics.scoreBands.map((_, i) => <Cell key={i} fill={BAND_COLORS[i]} />)}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Rank list with percentile (from metrics) */}
                      {metrics.rankList.length > 0 && (
                        <div className="border border-border/50 rounded-xl overflow-hidden shadow-sm">
                          <div className="px-4 py-3 bg-muted/30 border-b border-border/40 flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-bold">Full Rank &amp; Percentile Report</span>
                          </div>
                          <Table>
                            <TableHeader className="bg-muted/20">
                              <TableRow>
                                <TableHead className="w-16 text-center">Rank</TableHead>
                                <TableHead>Student</TableHead>
                                <TableHead className="w-24 text-center">Marks</TableHead>
                                <TableHead className="w-20 text-center">Score %</TableHead>
                                <TableHead className="w-20 text-center">Grade</TableHead>
                                <TableHead className="w-28 text-center">Percentile</TableHead>
                                <TableHead className="w-40">Distribution</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {metrics.rankList.map((r) => (
                                <TableRow key={r.student_id} className="hover:bg-muted/10">
                                  <TableCell className="text-center font-bold">
                                    {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `#${r.rank}`}
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-semibold text-sm">{r.student_name}</div>
                                    <div className="text-[10px] text-muted-foreground">{r.roll_number}</div>
                                  </TableCell>
                                  <TableCell className="text-center font-bold">{r.marks_obtained}<span className="text-muted-foreground text-xs font-normal">/{exam.total_marks}</span></TableCell>
                                  <TableCell className="text-center">
                                    <span className={cn("text-xs font-extrabold",
                                      r.percentage >= 75 ? "text-emerald-600" : r.percentage >= 50 ? "text-amber-500" : "text-rose-600")}>
                                      {r.percentage}%
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {r.grade
                                      ? <Badge className="text-xs font-bold" style={{ background: `${GRADE_COLORS[r.grade] ?? "#6366f1"}20`, color: GRADE_COLORS[r.grade] ?? "#6366f1" }}>{r.grade}</Badge>
                                      : "—"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className={cn("text-sm font-extrabold",
                                      r.percentile >= 75 ? "text-emerald-600" : r.percentile >= 50 ? "text-primary" : "text-rose-600")}>
                                      {r.percentile}ᵖ
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">top {100 - r.percentile}%</div>
                                  </TableCell>
                                  <TableCell>
                                    <Progress value={r.percentage} className={cn("h-1.5",
                                      r.percentage >= 75 ? "bg-emerald-500/20" : r.percentage >= 50 ? "bg-amber-500/20" : "bg-rose-500/20"
                                    )} />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </>
                  ) : (
                    /* quick stats (pre-metrics) */
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: "Average Marks", value: `${quickStats.avg.toFixed(1)}`, sub: `/ ${exam.total_marks}`, color: "from-blue-500/5 to-cyan-500/5" },
                          { label: "Pass Percentage",value: `${quickStats.total ? Math.round((quickStats.passed / quickStats.present) * 100) : 0}%`, sub: `${quickStats.passed} passed`, color: "from-emerald-500/5 to-teal-500/5" },
                          { label: "Highest Marks",  value: `${quickStats.highest}`, sub: `/ ${exam.total_marks}`, color: "from-amber-500/5 to-orange-500/5" },
                          { label: "Students Graded",value: `${quickStats.present}`, sub: `of ${quickStats.total} total`, color: "from-violet-500/5 to-purple-500/5" },
                        ].map(m => (
                          <div key={m.label} className={cn("p-4 rounded-xl border border-border/50 bg-gradient-to-br shadow-sm", m.color)}>
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{m.label}</p>
                            <p className="text-3xl font-extrabold">{m.value}</p>
                            {m.sub && <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p>}
                          </div>
                        ))}
                      </div>
                      <div className="p-10 text-center rounded-xl border border-dashed border-border flex flex-col items-center gap-3">
                        <BarChart3 className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">
                          {results.length === 0
                            ? "Enter marks first, then come back for full analytics."
                            : "Click the Analytics tab again to load full metrics (grade distribution, score bands, percentiles)."}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}


interface ExamDetailsDialogProps {
    examId: string | null;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ExamDetailsDialog({ examId, onOpenChange, onSuccess }: ExamDetailsDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exam, setExam] = useState<Exam | null>(null);
    const [results, setResults] = useState<ExamResult[]>([]);
    const [editedResults, setEditedResults] = useState<Record<string, { marks_obtained: string, is_absent: boolean, remarks: string }>>({});

    useEffect(() => {
        if (examId) {
            loadExamDetails(examId);
        } else {
            setExam(null);
            setResults([]);
            setEditedResults({});
        }
    }, [examId]);

    const loadExamDetails = async (id: string) => {
        try {
            setLoading(true);
            const res = await getExam(id);
            if (res.success && res.data) {
                setExam(res.data.exam);
                const fetchedResults = res.data.results || [];
                setResults(fetchedResults);

                // Initialize editable state
                const initialEdits: Record<string, any> = {};
                fetchedResults.forEach(r => {
                    initialEdits[r.student_id] = {
                        marks_obtained: r.marks_obtained?.toString() || "",
                        is_absent: r.is_absent || false,
                        remarks: r.remarks || ""
                    };
                });
                setEditedResults(initialEdits);
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to load exam details", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveMarks = async () => {
        if (!exam) return;
        try {
            setSaving(true);

            const payload = Object.entries(editedResults).map(([student_id, data]) => ({
                student_id,
                marks_obtained: data.is_absent ? 0 : Number(data.marks_obtained),
                is_absent: data.is_absent,
                remarks: data.remarks
            }));

            const res = await enterExamResults(exam.id, payload);

            if (res.success) {
                toast({ title: "Success", description: "Exam marks saved successfully." });
                loadExamDetails(exam.id); // Reload to get updated grades/ranks
                if (onSuccess) onSuccess();
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to save marks", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleEditChange = (studentId: string, field: string, value: any) => {
        setEditedResults(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
    };

    // --- Analysis Computations ---
    const presentStudents = results.filter(r => !r.is_absent && r.marks_obtained != null);
    const totalStudents = results.length;
    const attendancePercentage = totalStudents ? Math.round((presentStudents.length / totalStudents) * 100) : 0;

    const totalMarks = presentStudents.reduce((acc, curr) => acc + (curr.marks_obtained || 0), 0);
    const averageMarks = presentStudents.length ? (totalMarks / presentStudents.length).toFixed(1) : 0;

    const passedStudents = presentStudents.filter(r => (r.marks_obtained || 0) >= (exam?.passing_marks || 0));
    const passPercentage = presentStudents.length ? Math.round((passedStudents.length / presentStudents.length) * 100) : 0;

    const highestMarks = presentStudents.length ? Math.max(...presentStudents.map(r => r.marks_obtained || 0)) : 0;

    if (!exam && !loading) return null;

    return (
        <Dialog open={!!examId} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] h-[85vh] flex flex-col p-0 overflow-hidden border-border/50 shadow-2xl">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-background">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground animate-pulse">Loading exam details...</p>
                    </div>
                ) : exam && (
                    <>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 p-6 pb-4 border-b border-border/40 shrink-0">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                            <GraduationCap className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <div>{exam.name}</div>
                                            <div className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-2">
                                                <Badge variant="outline" className="bg-background/50 backdrop-blur capitalize">{exam.exam_type}</Badge>
                                                <span>•</span>
                                                <span>{exam.class_name}</span>
                                                {exam.subject_name && (
                                                    <><span>•</span><span>{exam.subject_name}</span></>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-background/60 backdrop-blur px-4 py-2 rounded-xl text-sm border border-border/50">
                                        <div className="text-center">
                                            <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total</div>
                                            <div className="font-bold">{exam.total_marks}</div>
                                        </div>
                                        <div className="w-px h-8 bg-border"></div>
                                        <div className="text-center">
                                            <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Passing</div>
                                            <div className="font-bold text-amber-600 dark:text-amber-500">{exam.passing_marks}</div>
                                        </div>
                                    </div>
                                </DialogTitle>
                            </DialogHeader>
                        </div>

                        <Tabs defaultValue="grading" className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-6 border-b border-border/40 shrink-0">
                                <TabsList className="h-12 bg-transparent gap-6">
                                    <TabsTrigger
                                        value="grading"
                                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-0 font-medium pb-2 pt-4"
                                    >
                                        Result Entry
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="analysis"
                                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-0 font-medium pb-2 pt-4"
                                    >
                                        Performance Analysis
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* GRADING TAB */}
                            <TabsContent value="grading" className="flex-1 flex flex-col overflow-hidden m-0 border-none outline-none">
                                <div className="px-6 py-4 bg-muted/20 border-b border-border/40 flex justify-between items-center shrink-0">
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Subject Teachers: Enter marks below. Auto-grading will compute ranks upon saving.
                                    </p>
                                    <Button
                                        onClick={handleSaveMarks}
                                        disabled={saving}
                                        className="rounded-xl shadow-md bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                        Save Marks & Grade
                                    </Button>
                                </div>

                                <ScrollArea className="flex-1">
                                    <div className="p-6">
                                        {results.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                                                <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
                                                <p>No students enrolled in this class yet.</p>
                                            </div>
                                        ) : (
                                            <div className="border border-border/50 rounded-xl overflow-hidden shadow-sm">
                                                <Table>
                                                    <TableHeader className="bg-muted/40">
                                                        <TableRow>
                                                            <TableHead className="w-16">Roll No</TableHead>
                                                            <TableHead>Student Name</TableHead>
                                                            <TableHead className="w-24 text-center">Absent</TableHead>
                                                            <TableHead className="w-32">Marks</TableHead>
                                                            <TableHead className="w-20">Grade</TableHead>
                                                            <TableHead className="w-20">Rank</TableHead>
                                                            <TableHead>Remarks</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {results.map((r) => {
                                                            const editData = editedResults[r.student_id] || { marks_obtained: '', is_absent: false, remarks: '' };
                                                            return (
                                                                <TableRow key={r.id} className="hover:bg-muted/10">
                                                                    <TableCell className="font-medium text-muted-foreground">{r.roll_number}</TableCell>
                                                                    <TableCell className="font-semibold">{r.student_name}</TableCell>
                                                                    <TableCell className="text-center">
                                                                        <Checkbox
                                                                            checked={editData.is_absent}
                                                                            onCheckedChange={(c) => handleEditChange(r.student_id, 'is_absent', c)}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Input
                                                                            type="number"
                                                                            className="h-9 w-full rounded-lg border-border/50 text-center"
                                                                            value={editData.is_absent ? '' : editData.marks_obtained}
                                                                            disabled={editData.is_absent}
                                                                            max={exam.total_marks}
                                                                            min={0}
                                                                            onChange={(e) => handleEditChange(r.student_id, 'marks_obtained', e.target.value)}
                                                                            placeholder="-"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {r.grade ? <Badge variant="secondary" className="font-bold">{r.grade}</Badge> : <span className="text-muted-foreground text-xs block text-center">—</span>}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {r.rank ? <Badge variant="outline">#{r.rank}</Badge> : <span className="text-muted-foreground text-xs block text-center">—</span>}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Input
                                                                            className="h-9 w-full rounded-lg border-border/50 text-xs"
                                                                            value={editData.remarks}
                                                                            onChange={(e) => handleEditChange(r.student_id, 'remarks', e.target.value)}
                                                                            placeholder="Optional remark"
                                                                        />
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            {/* ANALYSIS TAB */}
                            <TabsContent value="analysis" className="flex-1 overflow-auto m-0 border-none outline-none bg-background p-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    <div className="p-4 rounded-xl border border-border/50 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 shadow-sm">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Average Marks</p>
                                        <p className="text-3xl font-bold flex items-baseline gap-1">
                                            {averageMarks} <span className="text-sm font-medium text-muted-foreground">/ {exam.total_marks}</span>
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-xl border border-border/50 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 shadow-sm">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Pass Percentage</p>
                                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{passPercentage}%</p>
                                    </div>

                                    <div className="p-4 rounded-xl border border-border/50 bg-gradient-to-br from-amber-500/5 to-orange-500/5 shadow-sm">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Highest Marks</p>
                                        <p className="text-3xl font-bold flex items-baseline gap-1">
                                            {highestMarks} <span className="text-sm font-medium text-muted-foreground">/ {exam.total_marks}</span>
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-xl border border-border/50 bg-gradient-to-br from-purple-500/5 to-pink-500/5 shadow-sm">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Attendance</p>
                                        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{attendancePercentage}%</p>
                                    </div>
                                </div>

                                <div className="p-12 text-center rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
                                    <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                    <h3 className="text-lg font-semibold">Detailed Analytics</h3>
                                    <p className="text-muted-foreground text-sm max-w-md mx-auto mt-2">
                                        Advanced charts and distribution trends will be rendered here based on the graded marks.
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
