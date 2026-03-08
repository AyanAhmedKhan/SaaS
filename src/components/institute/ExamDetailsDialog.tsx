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
  const [editedResults, setEditedResults] = useState<
    Record<string, { marks_obtained: string; is_absent: boolean; remarks: string }>
  >({});
  const [serverMetrics, setServerMetrics] = useState<ExamMetrics | null>(null);

  /* role-based edit access — admins always, teachers always (server rejects if unassigned) */
  const canEnterMarks = isRole("super_admin", "institute_admin", "faculty");

  /* ─── Load ─── */
  useEffect(() => {
    if (examId) loadAll(examId);
    else { setExam(null); setResults([]); setRoster([]); setEditedResults({}); setServerMetrics(null); }
  }, [examId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAll = async (id: string) => {
    setLoading(true);
    try {
      const [examRes, rosterRes, metricsRes] = await Promise.all([
        getExam(id),
        canEnterMarks ? getExamClassStudents(id) : Promise.resolve(null),
        getExamMetrics(id),
      ]);

      if (metricsRes.success && metricsRes.data) {
        setServerMetrics(metricsRes.data);
      }

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
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to load exam", variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
        await loadAll(exam.id);
        onSuccess?.();
      }
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Save failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const updateField = (studentId: string, field: string, value: string | boolean) =>
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


  /* Grade chart data - derived from server metrics */
  const gradeData = useMemo(() => {
    if (!serverMetrics) return [];
    return Object.entries(serverMetrics.gradeDist)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([grade, count]) => ({ grade, count, fill: GRADE_COLORS[grade] ?? "#6366f1" }));
  }, [serverMetrics]);

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
                  ].filter(Boolean).map((t) => (
                    <TabsTrigger key={t.value} value={t.value}
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
                <TabsContent value="entry" className="flex-1 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden m-0 border-none outline-none">
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
              <TabsContent value="ranks" className="flex-1 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden m-0 border-none outline-none">
                <div className="px-6 py-3 bg-muted/20 border-b border-border/40 shrink-0 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ArrowDownUp className="h-3.5 w-3.5" /> Students sorted by rank · percentile computed from class results
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {serverMetrics?.present ?? 0} ranked
                  </Badge>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-5">
                    {!serverMetrics || serverMetrics.rankList.length === 0 ? (
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
                            {serverMetrics.rankList.map((r) => {
                              const topThree = r.rank != null && r.rank <= 3;
                              return (
                                <TableRow key={r.student_id} className={cn("hover:bg-muted/20", topThree && "bg-amber-500/5")}>
                                  <TableCell className="text-center">
                                    {r.rank === 1 ? <span className="text-lg">🥇</span>
                                      : r.rank === 2 ? <span className="text-lg">🥈</span>
                                      : r.rank === 3 ? <span className="text-lg">🥉</span>
                                      : r.rank != null ? <span className="font-bold text-sm text-muted-foreground">#{r.rank}</span>
                                      : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs text-muted-foreground">{r.roll_number || "—"}</TableCell>
                                  <TableCell className="font-semibold text-sm">{r.student_name}</TableCell>
                                  <TableCell className="text-center">
                                    <span className="font-bold">{r.marks_obtained}</span>
                                    <span className="text-muted-foreground text-xs">/{exam.total_marks}</span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className={cn("text-xs font-extrabold",
                                      r.percentage >= 75 ? "text-emerald-600" : r.percentage >= 50 ? "text-amber-500" : "text-rose-600")}>
                                      {r.percentage}%
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {r.grade
                                      ? <Badge className="text-xs font-bold" style={{ background: `${GRADE_COLORS[r.grade] ?? "#6366f1"}20`, color: GRADE_COLORS[r.grade] ?? "#6366f1" }}>{r.grade}</Badge>
                                      : <span className="text-muted-foreground text-xs">—</span>}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className={cn("text-sm font-extrabold",
                                      r.percentile >= 75 ? "text-emerald-600" : r.percentile >= 50 ? "text-primary" : "text-rose-600")}>
                                      {r.percentile}ᵖ
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">top {100 - r.percentile}%</div>
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
              <TabsContent value="analysis" className="flex-1 data-[state=active]:block overflow-auto m-0 border-none outline-none">
                <div className="p-5 space-y-6">
                  {!serverMetrics ? (
                    <div className="p-10 text-center rounded-xl border border-dashed border-border flex flex-col items-center gap-3">
                      <BarChart3 className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">Enter marks first to unlock analytics.</p>
                    </div>
                  ) : (
                    <>
                      {/* Metric cards row */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                          { label: "Average",  value: `${serverMetrics.avg}`,            sub: `/ ${exam.total_marks}`,                       icon: Sigma,        color: "text-blue-600",   bg: "bg-blue-500/10" },
                          { label: "Median",   value: `${serverMetrics.median}`,          sub: null,                                          icon: TrendingUp,   color: "text-indigo-600", bg: "bg-indigo-500/10" },
                          { label: "Highest",  value: `${serverMetrics.highest}`,         sub: null,                                          icon: Award,        color: "text-emerald-600",bg: "bg-emerald-500/10" },
                          { label: "Lowest",   value: `${serverMetrics.lowest}`,          sub: null,                                          icon: TrendingDown, color: "text-rose-600",   bg: "bg-rose-500/10" },
                          { label: "Pass %",   value: `${serverMetrics.passPercentage}%`, sub: `${serverMetrics.passed}/${serverMetrics.present}`, icon: GraduationCap, color: "text-green-600",  bg: "bg-green-500/10" },
                          { label: "Std Dev",  value: `${serverMetrics.stdDev}`,          sub: "marks",                                       icon: BarChart3,    color: "text-violet-600", bg: "bg-violet-500/10" },
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
                                    { name: `Pass (${serverMetrics.passed})`, value: serverMetrics.passed },
                                    { name: `Fail (${serverMetrics.failed})`, value: serverMetrics.failed },
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
                              <BarChart data={serverMetrics.scoreBands} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                                <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                <RTooltip contentStyle={{ borderRadius: "8px", fontSize: "12px", border: "1px solid hsl(var(--border))" }} formatter={(v) => [v, "Students"]} />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                                  {serverMetrics.scoreBands.map((_, i) => <Cell key={i} fill={BAND_COLORS[i]} />)}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Rank list with percentile (client-computed) */}
                      {serverMetrics.rankList.length > 0 && (
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
                              {serverMetrics.rankList.map((r) => (
                                <TableRow key={r.student_id} className="hover:bg-muted/10">
                                  <TableCell className="text-center font-bold">
                                    {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank != null ? `#${r.rank}` : "—"}
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
