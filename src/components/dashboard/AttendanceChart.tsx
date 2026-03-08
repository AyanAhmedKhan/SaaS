import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceChartProps {
  data?: Array<{ month: string; attendance: number }>;
}

export function AttendanceChart({ data }: AttendanceChartProps) {
  const fallbackData = [
    { month: 'Apr', attendance: 92 },
    { month: 'May', attendance: 88 },
    { month: 'Jun', attendance: 95 },
    { month: 'Jul', attendance: 90 },
    { month: 'Aug', attendance: 87 },
    { month: 'Sep', attendance: 93 },
  ];

  const chartData = data && data.length > 0 ? data : fallbackData;

  // Calculate trend
  const latest = chartData[chartData.length - 1]?.attendance || 0;
  const previous = chartData[chartData.length - 2]?.attendance || latest;
  const diff = latest - previous;
  const trendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const TrendIcon = trendIcon;

  return (
    <Card className="shadow-card border-border/50 hover:shadow-card-hover transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">Attendance Trends</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Monthly attendance percentage</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs gap-1",
                diff > 0 ? "text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800" :
                diff < 0 ? "text-red-500 border-red-200 dark:border-red-800" :
                "text-muted-foreground"
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
              />
              <YAxis
                domain={[60, 100]}
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
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                formatter={(value: number) => [`${value}%`, 'Attendance']}
              />
              <Area
                type="monotone"
                dataKey="attendance"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#attendanceGradient)"
                dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--card))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
