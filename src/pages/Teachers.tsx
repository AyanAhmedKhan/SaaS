import { useState, useEffect, useCallback } from "react";
import {
  Search, MoreVertical, Mail, Phone, BookOpen, Loader2,
  AlertCircle, Users, Shield, Award, Briefcase, GraduationCap,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getTeachers } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Teacher } from "@/types";
import { AddTeacherDialog } from "@/components/teacher/AddTeacherDialog";
import { EditTeacherDialog } from "@/components/teacher/EditTeacherDialog";
import { AssignTeacherDialog } from "@/components/teacher/AssignTeacherDialog";

export default function Teachers() {
  const { isRole } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [assignTeacher, setAssignTeacher] = useState<Teacher | null>(null);

  const canCreate = isRole('super_admin', 'institute_admin');

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await getTeachers(params);
      if (response.success && response.data) {
        setTeachers((response.data as { teachers: Teacher[] }).teachers || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load teachers';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchTeachers, 300);
    return () => clearTimeout(debounce);
  }, [fetchTeachers]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case 'inactive': return "bg-muted text-muted-foreground border-muted";
      case 'on_leave': return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default: return "";
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'active': return "bg-emerald-500";
      case 'inactive': return "bg-gray-400";
      case 'on_leave': return "bg-amber-500";
      default: return "bg-gray-400";
    }
  };

  // Summary stats
  const totalTeachers = teachers.length;
  const activeTeachers = teachers.filter(t => t.status === 'active').length;
  const classTeachers = teachers.filter(t => t.assignments?.some(a => a.is_class_teacher)).length;
  const totalAssignments = teachers.reduce((sum, t) => sum + (t.assignments?.length || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Teachers</h1>
            <p className="text-muted-foreground text-sm">
              Manage faculty profiles, subject assignments, and class responsibilities.
            </p>
          </div>
          {canCreate && (
            <AddTeacherDialog onSuccess={fetchTeachers} />
          )}
        </div>

        {/* Summary Cards */}
        {!loading && !error && teachers.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary">{totalTeachers}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Teachers</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{activeTeachers}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Active</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{classTeachers}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Class Teachers</p>
            </div>
            <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-violet-600">{totalAssignments}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Assignments</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search teachers by name, email, or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-border/50 focus-visible:ring-primary/30"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] rounded-xl">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading teachers...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive/60" />
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        )}

        {/* Teachers Grid */}
        {!loading && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((teacher, index) => {
              const isClassTeacher = teacher.assignments?.some(a => a.is_class_teacher);
              const classTeacherOf = teacher.assignments?.filter(a => a.is_class_teacher) || [];
              const subjectAssignments = teacher.assignments || [];

              return (
                <Card
                  key={teacher.id}
                  className={cn(
                    "overflow-hidden hover:shadow-card-hover transition-all duration-300 animate-scale-in relative group",
                    isClassTeacher && "ring-1 ring-amber-500/30"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Class Teacher Ribbon */}
                  {isClassTeacher && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg shadow-sm z-10">
                      <Shield className="h-3 w-3 inline mr-1 -mt-0.5" />
                      Class Teacher
                    </div>
                  )}

                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-14 w-14 ring-2 ring-accent/20">
                            <AvatarImage src={teacher.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-blue-500/20 text-primary font-semibold text-lg">
                              {teacher.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          {/* Status dot */}
                          <span className={cn(
                            "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background",
                            getStatusDot(teacher.status)
                          )} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-base truncate">{teacher.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {teacher.subject_specialization && (
                              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] px-1.5 py-0">
                                <BookOpen className="h-2.5 w-2.5 mr-0.5" />
                                {teacher.subject_specialization}
                              </Badge>
                            )}
                            <Badge className={cn("capitalize text-[10px] px-1.5 py-0 border", getStatusColor(teacher.status))}>
                              {teacher.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditTeacher(teacher)}>
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAssignTeacher(teacher)}>
                            Manage Assignments
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast({ title: "Coming Soon", description: "Schedule viewing will be available soon." })}>
                            View Schedule
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Info Row */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      {teacher.qualification && (
                        <span className="flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          {teacher.qualification}
                        </span>
                      )}
                      {teacher.experience_years !== undefined && teacher.experience_years > 0 && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {teacher.experience_years} yrs
                        </span>
                      )}
                    </div>

                    {/* Assignments Section */}
                    {subjectAssignments.length > 0 ? (
                      <div className="mb-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1.5">
                          Teaching Assignments
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {classTeacherOf.map((a) => (
                            <Badge
                              key={`ct-${a.class_id}`}
                              className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[10px] px-2 py-0.5"
                            >
                              <Shield className="h-2.5 w-2.5 mr-0.5" />
                              {a.class_name || a.class_id}{a.section ? `-${a.section}` : ""}
                            </Badge>
                          ))}
                          {subjectAssignments.filter(a => !a.is_class_teacher).slice(0, 3).map((a) => (
                            <Badge
                              key={`sa-${a.class_id}-${a.subject_id}`}
                              variant="secondary"
                              className="text-[10px] px-2 py-0.5"
                            >
                              <GraduationCap className="h-2.5 w-2.5 mr-0.5" />
                              {a.class_name}{a.section ? `-${a.section}` : ""} · {a.subject_name}
                            </Badge>
                          ))}
                          {subjectAssignments.filter(a => !a.is_class_teacher).length > 3 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0.5 cursor-pointer hover:bg-accent/50 transition-colors"
                              onClick={() => setAssignTeacher(teacher)}
                            >
                              +{subjectAssignments.filter(a => !a.is_class_teacher).length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-3 bg-muted/30 rounded-lg p-2.5 text-center">
                        <p className="text-xs text-muted-foreground">No class assignments</p>
                        {canCreate && (
                          <button
                            className="text-xs text-primary hover:underline mt-0.5"
                            onClick={() => setAssignTeacher(teacher)}
                          >
                            + Assign classes
                          </button>
                        )}
                      </div>
                    )}

                    {/* Contact Footer */}
                    <div className="pt-3 space-y-1.5 border-t border-border/40">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{teacher.email}</span>
                      </div>
                      {teacher.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>{teacher.phone}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && !error && teachers.length === 0 && (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">No teachers found matching your search.</p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {editTeacher && (
        <EditTeacherDialog
          teacher={editTeacher}
          open={!!editTeacher}
          onOpenChange={(open) => { if (!open) setEditTeacher(null); }}
          onSuccess={fetchTeachers}
        />
      )}
      {assignTeacher && (
        <AssignTeacherDialog
          teacher={assignTeacher}
          open={!!assignTeacher}
          onOpenChange={(open) => { if (!open) setAssignTeacher(null); }}
          onSuccess={fetchTeachers}
        />
      )}
    </DashboardLayout>
  );
}
