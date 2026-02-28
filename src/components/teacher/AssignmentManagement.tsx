import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  RefreshCw, AlertCircle
} from "lucide-react";
import { getAssignments, getClasses, getSubjects, deleteAssignment } from "@/lib/api";
import type { Assignment, Class, Subject } from "@/types";
import { AssignmentDialog } from "@/components/teacher/AssignmentDialog";
import { AssignmentDetailsDialog } from "@/components/teacher/AssignmentDetailsDialog";
import { useAuth } from "@/contexts/AuthContext";
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

export function AssignmentManagement() {
  console.log('[AssignmentManagement] Component rendered');
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

  console.log('[AssignmentManagement] Dialog states:', { dialogOpen, detailsOpen, deleteDialogOpen });

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500/10 text-gray-600 border-gray-600/30';
      case 'published': return 'bg-green-500/10 text-green-600 border-green-600/30';
      case 'closed': return 'bg-red-500/10 text-red-600 border-red-600/30';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-600/30';
    }
  };

  const getDaysRemaining = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (days < 0) return { text: 'Overdue', color: 'text-red-600' };
    if (days === 0) return { text: 'Due today', color: 'text-amber-600' };
    if (days === 1) return { text: '1 day left', color: 'text-amber-600' };
    return { text: `${days} days left`, color: 'text-muted-foreground' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <p className="font-semibold text-foreground">Failed to load assignments</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl font-bold">Assignment Management</CardTitle>
            <div className="flex gap-2">
              <Button onClick={loadData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button onClick={handleCreate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} {cls.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(sub => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignment List */}
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No assignments found</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first assignment
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAssignments.map(assignment => {
                const daysInfo = getDaysRemaining(assignment.due_date);
                const submissionRate = assignment.total_students
                  ? Math.round(((assignment.submission_count || 0) / assignment.total_students) * 100)
                  : 0;

                return (
                  <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-lg">{assignment.title}</h3>
                            <Badge variant="outline" className={getStatusColor(assignment.status)}>
                              {assignment.status}
                            </Badge>
                          </div>

                          {assignment.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {assignment.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{assignment.class_name} {assignment.section}</span>
                            </div>
                            {assignment.subject_name && (
                              <div className="flex items-center gap-1">
                                <FileText className="h-4 w-4" />
                                <span>{assignment.subject_name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span className={daysInfo.color}>
                                {new Date(assignment.due_date).toLocaleDateString()} • {daysInfo.text}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-sm">
                              <span className="font-medium">{assignment.submission_count || 0}</span>
                              <span className="text-muted-foreground">/{assignment.total_students || 0} submitted</span>
                            </div>
                            <div className="flex-1 max-w-xs">
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${submissionRate}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-sm text-muted-foreground">{submissionRate}%</span>
                          </div>
                        </div>

                        <div className="flex sm:flex-col gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleView(assignment)}>
                            <Eye className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(assignment)}>
                            <Edit className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          {(user?.role === 'institute_admin' || user?.role === 'super_admin' || user?.role === 'class_teacher' || user?.role === 'subject_teacher') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => confirmDelete(assignment.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assignment? This action cannot be undone and will remove all submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
