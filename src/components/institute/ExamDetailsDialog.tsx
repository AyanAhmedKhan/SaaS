import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Save, GraduationCap, BarChart3, Users, AlertCircle } from "lucide-react";
import { getExam, enterExamResults } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Exam, ExamResult } from "@/types";

interface ExamDetailsDialogProps {
    examId: string | null;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ExamDetailsDialog({ examId, onOpenChange, onSuccess }: ExamDetailsDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exam, setExam] = useState<Exam | null>(null);
    const [results, setResults] = useState<ExamResult[]>([]);
    const [editedResults, setEditedResults] = useState<Record<string, { marks_obtained: string, is_absent: boolean, remarks: string }>>({});

    useEffect(() => {
        if (examId) {
            loadExamDetails(examId);
        } else {
            setExam(null);
            setResults([]);
            setEditedResults({});
        }
    }, [examId]);

    const loadExamDetails = async (id: string) => {
        try {
            setLoading(true);
            const res = await getExam(id);
            if (res.success && res.data) {
                setExam(res.data.exam);
                const fetchedResults = res.data.results || [];
                setResults(fetchedResults);

                // Initialize editable state
                const initialEdits: Record<string, any> = {};
                fetchedResults.forEach(r => {
                    initialEdits[r.student_id] = {
                        marks_obtained: r.marks_obtained?.toString() || "",
                        is_absent: r.is_absent || false,
                        remarks: r.remarks || ""
                    };
                });
                setEditedResults(initialEdits);
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to load exam details", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveMarks = async () => {
        if (!exam) return;
        try {
            setSaving(true);

            const payload = Object.entries(editedResults).map(([student_id, data]) => ({
                student_id,
                marks_obtained: data.is_absent ? 0 : Number(data.marks_obtained),
                is_absent: data.is_absent,
                remarks: data.remarks
            }));

            const res = await enterExamResults(exam.id, payload);

            if (res.success) {
                toast({ title: "Success", description: "Exam marks saved successfully." });
                loadExamDetails(exam.id); // Reload to get updated grades/ranks
                if (onSuccess) onSuccess();
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to save marks", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleEditChange = (studentId: string, field: string, value: any) => {
        setEditedResults(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
    };

    // --- Analysis Computations ---
    const presentStudents = results.filter(r => !r.is_absent && r.marks_obtained != null);
    const totalStudents = results.length;
    const attendancePercentage = totalStudents ? Math.round((presentStudents.length / totalStudents) * 100) : 0;

    const totalMarks = presentStudents.reduce((acc, curr) => acc + (curr.marks_obtained || 0), 0);
    const averageMarks = presentStudents.length ? (totalMarks / presentStudents.length).toFixed(1) : 0;

    const passedStudents = presentStudents.filter(r => (r.marks_obtained || 0) >= (exam?.passing_marks || 0));
    const passPercentage = presentStudents.length ? Math.round((passedStudents.length / presentStudents.length) * 100) : 0;

    const highestMarks = presentStudents.length ? Math.max(...presentStudents.map(r => r.marks_obtained || 0)) : 0;

    if (!exam && !loading) return null;

    return (
        <Dialog open={!!examId} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] h-[85vh] flex flex-col p-0 overflow-hidden border-border/50 shadow-2xl">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-background">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground animate-pulse">Loading exam details...</p>
                    </div>
                ) : exam && (
                    <>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 p-6 pb-4 border-b border-border/40 shrink-0">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                            <GraduationCap className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <div>{exam.name}</div>
                                            <div className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-2">
                                                <Badge variant="outline" className="bg-background/50 backdrop-blur capitalize">{exam.exam_type}</Badge>
                                                <span>•</span>
                                                <span>{exam.class_name}</span>
                                                {exam.subject_name && (
                                                    <><span>•</span><span>{exam.subject_name}</span></>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-background/60 backdrop-blur px-4 py-2 rounded-xl text-sm border border-border/50">
                                        <div className="text-center">
                                            <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total</div>
                                            <div className="font-bold">{exam.total_marks}</div>
                                        </div>
                                        <div className="w-px h-8 bg-border"></div>
                                        <div className="text-center">
                                            <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Passing</div>
                                            <div className="font-bold text-amber-600 dark:text-amber-500">{exam.passing_marks}</div>
                                        </div>
                                    </div>
                                </DialogTitle>
                            </DialogHeader>
                        </div>

                        <Tabs defaultValue="grading" className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-6 border-b border-border/40 shrink-0">
                                <TabsList className="h-12 bg-transparent gap-6">
                                    <TabsTrigger
                                        value="grading"
                                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-0 font-medium pb-2 pt-4"
                                    >
                                        Result Entry
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="analysis"
                                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-0 font-medium pb-2 pt-4"
                                    >
                                        Performance Analysis
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* GRADING TAB */}
                            <TabsContent value="grading" className="flex-1 flex flex-col overflow-hidden m-0 border-none outline-none">
                                <div className="px-6 py-4 bg-muted/20 border-b border-border/40 flex justify-between items-center shrink-0">
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Subject Teachers: Enter marks below. Auto-grading will compute ranks upon saving.
                                    </p>
                                    <Button
                                        onClick={handleSaveMarks}
                                        disabled={saving}
                                        className="rounded-xl shadow-md bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                        Save Marks & Grade
                                    </Button>
                                </div>

                                <ScrollArea className="flex-1">
                                    <div className="p-6">
                                        {results.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                                                <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
                                                <p>No students enrolled in this class yet.</p>
                                            </div>
                                        ) : (
                                            <div className="border border-border/50 rounded-xl overflow-hidden shadow-sm">
                                                <Table>
                                                    <TableHeader className="bg-muted/40">
                                                        <TableRow>
                                                            <TableHead className="w-16">Roll No</TableHead>
                                                            <TableHead>Student Name</TableHead>
                                                            <TableHead className="w-24 text-center">Absent</TableHead>
                                                            <TableHead className="w-32">Marks</TableHead>
                                                            <TableHead className="w-20">Grade</TableHead>
                                                            <TableHead className="w-20">Rank</TableHead>
                                                            <TableHead>Remarks</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {results.map((r) => {
                                                            const editData = editedResults[r.student_id] || { marks_obtained: '', is_absent: false, remarks: '' };
                                                            return (
                                                                <TableRow key={r.id} className="hover:bg-muted/10">
                                                                    <TableCell className="font-medium text-muted-foreground">{r.roll_number}</TableCell>
                                                                    <TableCell className="font-semibold">{r.student_name}</TableCell>
                                                                    <TableCell className="text-center">
                                                                        <Checkbox
                                                                            checked={editData.is_absent}
                                                                            onCheckedChange={(c) => handleEditChange(r.student_id, 'is_absent', c)}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Input
                                                                            type="number"
                                                                            className="h-9 w-full rounded-lg border-border/50 text-center"
                                                                            value={editData.is_absent ? '' : editData.marks_obtained}
                                                                            disabled={editData.is_absent}
                                                                            max={exam.total_marks}
                                                                            min={0}
                                                                            onChange={(e) => handleEditChange(r.student_id, 'marks_obtained', e.target.value)}
                                                                            placeholder="-"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {r.grade ? <Badge variant="secondary" className="font-bold">{r.grade}</Badge> : <span className="text-muted-foreground text-xs block text-center">—</span>}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {r.rank ? <Badge variant="outline">#{r.rank}</Badge> : <span className="text-muted-foreground text-xs block text-center">—</span>}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Input
                                                                            className="h-9 w-full rounded-lg border-border/50 text-xs"
                                                                            value={editData.remarks}
                                                                            onChange={(e) => handleEditChange(r.student_id, 'remarks', e.target.value)}
                                                                            placeholder="Optional remark"
                                                                        />
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            {/* ANALYSIS TAB */}
                            <TabsContent value="analysis" className="flex-1 overflow-auto m-0 border-none outline-none bg-background p-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    <div className="p-4 rounded-xl border border-border/50 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 shadow-sm">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Average Marks</p>
                                        <p className="text-3xl font-bold flex items-baseline gap-1">
                                            {averageMarks} <span className="text-sm font-medium text-muted-foreground">/ {exam.total_marks}</span>
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-xl border border-border/50 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 shadow-sm">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Pass Percentage</p>
                                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{passPercentage}%</p>
                                    </div>

                                    <div className="p-4 rounded-xl border border-border/50 bg-gradient-to-br from-amber-500/5 to-orange-500/5 shadow-sm">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Highest Marks</p>
                                        <p className="text-3xl font-bold flex items-baseline gap-1">
                                            {highestMarks} <span className="text-sm font-medium text-muted-foreground">/ {exam.total_marks}</span>
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-xl border border-border/50 bg-gradient-to-br from-purple-500/5 to-pink-500/5 shadow-sm">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Attendance</p>
                                        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{attendancePercentage}%</p>
                                    </div>
                                </div>

                                <div className="p-12 text-center rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
                                    <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                    <h3 className="text-lg font-semibold">Detailed Analytics</h3>
                                    <p className="text-muted-foreground text-sm max-w-md mx-auto mt-2">
                                        Advanced charts and distribution trends will be rendered here based on the graded marks.
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
