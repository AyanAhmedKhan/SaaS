import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notice {
  id: string | number;
  title: string;
  content: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
}

interface NoticeBoardProps {
  notices?: Notice[];
}

export function NoticeBoard({ notices }: NoticeBoardProps) {
  const fallbackNotices: Notice[] = [
    { id: 1, title: 'Annual Day Celebration', content: 'Annual day event scheduled for next month. All students to participate.', date: '2025-01-15', priority: 'high' },
    { id: 2, title: 'Parent-Teacher Meeting', content: 'PTM scheduled for all classes this Saturday.', date: '2025-01-12', priority: 'medium' },
    { id: 3, title: 'Library Week', content: 'Special library activities throughout the week.', date: '2025-01-10', priority: 'low' },
  ];

  const displayNotices = notices || fallbackNotices;

  const priorityStyles = {
    high: "bg-destructive/8 text-destructive border-destructive/15",
    medium: "bg-amber-500/8 text-amber-600 dark:text-amber-400 border-amber-500/15",
    low: "bg-blue-500/8 text-blue-600 dark:text-blue-400 border-blue-500/15",
  };

  return (
    <Card className="shadow-card border-border/50 hover:shadow-card-hover transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold tracking-tight">Notice Board</CardTitle>
          <Bell className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayNotices.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No notices to display
          </div>
        ) : (
          displayNotices.map((notice, index) => (
            <div
              key={notice.id}
              className={cn(
                "p-4 rounded-xl border transition-all duration-200 hover:shadow-sm cursor-default animate-scale-in",
                priorityStyles[notice.priority]
              )}
              style={{ animationDelay: `${index * 60}ms`, opacity: 0 }}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h4 className="font-semibold text-foreground text-sm">{notice.title}</h4>
                <Badge variant="outline" className="shrink-0 text-[10px] font-semibold capitalize">
                  {notice.priority}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {notice.content}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                <CalendarDays className="h-3 w-3" />
                <span>{new Date(notice.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
