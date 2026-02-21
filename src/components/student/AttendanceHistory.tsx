import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const attendanceSnapshot = {
  month: "January 2025",
  totalDays: 24,
  present: 22,
  absent: 2,
};

export function AttendanceHistory() {
  const navigate = useNavigate();
  const presentPct = Math.round((attendanceSnapshot.present / attendanceSnapshot.totalDays) * 100);
  const absentPct = 100 - presentPct;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Monthly Attendance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{attendanceSnapshot.month}</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <p className="text-2xl font-bold text-foreground">{presentPct}%</p>
              <p className="text-xs text-muted-foreground">Present ({attendanceSnapshot.present} days)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold text-foreground">{absentPct}%</p>
              <p className="text-xs text-muted-foreground">Absent ({attendanceSnapshot.absent} days)</p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/attendance")}>
          View Full Attendance Report
        </Button>
      </CardContent>
    </Card>
  );
}
