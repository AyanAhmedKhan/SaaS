import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NoticeEntry {
  id: string;
  title: string;
  date?: string;
  created_at?: string;
  priority?: string;
}

interface NotificationsWidgetProps {
  notices: NoticeEntry[];
}

export function NotificationsWidget({ notices }: NotificationsWidgetProps) {
  const navigate = useNavigate();

  return (
    <Card className="shadow-card border-border/40">
      <CardHeader className="pb-2 sm:pb-3 flex flex-row items-center justify-between px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-sm sm:text-lg font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Notices
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs h-7 sm:h-8" onClick={() => navigate("/notices")}>
          All <ChevronRight className="h-3 w-3 ml-0.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
        {notices.length === 0 ? (
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No recent notices.</p>
        ) : (
          notices.map((notice) => (
            <div
              key={notice.id}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg border bg-card hover:bg-muted/30 active:scale-[0.99] transition-all cursor-pointer"
              onClick={() => navigate("/notices")}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${notice.priority === "urgent" || notice.priority === "high" ? "bg-destructive" : "bg-green-500"
                  }`} />
                <p className="font-medium text-foreground text-xs sm:text-sm truncate">{notice.title}</p>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground shrink-0 ml-2 whitespace-nowrap">
                {new Date(notice.date || notice.created_at || "").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
