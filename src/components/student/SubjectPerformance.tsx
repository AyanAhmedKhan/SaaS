import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ExamEntry {
  subject_name?: string;
  marks_obtained?: number;
  max_marks?: number;
  exam_name?: string;
}

interface SubjectPerformanceProps {
  exams: ExamEntry[];
}

function TrendIcon({ trend }: { trend: "up" | "down" | "neutral" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function SubjectPerformance({ exams }: SubjectPerformanceProps) {
  const subjects = useMemo(() => {
    const map = new Map<string, { scores: number[]; max: number }>();
    for (const e of exams) {
      if (!e.subject_name) continue;
      if (!map.has(e.subject_name)) map.set(e.subject_name, { scores: [], max: e.max_marks || 100 });
      map.get(e.subject_name)!.scores.push(e.marks_obtained ?? 0);
    }
    return Array.from(map.entries()).map(([name, { scores, max }]) => {
      const latest = scores[0];
      const prev = scores.length > 1 ? scores[1] : latest;
      const trend: "up" | "down" | "neutral" = latest > prev ? "up" : latest < prev ? "down" : "neutral";
      return { name, latest, max, trend };
    });
  }, [exams]);

  return (
    <Card className="shadow-card border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Subject-wise Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No exam results yet.</p>
        ) : (
          subjects.map((item) => {
            const pct = Math.round((item.latest / item.max) * 100);
            return (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">{item.name}</span>
                    <TrendIcon trend={item.trend} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {item.latest}/{item.max}
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
