import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, Calendar, Users, FileText, Eye, Edit, Trash2,
  RefreshCw, AlertCircle, Bookmark, Share2, Filter, Settings2, Download
} from "lucide-react";
import { getAssignments, getClasses, getSubjects, deleteAssignment } from "@/lib/api";
import type { Assignment, Class, Subject } from "@/types";
import { AssignmentDialog } from "@/components/teacher/AssignmentDialog";
import { AssignmentDetailsDialog } from "@/components/teacher/AssignmentDetailsDialog";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";

export function AssignmentManagement() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [assignmentsRes, classesRes, subjectsRes] = await Promise.all([
        getAssignments(),
        getClasses(),
        getSubjects(),
      ]);

      if (assignmentsRes.success && assignmentsRes.data) {
        setAssignments(assignmentsRes.data.assignments || []);
      }
      if (classesRes.success && classesRes.data) {
        setClasses(classesRes.data.classes || []);
      }
      if (subjectsRes.success && subjectsRes.data) {
        setSubjects(subjectsRes.data.subjects || []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      setError(error instanceof Error ? error.message : "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAssignment(null);
    setDialogOpen(true);
  };

  const handleEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setDialogOpen(true);
  };

  const handleView = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setDetailsOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteAssignment(deletingId);
      setAssignments(prev => prev.filter(a => a.id !== deletingId));
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (error) {
      console.error("Failed to delete assignment:", error);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || assignment.status === statusFilter;
    const matchesClass = classFilter === "all" || assignment.class_id === classFilter;
    const matchesSubject = subjectFilter === "all" || assignment.subject_id === subjectFilter;
    return matchesSearch && matchesStatus && matchesClass && matchesSubject;
  });

  const getStatusBadgeDefaults = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-600/30';
      case 'published': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-600/30';
      case 'closed': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-600/30';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-600/30';
    }
  };

  const getDaysRemaining = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (days < 0) return { text: 'Overdue', color: 'text-red-600', isLate: true };
    if (days === 0) return { text: 'Due today', color: 'text-amber-600', isLate: false };
    if (days === 1) return { text: '1 day left', color: 'text-amber-600', isLate: false };
    return { text: `${days} days left`, color: 'text-emerald-600', isLate: false };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
        <p className="text-muted-foreground font-medium animate-pulse">Loading workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">Failed to load</p>
          <p className="text-muted-foreground text-sm max-w-sm mt-1">{error}</p>
        </div>
        <Button variant="outline" onClick={loadData}>Try Again</Button>
      </div>
    );
  }

  // Summary stats
  const total = assignments.length;
  const active = assignments.filter(a => a.status === 'published').length;
  const drafts = assignments.filter(a => a.status === 'draft').length;
  const closed = assignments.filter(a => a.status === 'closed').length;

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* PREMIUM HEADER - FACULTY VIEW */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/10 via-purple-500/5 to-pink-500/10 border border-indigo-500/20 p-6 sm:p-8">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl mix-blend-multiply" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-pink-500/10 blur-3xl mix-blend-multiply" />

        <div className="relative flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-bold tracking-wide uppercase mb-3">
              <Bookmark className="w-4 h-4" /> Faculty Workspace
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-2">Manage Assignments</h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
              Create, distribute, and grade assignments effortlessly. Track student submissions in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button onClick={loadData} variant="outline" className="bg-background/80 backdrop-blur border-border/50 h-10 shadow-sm pointer-events-auto">
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button onClick={handleCreate} className="h-10 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground pointer-events-auto">
              <Plus className="h-4 w-4 mr-2" /> New Assignment
            </Button>
          </div>
        </div>

        {/* Quick Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-indigo-500/10">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</span>
            <span className="text-2xl font-black">{total}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{active}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Needs Grading</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {assignments.reduce((acc, curr) => acc + ((curr.submission_count || 0)), 0)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Drafts</span>
            <span className="text-2xl font-black text-gray-500">{drafts}</span>
          </div>
        </div>
      </div>

      {/* MODERN FILTERS BAR */}
      <div className="glass-panel p-4 rounded-xl flex flex-col lg:flex-row gap-4 items-center justify-between border-border/50 sticky top-4 z-10 shadow-sm">
        <div className="relative flex-1 w-full lg:max-w-md group">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search titles, descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 w-full bg-background/50 border-border/50 focus-visible:ring-primary/20 transition-all rounded-lg shadow-inner"
          />
        </div>

        <div className="flex flex-wrap w-full lg:w-auto gap-3 items-center bg-muted/30 p-1.5 rounded-lg border border-border/30">
          <div className="flex items-center gap-2 pl-2 pr-1">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Filters</span>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-background border-border/50 rounded-md">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-background border-border/50 rounded-md">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name} {cls.section}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-background border-border/50 rounded-md">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map(sub => (
                <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ASSIGNMENT LIST - MODERNIzED */}
      {filteredAssignments.length === 0 ? (
        <div className="text-center py-24 px-4 border border-dashed border-border/60 rounded-2xl bg-background/30">
          <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
            <FileText className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No assignments found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
            We couldn't find any assignments matching your current filters. Clear filters or create a new one.
          </p>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> Create First Assignment
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAssignments.map((assignment, idx) => {
            const daysInfo = getDaysRemaining(assignment.due_date);
            const submissionRate = assignment.total_students
              ? Math.round(((assignment.submission_count || 0) / assignment.total_students) * 100)
              : 0;

            return (
              <Card
                key={assignment.id}
                className="group hover:shadow-xl transition-all duration-300 animate-slide-in-up border-border/40 hover:border-primary/30 overflow-hidden bg-card/60 backdrop-blur flex flex-col"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Top decorative bar mapping to status */}
                <div className={cn(
                  "h-1.5 w-full opacity-80 group-hover:opacity-100 transition-opacity",
                  assignment.status === 'published' ? "bg-gradient-to-r from-blue-500 to-cyan-400" :
                    assignment.status === 'closed' ? "bg-gradient-to-r from-red-500 to-rose-400" :
                      "bg-gradient-to-r from-gray-400 to-slate-300"
                )} />

                <CardContent className="p-5 flex-1 flex flex-col relative">
                  {/* Header / Title area */}
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="outline" className={cn("text-[10px] h-5 uppercase shadow-none font-bold", getStatusBadgeDefaults(assignment.status))}>
                          {assignment.status}
                        </Badge>
                        <span className="text-xs font-semibold text-muted-foreground truncate">{assignment.subject_name}</span>
                      </div>
                      <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {assignment.title}
                      </h3>
                    </div>

                    {/* Action Dropdown / Icons */}
                    <div className="flex items-center gap-1 shrink-0 bg-muted/50 p-1 rounded-lg border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => handleView(assignment)}>
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => handleEdit(assignment)}>
                        <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      {(user?.role === 'institute_admin' || user?.role === 'super_admin' || user?.role === 'faculty') && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:text-destructive hover:bg-destructive/10" onClick={() => confirmDelete(assignment.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed flex-1">
                    {assignment.description || "No description provided."}
                  </p>

                  {/* Meta Info (Class, Date) */}
                  <div className="grid grid-cols-2 gap-3 mb-5 p-3 rounded-lg bg-background/50 border border-border/40">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Target Class</span>
                      <span className="text-xs font-semibold">{assignment.class_name} {assignment.section}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Due Date</span>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-xs font-bold", daysInfo.color)}>
                          {new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar / Submissions */}
                  <div className="space-y-1.5 mt-auto">
                    <div className="flex justify-between items-end text-sm">
                      <span className="font-semibold">{assignment.submission_count || 0} <span className="text-muted-foreground font-medium">/ {assignment.total_students || 0} submitted</span></span>
                      <span className={cn("font-bold text-xs", submissionRate >= 100 ? "text-emerald-600" : submissionRate >= 50 ? "text-blue-600" : "text-muted-foreground")}>{submissionRate}%</span>
                    </div>
                    <Progress value={submissionRate} className="h-2" />
                  </div>
                </CardContent>

                {/* Bottom fixed actions (Mobile friendly) */}
                <div className="border-t border-border/50 p-2 sm:hidden grid grid-cols-3 gap-1 bg-muted/10">
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleView(assignment)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleEdit(assignment)}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive h-8 text-xs" onClick={() => confirmDelete(assignment.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AssignmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        assignment={editingAssignment}
        classes={classes}
        subjects={subjects}
        onSuccess={loadData}
      />

      <AssignmentDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        assignmentId={selectedAssignment?.id || null}
        onSuccess={loadData}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-red-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Delete Assignment
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assignment? This action cannot be undone and will permanently remove all student submissions and grades associated with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
              Yes, Delete Assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
