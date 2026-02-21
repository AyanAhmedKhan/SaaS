import { useState, useEffect, useCallback } from "react";
import { Search, Plus, MoreVertical, Mail, Phone, BookOpen, Loader2, AlertCircle, Users } from "lucide-react";
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
import type { Teacher } from "@/types";

export default function Teachers() {
  const { isRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      case 'active': return "bg-emerald-500/10 text-emerald-600";
      case 'inactive': return "bg-muted text-muted-foreground";
      case 'on_leave': return "bg-amber-500/10 text-amber-600";
      default: return "";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Teachers</h1>
            <p className="text-muted-foreground text-sm">
              Manage faculty profiles, schedules, and performance monitoring.
            </p>
          </div>
          {canCreate && (
            <Button className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md hover:shadow-lg transition-all duration-200">
              <Plus className="h-4 w-4 mr-2" />
              Add Teacher
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search teachers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-border/50 focus-visible:ring-primary/30"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
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
            {teachers.map((teacher, index) => (
              <Card
                key={teacher.id}
                className="overflow-hidden hover:shadow-card-hover transition-all duration-300 animate-scale-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-14 w-14 ring-2 ring-accent/20">
                        <AvatarImage src={teacher.avatar} />
                        <AvatarFallback className="bg-accent/10 text-accent font-semibold text-lg">
                          {teacher.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">{teacher.name}</h3>
                        {teacher.subject_specialization && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            <BookOpen className="h-3 w-3 mr-1" />
                            {teacher.subject_specialization}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                        <DropdownMenuItem>Edit Details</DropdownMenuItem>
                        <DropdownMenuItem>View Schedule</DropdownMenuItem>
                        <DropdownMenuItem>Performance Report</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={cn("capitalize", getStatusColor(teacher.status))}>
                        {teacher.status.replace('_', ' ')}
                      </Badge>
                      {teacher.experience_years !== undefined && (
                        <span className="text-xs text-muted-foreground">{teacher.experience_years} yrs exp.</span>
                      )}
                    </div>

                    {teacher.assignments && teacher.assignments.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Class Assignments</p>
                        <div className="flex flex-wrap gap-1.5">
                          {teacher.assignments.slice(0, 4).map((a) => (
                            <Badge key={a.id} variant="secondary" className="text-xs">
                              {a.class_name || a.class_id}{a.subject_name ? ` · ${a.subject_name}` : ''}
                            </Badge>
                          ))}
                          {teacher.assignments.length > 4 && (
                            <Badge variant="outline" className="text-xs">+{teacher.assignments.length - 4}</Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {teacher.qualification && (
                      <p className="text-xs text-muted-foreground">{teacher.qualification}</p>
                    )}

                    <div className="pt-2 space-y-2 border-t border-border/40">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span className="truncate">{teacher.email}</span>
                      </div>
                      {teacher.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4 shrink-0" />
                          <span>{teacher.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
    </DashboardLayout>
  );
}
