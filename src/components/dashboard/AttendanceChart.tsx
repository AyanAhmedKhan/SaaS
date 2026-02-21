import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

  const chartData = data || fallbackData;

  return (
    <Card className="shadow-card border-border/50 hover:shadow-card-hover transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold tracking-tight">Attendance Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(213 56% 30%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(213 56% 30%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis
                dataKey="month"
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
                labelStyle={{ fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="attendance"
                stroke="hsl(213 56% 30%)"
                strokeWidth={2.5}
                fill="url(#attendanceGradient)"
                dot={{ r: 4, fill: 'hsl(213 56% 30%)', strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                activeDot={{ r: 6, fill: 'hsl(213 56% 24%)', strokeWidth: 2, stroke: 'hsl(var(--card))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
