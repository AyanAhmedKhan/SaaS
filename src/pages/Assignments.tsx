import { useState, useEffect, useCallback } from "react";
import { Plus, Search, FileText, Calendar, Clock, CheckCircle2, AlertCircle, Loader2, Upload } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { getAssignments, getClasses, getSubjects } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { Assignment, Class as ClassType, Subject } from "@/types";
import { AssignmentManagement } from "@/components/teacher/AssignmentManagement";
import { StudentAssignmentDetailsDialog } from "@/components/student/StudentAssignmentDetailsDialog";

export default function Assignments() {
  const { isRole } = useAuth();
  const isStaff = isRole('super_admin', 'institute_admin', 'class_teacher', 'subject_teacher');

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-blue-500/10 text-blue-600">Published</Badge>;
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDueColor = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
    if (days < 0) return "text-destructive";
    if (days <= 2) return "text-warning";
    return "text-muted-foreground";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Assignments</h1>
            <p className="text-muted-foreground text-sm">View and track your assignments.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-border/50"
            />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Subjects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading assignments...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive/60" />
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        )}

        {/* Assignments Grid */}
        {!loading && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment, idx) => (
              <Card
                key={assignment.id}
                onClick={() => { setSelectedAssignment(assignment); setDetailsOpen(true); }}
                className="hover:shadow-card-hover cursor-pointer transition-all duration-300 animate-scale-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold leading-tight">{assignment.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{assignment.subject_id}</p>
                      </div>
                    </div>
                    {getStatusBadge(assignment.status)}
                  </div>

                  {assignment.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{assignment.description}</p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={cn("text-xs", getDueColor(assignment.due_date))}>
                        Due {new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {assignment.total_marks} marks
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && assignments.length === 0 && (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">No assignments found.</p>
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
