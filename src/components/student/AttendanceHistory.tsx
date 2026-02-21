import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AttendanceHistoryProps {
  summary: {
    total: number;
    present: number;
    percentage: number;
  };
}

export function AttendanceHistory({ summary }: AttendanceHistoryProps) {
  const navigate = useNavigate();
  const total = Number(summary.total) || 0;
  const present = Number(summary.present) || 0;
  const absent = total - present;
  const presentPct = Number(summary.percentage) || 0;
  const absentPct = total > 0 ? Math.round((absent / total) * 100) : 0;

  return (
    <Card className="shadow-card border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Attendance Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{total} school days recorded</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-foreground">{presentPct}%</p>
              <p className="text-xs text-muted-foreground">Present ({present} days)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold text-foreground">{absentPct}%</p>
              <p className="text-xs text-muted-foreground">Absent ({absent} days)</p>
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
