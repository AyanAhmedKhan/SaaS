import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
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
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notifications
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/notices")}>
          View All
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {notices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent notices.</p>
        ) : (
          notices.map((notice) => (
            <div
              key={notice.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => navigate("/notices")}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  notice.priority === "urgent" || notice.priority === "high" ? "bg-destructive" : "bg-green-500"
                }`} />
                <p className="font-medium text-foreground text-sm">{notice.title}</p>
              </div>
              <p className="text-xs text-muted-foreground shrink-0 ml-2">
                {new Date(notice.date || notice.created_at || "").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
