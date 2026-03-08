import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, RefreshCw, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { analyzeStudent } from "@/lib/api";

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
  studentId?: string;
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

function SafeBoldText({ text }: { text: string }) {
  const sanitized = text.replace(/<[^>]*>/g, "");
  const parts = sanitized.split(/\*\*(.*?)\*\*/g);
  return <>{parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}</>;
}

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-foreground/90">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (line.startsWith("### ")) return <h3 key={i} className="font-bold text-foreground mt-3 mb-1 text-base">{line.slice(4)}</h3>;
        if (line.startsWith("## ")) return <h2 key={i} className="font-bold text-foreground mt-4 mb-1.5 text-lg border-b pb-1">{line.slice(3)}</h2>;
        if (line.startsWith("# ")) return <h1 key={i} className="font-bold text-foreground mt-4 text-xl">{line.slice(2)}</h1>;
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="text-primary mt-1.5 text-xs shrink-0">●</span>
              <span><SafeBoldText text={line.slice(2)} /></span>
            </div>
          );
        }
        if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+)\.\s(.*)/);
          if (match) return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="text-primary font-bold shrink-0 text-xs mt-0.5">{match[1]}.</span>
              <span><SafeBoldText text={match[2]} /></span>
            </div>
          );
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return <p key={i} className="font-semibold text-foreground"><SafeBoldText text={line} /></p>;
        }
        return <p key={i}><SafeBoldText text={line} /></p>;
      })}
    </div>
  );
}

export function AIInsightCard({ data, role, showAdminToggle = false, studentId }: AIInsightCardProps) {
  const [enabled, setEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summary, setSummary] = useState(() => generateSummary(data, role));
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setSummary(generateSummary(data, role));
      setIsRefreshing(false);
    }, 800);
  }, [data, role]);

  const handleGeminiAnalysis = useCallback(async () => {
    if (!studentId) return;
    setAiLoading(true);
    setAiError(null);
    setShowAi(true);
    try {
      const res = await analyzeStudent(studentId);
      if (res.success && res.data) {
        const d = res.data as { analysis?: string; text?: string };
        setAiText(d.analysis || d.text || "No analysis returned.");
      } else {
        setAiError("Failed to get AI analysis. Please try again.");
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Unable to connect to AI service.");
    } finally {
      setAiLoading(false);
    }
  }, [studentId]);

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
              Gemini
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {showAdminToggle && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">Enabled</span>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>
            )}
            {studentId && !aiText && (
              <Button
                variant="default"
                size="sm"
                onClick={handleGeminiAnalysis}
                disabled={aiLoading}
                className="h-7 sm:h-8 text-xs bg-primary/90 hover:bg-primary"
              >
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Ask Gemini
              </Button>
            )}
            {studentId && aiText && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAi(v => !v)}
                className="h-7 sm:h-8 text-xs"
              >
                {showAi ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                {showAi ? "Collapse" : "See AI Report"}
              </Button>
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
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 space-y-3">
        <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">{summary}</p>

        {/* AI Loading state */}
        {aiLoading && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <Sparkles className="absolute inset-0 m-auto h-3 w-3 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Gemini is analyzing...</p>
              <p className="text-xs text-muted-foreground">Reviewing attendance, exams, and assignments</p>
            </div>
          </div>
        )}

        {/* AI Error */}
        {aiError && !aiLoading && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {aiError}
          </div>
        )}

        {/* AI Analysis Result */}
        {showAi && aiText && !aiLoading && (
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 p-4">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-primary/15">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Gemini AI Analysis</p>
                <p className="text-xs text-muted-foreground">Powered by Google Gemini 2.0</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGeminiAnalysis}
                className="ml-auto h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
              </Button>
            </div>
            <ScrollArea className="max-h-[320px]">
              <SimpleMarkdown text={aiText} />
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
