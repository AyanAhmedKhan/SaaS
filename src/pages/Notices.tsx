import { useState, useEffect, useCallback } from "react";
import { Plus, Search, CalendarDays, Bell, AlertCircle, Loader2 } from "lucide-react";
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
import { getNotices } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { Notice } from "@/types";

export default function Notices() {
  const { isRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canCreate = isRole('super_admin', 'institute_admin', 'class_teacher');

  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (priorityFilter !== "all") params.priority = priorityFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await getNotices(params);
      if (response.success && response.data) {
        const noticesData = (response.data as { notices: Notice[] })?.notices ?? [];
        setNotices(noticesData);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notices';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, searchQuery]);

  useEffect(() => {
    const debounce = setTimeout(fetchNotices, 300);
    return () => clearTimeout(debounce);
  }, [fetchNotices]);

  const filteredNotices = notices.filter(notice =>
    notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notice.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const priorityStyles: Record<string, { border: string; badge: string; icon: string }> = {
    high: {
      border: "border-l-red-500",
      badge: "bg-red-500/10 text-red-600 dark:text-red-400",
      icon: "text-red-500",
    },
    urgent: {
      border: "border-l-red-700",
      badge: "bg-red-700/10 text-red-700 dark:text-red-300",
      icon: "text-red-700",
    },
    medium: {
      border: "border-l-amber-500",
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      icon: "text-amber-500",
    },
    low: {
      border: "border-l-blue-500",
      badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      icon: "text-blue-500",
    },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 page-enter">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Notices</h1>
            <p className="text-muted-foreground text-sm">
              Announcements and important updates for the institution.
            </p>
          </div>
          {canCreate && (
            <Button className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md hover:shadow-lg transition-all duration-200">
              <Plus className="h-4 w-4 mr-2" />
              Create Notice
            </Button>
          )}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              placeholder="Search notices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-border/50 focus-visible:ring-primary/30"
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Priorities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40 gap-3">
            <div className="h-8 w-8 rounded-full border-3 border-muted animate-spin border-t-primary" />
            <p className="text-muted-foreground text-sm">Loading notices...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive/60" />
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        )}

        {/* Notices List */}
        {!loading && !error && (
          <div className="space-y-4">
            {filteredNotices.map((notice, index) => (
              <Card
                key={notice.id}
                className={cn(
                  "border-l-4 border-border/50 hover:shadow-card-hover transition-all duration-300 animate-slide-in-up cursor-default",
                  priorityStyles[notice.priority]?.border
                )}
                style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60",
                      priorityStyles[notice.priority]?.icon
                    )}>
                      <Bell className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-lg tracking-tight">{notice.title}</h3>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span className="text-xs">
                              {new Date(notice.created_at).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                        <Badge className={cn("shrink-0 text-[10px] font-semibold", priorityStyles[notice.priority]?.badge)}>
                          {notice.priority.charAt(0).toUpperCase() + notice.priority.slice(1)} Priority
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">{notice.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && filteredNotices.length === 0 && (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Bell className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              {searchQuery ? 'No notices match your search.' : 'No notices yet.'}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
