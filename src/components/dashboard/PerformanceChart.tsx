import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { cn } from "@/lib/utils";

interface PerformanceChartProps {
  data?: Array<{ subject: string; score: number }>;
}

const BAR_COLORS = [
  'hsl(var(--primary))',
  'hsl(262 83% 68%)',
  'hsl(199 89% 48%)',
  'hsl(38 92% 50%)',
  'hsl(142 76% 36%)',
  'hsl(0 84% 60%)',
  'hsl(262 83% 58%)',
  'hsl(199 89% 58%)',
];

export function PerformanceChart({ data }: PerformanceChartProps) {
  const fallbackData = [
    { subject: 'Math', score: 85 },
    { subject: 'Science', score: 78 },
    { subject: 'English', score: 92 },
    { subject: 'Hindi', score: 88 },
    { subject: 'SST', score: 74 },
  ];

  const chartData = data && data.length > 0 ? data : fallbackData;

  // Calculate institute average across all subjects
  const avg = chartData.length > 0
    ? Math.round(chartData.reduce((sum, d) => sum + (d.score || 0), 0) / chartData.length)
    : 0;

  return (
    <Card className="shadow-card border-border/50 hover:shadow-card-hover transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">Subject Performance</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Average exam scores by subject</p>
          </div>
          <Badge variant="secondary" className="text-xs tabular-nums">
            Avg: {avg}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
              <XAxis
                dataKey="subject"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                interval={0}
                angle={chartData.length > 6 ? -30 : 0}
                textAnchor={chartData.length > 6 ? "end" : "middle"}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px hsl(var(--foreground) / 0.1)',
                  fontSize: '13px',
                  padding: '8px 12px'
                }}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15, radius: 4 }}
                formatter={(value: number) => [`${value}%`, 'Avg Score']}
              />
              <Bar
                dataKey="score"
                radius={[8, 8, 0, 0]}
                maxBarSize={42}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
