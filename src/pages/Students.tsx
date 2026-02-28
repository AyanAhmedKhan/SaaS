import { useState, useEffect, useCallback } from "react";
import { Search, MoreVertical, Mail, Loader2, AlertCircle, GraduationCap } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getStudents, getClasses } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Student, Class as ClassType } from "@/types";
import { BulkImportDialog } from "@/components/student/BulkImportDialog";
import { BulkPromoteDialog } from "@/components/student/BulkPromoteDialog";
import { AddStudentDialog } from "@/components/student/AddStudentDialog";
import { EditStudentDialog } from "@/components/student/EditStudentDialog";
import { StudentAttendanceDialog } from "@/components/student/StudentAttendanceDialog";
import { StudentReportsDialog } from "@/components/student/StudentReportsDialog";

export default function Students() {
  const { isRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [promoteOpen, setPromoteOpen] = useState(false);

  // Dialog states for student actions
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [attendanceStudent, setAttendanceStudent] = useState<Student | null>(null);
  const [reportsStudent, setReportsStudent] = useState<Student | null>(null);

  const canCreate = isRole('super_admin', 'institute_admin', 'class_teacher');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      if (classFilter !== "all") params.class_id = classFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const [studentRes, classRes] = await Promise.all([
        getStudents(params),
        getClasses(),
      ]);

      if (studentRes.success && studentRes.data) {
        setStudents((studentRes.data as { students: Student[] }).students || []);
      }
      if (classRes.success && classRes.data) {
        setClasses((classRes.data as { classes: ClassType[] }).classes || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load students';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, classFilter, statusFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchData, 300);
    return () => clearTimeout(debounce);
  }, [fetchData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return "bg-emerald-500/10 text-emerald-600";
      case 'inactive': return "bg-muted text-muted-foreground";
      case 'graduated': return "bg-blue-500/10 text-blue-600";
      case 'transferred': return "bg-amber-500/10 text-amber-600";
      default: return "";
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === students.length && students.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map(s => s.id)));
    }
  };

  const selectedStudents = students.filter(s => selectedIds.has(s.id));

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Students</h1>
            <p className="text-muted-foreground text-sm">
              Manage student profiles, attendance, and academic performance.
            </p>
          </div>
          {canCreate && (
            <div className="flex items-center gap-3">
              <BulkImportDialog onSuccess={fetchData} />
              <AddStudentDialog onSuccess={fetchData} />
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-border/50 focus-visible:ring-primary/30"
            />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="graduated">Graduated</SelectItem>
              <SelectItem value="transferred">Transferred</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && canCreate && (
          <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-primary">
                {selectedIds.size} student{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear Selection
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setPromoteOpen(true)}>
                Bulk Actions
              </Button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading students...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive/60" />
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        )}

        {/* Students Grid */}
        {!loading && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((student, index) => (
              <Card
                key={student.id}
                className="overflow-hidden hover:shadow-card-hover transition-all duration-300 animate-scale-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {canCreate && (
                        <Checkbox
                          checked={selectedIds.has(student.id)}
                          onCheckedChange={() => toggleSelection(student.id)}
                          aria-label={`Select ${student.name}`}
                        />
                      )}
                      <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                        <AvatarImage src={student.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{student.name}</h3>
                        <p className="text-sm text-muted-foreground">Roll: {student.roll_number}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditStudent(student)}>Edit Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAttendanceStudent(student)}>View Attendance</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setReportsStudent(student)}>View Reports</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      {student.class_name && (
                        <Badge variant="secondary">
                          {student.class_name}{student.section ? ` - ${student.section}` : ''}
                        </Badge>
                      )}
                      <Badge className={cn("capitalize", getStatusColor(student.status))}>
                        {student.status}
                      </Badge>
                    </div>

                    {student.gender && (
                      <p className="text-xs text-muted-foreground capitalize">Gender: {student.gender}</p>
                    )}

                    <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground border-t border-border/40">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{student.email}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && students.length === 0 && (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">No students found matching your criteria.</p>
          </div>
        )}
      </div>

      <BulkPromoteDialog
        open={promoteOpen}
        onOpenChange={setPromoteOpen}
        selectedStudents={selectedStudents}
        onSuccess={() => {
          setSelectedIds(new Set());
          fetchData();
        }}
      />

      {/* Student Action Dialogs */}
      {editStudent && (
        <EditStudentDialog
          student={editStudent}
          open={!!editStudent}
          onOpenChange={(open) => { if (!open) setEditStudent(null); }}
          onSuccess={fetchData}
        />
      )}
      {attendanceStudent && (
        <StudentAttendanceDialog
          student={attendanceStudent}
          open={!!attendanceStudent}
          onOpenChange={(open) => { if (!open) setAttendanceStudent(null); }}
        />
      )}
      {reportsStudent && (
        <StudentReportsDialog
          student={reportsStudent}
          open={!!reportsStudent}
          onOpenChange={(open) => { if (!open) setReportsStudent(null); }}
        />
      )}
    </DashboardLayout>
  );
}
