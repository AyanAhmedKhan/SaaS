import { useState, useEffect, useCallback } from "react";
import { Plus, Search, FileText, Calendar, Clock, CheckCircle2, AlertCircle, Loader2, Upload, ChevronRight, Award } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAssignments, getClasses, getSubjects } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { Assignment, Class as ClassType, Subject } from "@/types";
import { AssignmentManagement } from "@/components/teacher/AssignmentManagement";
import { StudentAssignmentDetailsDialog } from "@/components/student/StudentAssignmentDetailsDialog";

export default function Assignments() {
  const { isRole } = useAuth();
  const isStaff = isRole('super_admin', 'institute_admin', 'faculty');

  if (isStaff) {
    return (
      <DashboardLayout>
        <div className="space-y-6 page-enter pt-4 sm:pt-6">
          <AssignmentManagement />
        </div>
      </DashboardLayout>
    );
  }

  return <StudentAssignments />;
}

function StudentAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (classFilter !== "all") params.class_id = classFilter;
      if (subjectFilter !== "all") params.subject_id = subjectFilter;
      if (searchQuery) params.search = searchQuery;

      const [assignRes, classRes, subjectRes] = await Promise.all([
        getAssignments(params),
        getClasses(),
        getSubjects(),
      ]);

      if (assignRes.success && assignRes.data) {
        setAssignments((assignRes.data as { assignments: Assignment[] }).assignments || []);
      }
      if (classRes.success && classRes.data) {
        setClasses((classRes.data as { classes: ClassType[] }).classes || []);
      }
      if (subjectRes.success && subjectRes.data) {
        setSubjects((subjectRes.data as { subjects: Subject[] }).subjects || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load assignments";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [classFilter, subjectFilter, searchQuery]);

  useEffect(() => {
    const debounce = setTimeout(fetchData, 300);
    return () => clearTimeout(debounce);
  }, [fetchData]);

  const getStatusBadge = (status: string, dueDate: string) => {
    const daysLeft = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
    const isOverdue = daysLeft < 0;

    if (status === "closed" || isOverdue) {
      return <Badge variant="destructive" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 shadow-none hover:bg-red-500/20 px-2 py-0.5"><AlertCircle className="w-3 h-3 mr-1" /> Closed</Badge>;
    }
    if (daysLeft <= 2 && daysLeft >= 0) {
      return <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 shadow-none hover:bg-orange-500/20 px-2 py-0.5"><Clock className="w-3 h-3 mr-1" /> Due Soon</Badge>;
    }

    return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-none hover:bg-emerald-500/20 px-2 py-0.5"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</Badge>;
  };

  const getDueColor = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
    if (days < 0) return "text-red-600 dark:text-red-400 font-bold";
    if (days <= 2) return "text-orange-600 dark:text-orange-400 font-bold";
    return "text-muted-foreground";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 page-enter pb-12">
        {/* PREMIUM HEADER */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/10 via-blue-500/5 to-purple-500/10 border border-blue-500/20 p-6 sm:p-8">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl mix-blend-multiply" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl mix-blend-multiply" />

          <div className="relative flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold tracking-wide uppercase mb-3">
                <FileText className="w-4 h-4" /> Academic Tasks
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-2">My Assignments</h1>
              <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
                Track your coursework, manage upcoming deadlines, and submit your tasks all in one place.
              </p>
            </div>
          </div>
        </div>

        {/* MODERN FILTERS */}
        <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between border-border/50 sticky top-4 z-10 shadow-sm">
          <div className="relative flex-1 w-full max-w-md group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search assignments by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 w-full bg-background/50 border-border/50 focus-visible:ring-primary/20 transition-all rounded-lg"
            />
          </div>
          <div className="flex w-full md:w-auto gap-3 items-center">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full md:w-[160px] h-10 bg-background/50 border-border/50 rounded-lg">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-full md:w-[160px] h-10 bg-background/50 border-border/50 rounded-lg">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* CONTENT LOADING/ERROR STATES */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
            <p className="text-muted-foreground font-medium animate-pulse">Loading assignments...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Failed to load</p>
              <p className="text-muted-foreground text-sm max-w-sm mt-1">{error}</p>
            </div>
            <Button variant="outline" onClick={fetchData}>Try Again</Button>
          </div>
        )}

        {/* ASSIGNMENTS GRID */}
        {!loading && !error && (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment, idx) => {
              const days = Math.ceil((new Date(assignment.due_date).getTime() - Date.now()) / 86400000);
              const isOverdue = days < 0;
              const isActive = days >= 0;

              return (
                <Card
                  key={assignment.id}
                  onClick={() => { setSelectedAssignment(assignment); setDetailsOpen(true); }}
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 animate-slide-in-up border-border/40 hover:border-primary/30 overflow-hidden bg-card/60 backdrop-blur"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="p-5 sm:p-6 flex flex-col h-full relative">
                    {/* Status absolute right */}
                    <div className="absolute top-5 right-5 z-10">
                      {getStatusBadge(assignment.status, assignment.due_date)}
                    </div>

                    {/* Icon & Subject */}
                    <div className="flex items-center gap-3 mb-4 mt-1">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
                        isOverdue ? "bg-red-500/10 text-red-600" : "bg-blue-500/10 text-blue-600"
                      )}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 pr-20">
                        <p className="text-xs font-bold text-muted-foreground tracking-wider uppercase truncate">{assignment.subject_name || assignment.class_name}</p>
                      </div>
                    </div>

                    {/* Title & Desc */}
                    <div className="mb-4 flex-1">
                      <h3 className="text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2">{assignment.title}</h3>
                      {assignment.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-2 leading-relaxed">{assignment.description}</p>
                      )}
                    </div>

                    {/* Bottom Stats */}
                    <div className="pt-4 border-t border-border/50 flex items-center justify-between gap-2 mt-auto">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-md", isOverdue ? "bg-red-500/10" : "bg-muted")}>
                          <Calendar className={cn("w-3.5 h-3.5", isOverdue ? "text-red-600" : "text-muted-foreground")} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold leading-none">Deadline</span>
                          <span className={cn("text-xs leading-tight mt-0.5", getDueColor(assignment.due_date))}>
                            {new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold leading-none">Marks</span>
                        <div className="flex items-center text-xs font-bold text-foreground mt-0.5">
                          {assignment.total_marks} <Award className="w-3.5 h-3.5 ml-1 text-amber-500" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {!loading && !error && assignments.length === 0 && (
          <div className="text-center py-20 px-4 max-w-md mx-auto">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-muted to-muted/30 flex items-center justify-center mx-auto mb-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/5 blur-xl"></div>
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 relative z-10" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">You're all caught up!</h3>
            <p className="text-muted-foreground text-sm">There are no assignments matching your current filters. Take a break or review your past work.</p>
          </div>
        )}
      </div>

      <StudentAssignmentDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        assignmentId={selectedAssignment?.id || null}
        onSuccess={fetchData}
      />
    </DashboardLayout>
  );
}
