import { useState, useEffect, useCallback, useMemo } from "react";
import { BookOpen, CheckCircle2, Clock, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getSyllabus, getClasses, getSubjects } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { SyllabusEntry, Class as ClassType, Subject } from "@/types";

interface GroupedUnit {
  unitName: string;
  topics: SyllabusEntry[];
}

interface GroupedSubject {
  subjectName: string;
  units: GroupedUnit[];
  completed: number;
  total: number;
}

const statusLabel: Record<string, string> = {
  completed: "Completed",
  in_progress: "In Progress",
  not_started: "Upcoming",
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>;
    case "in_progress":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">In Progress</Badge>;
    default:
      return <Badge variant="outline" className="text-muted-foreground">Upcoming</Badge>;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "in_progress":
      return <Clock className="h-4 w-4 text-amber-500" />;
    default:
      return <ChevronRight className="h-4 w-4 text-muted-foreground" />;
  }
};

export default function Syllabus() {
  const { isRole } = useAuth();
  const [entries, setEntries] = useState<SyllabusEntry[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const showClassFilter = isRole('super_admin', 'institute_admin', 'class_teacher', 'subject_teacher');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (classFilter !== "all") params.class_id = classFilter;
      if (subjectFilter !== "all") params.subject_id = subjectFilter;

      const [syllRes, clsRes] = await Promise.all([
        getSyllabus(params),
        showClassFilter ? getClasses() : Promise.resolve(null),
      ]);

      if (syllRes.success && syllRes.data) {
        setEntries((syllRes.data as { syllabus: SyllabusEntry[] }).syllabus || []);
      }
      if (clsRes?.success && clsRes.data) {
        setClasses((clsRes.data as { classes: ClassType[] }).classes || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load syllabus");
    } finally {
      setLoading(false);
    }
  }, [classFilter, subjectFilter, showClassFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group flat entries into subjects → units → topics
  const grouped: GroupedSubject[] = useMemo(() => {
    const subjectMap = new Map<string, SyllabusEntry[]>();
    entries.forEach(e => {
      const key = e.subject_name || "Unknown Subject";
      const arr = subjectMap.get(key) || [];
      arr.push(e);
      subjectMap.set(key, arr);
    });

    return Array.from(subjectMap.entries()).map(([subjectName, subEntries]) => {
      const unitMap = new Map<string, SyllabusEntry[]>();
      subEntries.forEach(e => {
        const uKey = e.unit_name || "General";
        const arr = unitMap.get(uKey) || [];
        arr.push(e);
        unitMap.set(uKey, arr);
      });

      const units: GroupedUnit[] = Array.from(unitMap.entries()).map(([unitName, topics]) => ({
        unitName,
        topics,
      }));

      const completed = subEntries.filter(e => e.status === "completed").length;
      return { subjectName, units, completed, total: subEntries.length };
    });
  }, [entries]);

  // Unique subject names for filter
  const subjectNames = useMemo(
    () => Array.from(new Set(entries.map(e => e.subject_name).filter(Boolean))),
    [entries]
  );

  // Overall
  const totalCompleted = grouped.reduce((s, g) => s + g.completed, 0);
  const totalEntries = grouped.reduce((s, g) => s + g.total, 0);
  const overallProgress = totalEntries > 0 ? Math.round((totalCompleted / totalEntries) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Syllabus</h1>
            <p className="text-muted-foreground text-sm">Track syllabus coverage and topic completion.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {showClassFilter && (
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading syllabus...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive/60" />
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-semibold">No Syllabus Entries</h3>
            <p className="text-muted-foreground text-sm mt-1">No syllabus data found for the selected class.</p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <>
            {/* Overall Progress */}
            <Card className="shadow-card border-border/40">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Overall Progress</h3>
                      <p className="text-sm text-muted-foreground">{totalCompleted} of {totalEntries} topics completed</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-primary">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-3" />
              </CardContent>
            </Card>

            {/* Subject Cards */}
            <div className="grid gap-6">
              {grouped.map((subject) => {
                const progress = subject.total > 0 ? Math.round((subject.completed / subject.total) * 100) : 0;

                return (
                  <Card key={subject.subjectName} className="shadow-card overflow-hidden border-border/40">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{subject.subjectName}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {subject.completed}/{subject.total} topics • {progress}% complete
                            </p>
                          </div>
                        </div>
                        <div className="hidden sm:block w-32">
                          <Progress value={progress} className="h-2" />
                        </div>
                      </div>
                      <div className="sm:hidden mt-2">
                        <Progress value={progress} className="h-2" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Accordion type="multiple" className="w-full">
                        {subject.units.map((unit, uIdx) => {
                          const completedTopics = unit.topics.filter(t => t.status === 'completed').length;
                          const inProgressTopics = unit.topics.filter(t => t.status === 'in_progress').length;

                          return (
                            <AccordionItem key={uIdx} value={`${subject.subjectName}-${uIdx}`} className="border-b-0">
                              <AccordionTrigger className="hover:no-underline py-3 text-left">
                                <div className="flex items-center gap-3 flex-1 mr-4">
                                  <div className={`h-2 w-2 rounded-full ${
                                    completedTopics === unit.topics.length
                                      ? 'bg-green-500'
                                      : inProgressTopics > 0
                                        ? 'bg-amber-500'
                                        : 'bg-muted-foreground/30'
                                  }`} />
                                  <span className="font-medium text-sm">{unit.unitName}</span>
                                  <span className="text-xs text-muted-foreground ml-auto mr-2">
                                    {completedTopics}/{unit.topics.length} topics
                                  </span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="pl-5 space-y-2">
                                  {unit.topics.map((topic) => (
                                    <div
                                      key={topic.id}
                                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        {getStatusIcon(topic.status)}
                                        <span className="text-sm">{topic.topic_name}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        {topic.completion_percentage > 0 && topic.status !== 'completed' && (
                                          <span className="text-xs text-muted-foreground hidden sm:block">
                                            {topic.completion_percentage}%
                                          </span>
                                        )}
                                        {getStatusBadge(topic.status)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
