import { useState, useEffect } from "react";
import { Search, Plus, MoreVertical, Mail, Phone, BookOpen, Loader2 } from "lucide-react";
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
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";
import { getTeachers } from "@/lib/api";
import { Teacher } from "@/types";

export default function Teachers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true);
        setError(null);
        const params: Record<string, string> = {};
        if (searchQuery) params.search = searchQuery;

        const response = await getTeachers(params);
        if (response.success && response.data) {
          setTeachers(response.data.teachers as Teacher[]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load teachers';
        console.error('[Teachers] Error:', message);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchTeachers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const subjectColors: Record<string, string> = {
    Mathematics: "bg-info/10 text-info border-info/20",
    Physics: "bg-success/10 text-success border-success/20",
    Chemistry: "bg-warning/10 text-warning border-warning/20",
    English: "bg-accent/10 text-accent border-accent/20",
    Biology: "bg-primary/10 text-primary border-primary/20",
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
          <Button className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md hover:shadow-lg transition-all duration-200">
            <Plus className="h-4 w-4 mr-2" />
            Add Teacher
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl border-border/50 focus-visible:ring-primary/30"
          />
        </div>

        {/* AI Insight — Teacher */}
        <AIInsightCard
          data={{
            attendance: 89,
            avgScore: 74,
            assignmentCompletion: 78,
            recentTrend: "declining",
            topSubject: "English",
            weakSubject: "Chemistry",
          }}
          role="teacher"
        />

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading teachers...</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-destructive">⚠️ {error}</p>
            <p className="text-muted-foreground text-sm mt-1">Please check that the backend server is running.</p>
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
                        <Badge
                          variant="outline"
                          className={subjectColors[teacher.subject] || ""}
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          {teacher.subject}
                        </Badge>
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
                    <div>
                      <p className="text-sm text-muted-foreground mb-1.5">Classes Assigned</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(teacher.classes) ? teacher.classes : []).map((cls, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {cls}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 space-y-2 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span className="truncate">{teacher.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span>{teacher.phone}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && teachers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No teachers found matching your search.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
