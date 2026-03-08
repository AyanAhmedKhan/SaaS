import { useState, useEffect, useCallback } from "react";
import { Plus, Search, GraduationCap, Calendar, Clock, AlertCircle, Loader2, BarChart2, Building2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getExams, getClasses, getSubjectsByClass } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Exam, Class as ClassType, Subject } from "@/types";
import { CreateExamDialog } from "@/components/institute/CreateExamDialog";
import { ExamDetailsDialog } from "@/components/institute/ExamDetailsDialog";
import { InstituteSelector } from "@/components/InstituteSelector";
import type { Institute } from "@/types";

export default function Exams() {
  const { isRole } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  const isSuperAdmin = isRole('super_admin');
  const canCreate = isRole('super_admin', 'institute_admin', 'faculty');

  const [selectedInstituteId, setSelectedInstituteId] = useState<string | null>(() => {
    if (isSuperAdmin) {
      return localStorage.getItem('super_admin_selected_institute');
    }
    return null;
  });

  const handleInstituteSelect = (instituteId: string | null, _institute: Institute | null) => {
    setSelectedInstituteId(instituteId);
    if (instituteId) {
      localStorage.setItem('super_admin_selected_institute', instituteId);
    } else {
      localStorage.removeItem('super_admin_selected_institute');
    }
  };

  const fetchData = useCallback(async () => {
    if (isSuperAdmin && !selectedInstituteId) {
      setExams([]);
      setClasses([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (classFilter !== "all") params.class_id = classFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      if (isSuperAdmin && selectedInstituteId) params.institute_id = selectedInstituteId;

      const classParams = isSuperAdmin && selectedInstituteId ? { institute_id: selectedInstituteId } : {};
      const [examRes, classRes] = await Promise.all([
        getExams(params),
        getClasses(classParams),
      ]);

      if (examRes.success && examRes.data) {
        setExams((examRes.data as { exams: Exam[] }).exams || []);
      }
      if (classRes.success && classRes.data) {
        setClasses((classRes.data as { classes: ClassType[] }).classes || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load exams";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [classFilter, statusFilter, searchQuery, isSuperAdmin, selectedInstituteId]);

  useEffect(() => {
    const debounce = setTimeout(fetchData, 300);
    return () => clearTimeout(debounce);
  }, [fetchData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
      case "scheduled":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Upcoming</Badge>;
      case "ongoing":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Ongoing</Badge>;
      case "completed":
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 page-enter font-sans max-w-7xl mx-auto">
        {/* Header - Premium Look */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end justify-between bg-gradient-to-r from-primary/5 to-blue-500/5 p-8 rounded-3xl border border-border/50 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="outline" className="bg-background/80 backdrop-blur">Examination Center</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Manage Exams & Grades
            </h1>
            <p className="text-muted-foreground max-w-xl text-sm md:text-base">
              Schedule assessments, track syllabus completion, and analyze student performance across classes.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            {isSuperAdmin && (
              <InstituteSelector
                selectedInstituteId={selectedInstituteId}
                onSelectInstitute={handleInstituteSelect}
              />
            )}
            {canCreate && (!isSuperAdmin || selectedInstituteId) && (
              <Button
                onClick={() => setIsCreateOpen(true)}
                size="lg"
                className="shrink-0 rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
              >
                <Plus className="h-5 w-5 mr-2" />
                Schedule Exam
              </Button>
            )}
          </div>
        </div>

        {/* Super Admin - No Institute Selected */}
        {isSuperAdmin && !selectedInstituteId && (
          <div className="flex flex-col items-center justify-center h-[400px] text-center gap-4">
            <div className="p-6 bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-2xl border border-primary/20">
              <Building2 className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select an Institute</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Please select an institute from the dropdown above to view and manage exams.
              </p>
            </div>
          </div>
        )}

        {/* Main Content - Only show when institute is selected (for super admin) or always (for others) */}
        {(!isSuperAdmin || selectedInstituteId) && (
          <>
            {/* Filters Bar */}
            <div className="flex flex-col gap-4 sm:flex-row p-4 bg-card rounded-2xl border border-border/50 shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by exam name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 rounded-xl h-11 bg-muted/30 border-transparent focus-visible:ring-primary/20"
                />
              </div>
              <div className="flex gap-3">
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-[160px] h-11 rounded-xl bg-muted/30 border-transparent">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] h-11 rounded-xl bg-muted/30 border-transparent">
                    <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-muted-foreground font-medium animate-pulse">Fetching examinations...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-4 bg-destructive/5 rounded-2xl border border-destructive/20">
            <AlertCircle className="h-10 w-10 text-destructive/60" />
            <p className="text-muted-foreground font-medium">{error}</p>
            <Button variant="outline" onClick={fetchData}>Try Again</Button>
          </div>
        )}

        {!loading && !error && exams.length === 0 && (
          <div className="text-center py-24 bg-card rounded-3xl border border-dashed border-border flex flex-col items-center justify-center shadow-sm">
            <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-6 ring-8 ring-background/50">
              <GraduationCap className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Exams Found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              There are no examinations scheduled that match your current filters.
            </p>
            {canCreate && (
              <Button variant="outline" onClick={() => setIsCreateOpen(true)} className="rounded-xl">
                Schedule your first exam
              </Button>
            )}
          </div>
        )}

        {/* Exams Grid */}
        {!loading && !error && exams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <Card
                key={exam.id}
                className="group overflow-hidden rounded-2xl border-border/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 bg-card/50 backdrop-blur flex flex-col"
              >
                <div className="h-2 w-full bg-gradient-to-r from-primary/80 to-blue-500/80"></div>

                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4 gap-4">
                    <div>
                      <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary hover:bg-primary/20 capitalize font-semibold tracking-wide text-[10px]">
                        {exam.exam_type.replace('_', ' ')}
                      </Badge>
                      <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">{exam.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                        <span className="font-medium text-foreground/80">{exam.class_name}</span>
                        {exam.subject_name && (
                          <><span className="text-border">•</span> <span className="truncate">{exam.subject_name}</span></>
                        )}
                      </p>
                    </div>
                    {getStatusBadge(exam.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 py-5 my-auto border-y border-border/40">
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> Date
                      </div>
                      <div className="text-sm font-semibold">
                        {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                        <BarChart2 className="h-3 w-3" /> Marks
                      </div>
                      <div className="text-sm font-semibold flex items-baseline gap-1">
                        {exam.total_marks}
                        {exam.passing_marks && <span className="text-xs text-muted-foreground font-normal"> (Pass: {exam.passing_marks})</span>}
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 mt-auto">
                    <Button
                      onClick={() => setSelectedExamId(exam.id)}
                      className="w-full rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all group-hover:shadow-md"
                      variant="ghost"
                    >
                      Grade & Analyze
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </>
        )}
      </div>

      {/* Dialogs */}
      <CreateExamDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={fetchData}
      />

      <ExamDetailsDialog
        examId={selectedExamId}
        onOpenChange={(open) => !open && setSelectedExamId(null)}
        onSuccess={fetchData}
      />

    </DashboardLayout>
  );
}
