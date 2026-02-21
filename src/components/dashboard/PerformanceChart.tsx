import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PerformanceChartProps {
  data?: Array<{ subject: string; score: number }>;
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const fallbackData = [
    { subject: 'Math', score: 85 },
    { subject: 'Science', score: 78 },
    { subject: 'English', score: 92 },
    { subject: 'Hindi', score: 88 },
    { subject: 'SST', score: 74 },
  ];

  const chartData = data || fallbackData;

  return (
    <Card className="shadow-card border-border/50 hover:shadow-card-hover transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold tracking-tight">Subject Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(38 92% 50%)" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(28 92% 55%)" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis
                dataKey="subject"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-lg)',
                  fontSize: '13px'
                }}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2, radius: 4 }}
              />
              <Bar
                dataKey="score"
                fill="url(#barGradient)"
                radius={[8, 8, 0, 0]}
                maxBarSize={45}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
