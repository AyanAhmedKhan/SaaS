import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw } from "lucide-react";

interface AIInsightData {
  attendance: number;
  avgScore: number;
  assignmentCompletion: number;
  recentTrend: "improving" | "declining" | "stable";
  topSubject?: string;
  weakSubject?: string;
}

interface AIInsightCardProps {
  data: AIInsightData;
  role: "student" | "parent" | "teacher" | "admin";
  showAdminToggle?: boolean;
}

function generateSummary(data: AIInsightData, role: string): string {
  const { attendance, avgScore, assignmentCompletion, recentTrend, topSubject, weakSubject } = data;

  const attendanceNote =
    attendance >= 90
      ? "Attendance is strong and consistent."
      : attendance >= 75
        ? "Attendance is acceptable but has room for improvement."
        : "Attendance is below expectations and needs immediate attention.";

  const scoreNote =
    avgScore >= 80
      ? `Academic performance is solid with an average score of ${avgScore}%.`
      : avgScore >= 60
        ? `Average score of ${avgScore}% indicates moderate performance that could benefit from focused revision.`
        : `Average score of ${avgScore}% signals a need for academic intervention and support.`;

  const trendNote =
    recentTrend === "improving"
      ? "Recent exam results show an upward trend."
      : recentTrend === "declining"
        ? "Recent results indicate a declining trend that should be addressed."
        : "Recent performance has remained stable.";

  const subjectNote =
    topSubject && weakSubject
      ? `${topSubject} stands out as the strongest subject, while ${weakSubject} may need additional focus.`
      : "";

  const assignmentNote =
    assignmentCompletion >= 90
      ? ""
      : ` Assignment completion is at ${assignmentCompletion}%, which could impact overall grades.`;

  const rolePrefix =
    role === "parent"
      ? "Your child's summary: "
      : role === "teacher"
        ? "Class-wide summary: "
        : role === "admin"
          ? "Institution-wide summary: "
          : "";

  return `${rolePrefix}${attendanceNote} ${scoreNote} ${trendNote}${subjectNote ? " " + subjectNote : ""}${assignmentNote}`;
}

export function AIInsightCard({ data, role, showAdminToggle = false }: AIInsightCardProps) {
  const [enabled, setEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summary, setSummary] = useState(() => generateSummary(data, role));

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setSummary(generateSummary(data, role));
      setIsRefreshing(false);
    }, 800);
  }, [data, role]);

  if (!enabled && showAdminToggle) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <p className="text-xs sm:text-sm text-muted-foreground">AI Insight is disabled</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs text-muted-foreground">Enable</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border-primary/20">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-lg font-semibold flex items-center gap-1.5 sm:gap-2">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            AI Insight
            <Badge variant="outline" className="text-[9px] sm:text-xs font-normal">
              Beta
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {showAdminToggle && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">Enabled</span>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-7 sm:h-8 text-xs"
            >
              <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline ml-1.5">Refresh</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">{summary}</p>
      </CardContent>
    </Card>
  );
}
