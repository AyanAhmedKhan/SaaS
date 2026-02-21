import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SubjectScore {
  subject: string;
  latestScore: number;
  maxScore: number;
  trend: "up" | "down" | "neutral";
}

const subjectScores: SubjectScore[] = [
  { subject: "Mathematics", latestScore: 85, maxScore: 100, trend: "up" },
  { subject: "Physics", latestScore: 72, maxScore: 100, trend: "down" },
  { subject: "Chemistry", latestScore: 78, maxScore: 100, trend: "up" },
  { subject: "English", latestScore: 90, maxScore: 100, trend: "neutral" },
  { subject: "Biology", latestScore: 68, maxScore: 100, trend: "down" },
];

const TrendIcon = ({ trend }: { trend: SubjectScore["trend"] }) => {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-success" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

export function SubjectPerformance() {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Subject-wise Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {subjectScores.map((item) => {
          const pct = Math.round((item.latestScore / item.maxScore) * 100);
          return (
            <div key={item.subject} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm">{item.subject}</span>
                  <TrendIcon trend={item.trend} />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {item.latestScore}/{item.maxScore}
                </span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
