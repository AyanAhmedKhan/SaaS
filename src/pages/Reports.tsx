import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Target,
  BarChart3,
  Filter,
} from "lucide-react";

// Mock data
const examResults = [
  { id: 1, exam: "Unit Test 1", subject: "Mathematics", score: 82, total: 100, grade: "A", date: "2024-07-15" },
  { id: 2, exam: "Unit Test 1", subject: "Physics", score: 75, total: 100, grade: "B+", date: "2024-07-15" },
  { id: 3, exam: "Unit Test 1", subject: "Chemistry", score: 88, total: 100, grade: "A", date: "2024-07-16" },
  { id: 4, exam: "Unit Test 1", subject: "English", score: 91, total: 100, grade: "A+", date: "2024-07-16" },
  { id: 5, exam: "Unit Test 1", subject: "Biology", score: 70, total: 100, grade: "B", date: "2024-07-17" },
  { id: 6, exam: "Mid Term", subject: "Mathematics", score: 78, total: 100, grade: "B+", date: "2024-09-20" },
  { id: 7, exam: "Mid Term", subject: "Physics", score: 82, total: 100, grade: "A", date: "2024-09-20" },
  { id: 8, exam: "Mid Term", subject: "Chemistry", score: 85, total: 100, grade: "A", date: "2024-09-21" },
  { id: 9, exam: "Mid Term", subject: "English", score: 88, total: 100, grade: "A", date: "2024-09-21" },
  { id: 10, exam: "Mid Term", subject: "Biology", score: 76, total: 100, grade: "B+", date: "2024-09-22" },
  { id: 11, exam: "Unit Test 2", subject: "Mathematics", score: 90, total: 100, grade: "A+", date: "2024-11-10" },
  { id: 12, exam: "Unit Test 2", subject: "Physics", score: 85, total: 100, grade: "A", date: "2024-11-10" },
  { id: 13, exam: "Unit Test 2", subject: "Chemistry", score: 92, total: 100, grade: "A+", date: "2024-11-11" },
  { id: 14, exam: "Unit Test 2", subject: "English", score: 86, total: 100, grade: "A", date: "2024-11-11" },
  { id: 15, exam: "Unit Test 2", subject: "Biology", score: 80, total: 100, grade: "A", date: "2024-11-12" },
];

const performanceTrend = [
  { exam: "UT 1", Mathematics: 82, Physics: 75, Chemistry: 88, English: 91, Biology: 70, average: 81.2 },
  { exam: "Mid Term", Mathematics: 78, Physics: 82, Chemistry: 85, English: 88, Biology: 76, average: 81.8 },
  { exam: "UT 2", Mathematics: 90, Physics: 85, Chemistry: 92, English: 86, Biology: 80, average: 86.6 },
];

const subjectRadar = [
  { subject: "Mathematics", score: 90, fullMark: 100 },
  { subject: "Physics", score: 85, fullMark: 100 },
  { subject: "Chemistry", score: 92, fullMark: 100 },
  { subject: "English", score: 86, fullMark: 100 },
  { subject: "Biology", score: 80, fullMark: 100 },
];

const classRanking = [
  { name: "Ava Johnson", avg: 95, rank: 1 },
  { name: "James Brown", avg: 92, rank: 2 },
  { name: "Emma Wilson", avg: 88, rank: 3 },
  { name: "Sophia Davis", avg: 85, rank: 4 },
  { name: "William Taylor", avg: 82, rank: 5 },
];

const trendChartConfig = {
  Mathematics: { label: "Mathematics", color: "hsl(var(--primary))" },
  Physics: { label: "Physics", color: "hsl(var(--accent))" },
  Chemistry: { label: "Chemistry", color: "hsl(210, 70%, 55%)" },
  English: { label: "English", color: "hsl(150, 60%, 45%)" },
  Biology: { label: "Biology", color: "hsl(30, 70%, 50%)" },
  average: { label: "Average", color: "hsl(var(--destructive))" },
};

const barChartConfig = {
  score: { label: "Score", color: "hsl(var(--primary))" },
};

const radarChartConfig = {
  score: { label: "Score", color: "hsl(var(--primary))" },
};

function getScoreTrend(subject: string): "up" | "down" | "neutral" {
  const scores = performanceTrend.map((d) => d[subject as keyof typeof d] as number);
  if (scores.length < 2) return "neutral";
  const last = scores[scores.length - 1];
  const prev = scores[scores.length - 2];
  if (last > prev) return "up";
  if (last < prev) return "down";
  return "neutral";
}

function TrendIcon({ trend }: { trend: "up" | "down" | "neutral" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function getGradeBadgeVariant(grade: string) {
  if (grade.startsWith("A")) return "default";
  if (grade.startsWith("B")) return "secondary";
  return "outline";
}

function handleDownload(reportType: string) {
  // Placeholder for download logic
  const content = `EduYantra Progress Report\n\nReport Type: ${reportType}\nGenerated: ${new Date().toLocaleDateString()}\n\nThis is a placeholder report. Backend integration required for full report generation.`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${reportType.toLowerCase().replace(/\s+/g, "-")}-report.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [selectedExam, setSelectedExam] = useState<string>("all");

  const filteredResults =
    selectedExam === "all"
      ? examResults
      : examResults.filter((r) => r.exam === selectedExam);

  const latestAvg = performanceTrend[performanceTrend.length - 1].average;
  const prevAvg = performanceTrend[performanceTrend.length - 2].average;
  const avgTrend = latestAvg > prevAvg ? "up" : latestAvg < prevAvg ? "down" : "neutral";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground text-sm">
              Academic performance, test results, and progress reports
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload("Progress Summary")}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Overall Average</p>
                  <p className="text-2xl font-bold mt-1">{latestAvg}%</p>
                </div>
                <div className="flex items-center gap-1">
                  <TrendIcon trend={avgTrend} />
                  <span className="text-xs text-muted-foreground">
                    {Math.abs(latestAvg - prevAvg).toFixed(1)}%
                  </span>
                </div>
              </div>
              <Progress value={latestAvg} className="mt-3 h-2" />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Best Subject</p>
                  <p className="text-2xl font-bold mt-1">Chemistry</p>
                </div>
                <Trophy className="h-8 w-8 text-amber-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Scored 92% in latest exam</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Class Rank</p>
                  <p className="text-2xl font-bold mt-1">3 / 45</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Top 7% of class</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Exams Taken</p>
                  <p className="text-2xl font-bold mt-1">3</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Unit Test 1, Mid Term, Unit Test 2</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="results" className="space-y-4">
          <TabsList>
            <TabsTrigger value="results">Test Results</TabsTrigger>
            <TabsTrigger value="performance">Performance Graphs</TabsTrigger>
            <TabsTrigger value="download">Downloadable Reports</TabsTrigger>
          </TabsList>

          {/* Test Results Tab */}
          <TabsContent value="results" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-lg">Exam Results</CardTitle>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={selectedExam} onValueChange={setSelectedExam}>
                      <SelectTrigger className="w-[160px] h-8 text-sm">
                        <SelectValue placeholder="Filter by exam" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Exams</SelectItem>
                        <SelectItem value="Unit Test 1">Unit Test 1</SelectItem>
                        <SelectItem value="Mid Term">Mid Term</SelectItem>
                        <SelectItem value="Unit Test 2">Unit Test 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exam</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead className="text-center">Trend</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.exam}</TableCell>
                          <TableCell>{result.subject}</TableCell>
                          <TableCell className="text-center">
                            {result.score}/{result.total}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={getGradeBadgeVariant(result.grade)}>
                              {result.grade}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <TrendIcon trend={getScoreTrend(result.subject)} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">
                            {new Date(result.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Class Ranking */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Class Ranking (Top 5)</CardTitle>
                <CardDescription>Based on latest exam averages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {classRanking.map((student) => (
                    <div
                      key={student.rank}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            student.rank === 1
                              ? "bg-amber-100 text-amber-700"
                              : student.rank === 2
                              ? "bg-slate-100 text-slate-600"
                              : student.rank === 3
                              ? "bg-orange-100 text-orange-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {student.rank}
                        </span>
                        <span className="font-medium text-sm">{student.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={student.avg} className="w-24 h-2" />
                        <span className="text-sm font-semibold w-10 text-right">
                          {student.avg}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Graphs Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Trend Line Chart */}
              <Card className="shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Performance Trend</CardTitle>
                  <CardDescription>Subject-wise score progression across exams</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
                    <LineChart data={performanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="exam" tick={{ fontSize: 12 }} />
                      <YAxis domain={[60, 100]} tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="Mathematics" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Physics" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Chemistry" stroke="hsl(210, 70%, 55%)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="English" stroke="hsl(150, 60%, 45%)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Biology" stroke="hsl(30, 70%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="average" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Radar Chart */}
              <Card className="shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Subject Strength Map</CardTitle>
                  <CardDescription>Latest exam performance by subject</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={radarChartConfig} className="h-[300px] w-full">
                    <RadarChart data={subjectRadar} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid className="stroke-border/40" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RadarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Bar Chart */}
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Latest Exam Scores</CardTitle>
                <CardDescription>Unit Test 2 results across all subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={barChartConfig} className="h-[280px] w-full">
                  <BarChart data={subjectRadar}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="score" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Downloadable Reports Tab */}
          <TabsContent value="download" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: "Full Progress Report",
                  desc: "Complete academic performance summary with attendance, grades, and teacher remarks.",
                  type: "Full Progress",
                },
                {
                  title: "Exam-wise Report Card",
                  desc: "Detailed scorecard for each exam with subject breakdown and grade analysis.",
                  type: "Exam Report Card",
                },
                {
                  title: "Attendance Report",
                  desc: "Monthly and cumulative attendance records with day-wise breakdown.",
                  type: "Attendance",
                },
                {
                  title: "Subject Performance Report",
                  desc: "In-depth analysis of performance in each subject across all exams.",
                  type: "Subject Performance",
                },
                {
                  title: "Comparative Analysis",
                  desc: "Performance comparison with class average and topper scores.",
                  type: "Comparative Analysis",
                },
                {
                  title: "Teacher Feedback Summary",
                  desc: "Consolidated teacher remarks and behavioral observations.",
                  type: "Teacher Feedback",
                },
              ].map((report) => (
                <Card key={report.type} className="shadow-card flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{report.title}</CardTitle>
                        <CardDescription className="text-xs mt-1">{report.desc}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleDownload(report.type)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
