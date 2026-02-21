import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NoticeItem {
  id: number;
  title: string;
  date: string;
  priority: "normal" | "urgent";
}

const recentNotices: NoticeItem[] = [
  { id: 1, title: "Annual Sports Day Registration Open", date: "Feb 10, 2025", priority: "urgent" },
  { id: 2, title: "Parent-Teacher Meeting Scheduled", date: "Feb 8, 2025", priority: "normal" },
  { id: 3, title: "Science Exhibition - Submit Projects", date: "Feb 6, 2025", priority: "urgent" },
];

export function NotificationsWidget() {
  const navigate = useNavigate();

  return (
    <Card className="shadow-card">
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
        {recentNotices.map((notice) => (
          <div
            key={notice.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => navigate("/notices")}
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                notice.priority === "urgent" ? "bg-destructive" : "bg-success"
              }`} />
              <p className="font-medium text-foreground text-sm">{notice.title}</p>
            </div>
            <p className="text-xs text-muted-foreground shrink-0 ml-2">{notice.date}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
