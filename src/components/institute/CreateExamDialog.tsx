import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar as CalendarIcon, BookOpen } from "lucide-react";
import { getClasses, getSubjectsByClass, createExam, getSyllabus } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Class, Subject, SyllabusEntry } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface CreateExamDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CreateExamDialog({ open, onOpenChange, onSuccess }: CreateExamDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState<Class[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [syllabus, setSyllabus] = useState<SyllabusEntry[]>([]);

    const [formData, setFormData] = useState({
        name: "",
        exam_type: "",
        class_id: "",
        subject_id: "",
        exam_date: "",
        total_marks: "100",
        passing_marks: "33",
        weightage: "1.0",
    });

    useEffect(() => {
        if (open) {
            loadClasses();
        } else {
            setFormData({
                name: "", exam_type: "", class_id: "", subject_id: "", exam_date: "",
                total_marks: "100", passing_marks: "33", weightage: "1.0",
            });
            setSyllabus([]);
        }
    }, [open]);

    useEffect(() => {
        if (formData.class_id) {
            loadSubjects(formData.class_id);
        } else {
            setSubjects([]);
        }
        setFormData(prev => ({ ...prev, subject_id: "" }));
    }, [formData.class_id]);

    useEffect(() => {
        if (formData.class_id && formData.subject_id) {
            loadSyllabus(formData.class_id, formData.subject_id);
        } else {
            setSyllabus([]);
        }
    }, [formData.class_id, formData.subject_id]);

    const loadClasses = async () => {
        try {
            const res = await getClasses();
            if (res.success && res.data?.classes) {
                setClasses(res.data.classes);
            }
        } catch {
            toast({ title: "Error", description: "Failed to load classes", variant: "destructive" });
        }
    };

    const loadSubjects = async (classId: string) => {
        try {
            const res = await getSubjectsByClass(classId);
            if (res.success && res.data?.subjects) {
                setSubjects(res.data.subjects);
            }
        } catch {
            toast({ title: "Error", description: "Failed to load subjects", variant: "destructive" });
        }
    };

    const loadSyllabus = async (classId: string, subjectId: string) => {
        try {
            const res = await getSyllabus({ class_id: classId, subject_id: subjectId });
            if (res.success && res.data?.syllabus) {
                setSyllabus(res.data.syllabus);
            }
        } catch {
            // It's okay if syllabus fails to load
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await createExam({
                name: formData.name,
                exam_type: formData.exam_type as any,
                class_id: formData.class_id,
                subject_id: formData.subject_id || undefined,
                exam_date: formData.exam_date || undefined,
                total_marks: Number(formData.total_marks),
                passing_marks: Number(formData.passing_marks),
                weightage: Number(formData.weightage)
            });

            if (res.success) {
                toast({ title: "Success", description: "Exam scheduled successfully" });
                onSuccess();
                onOpenChange(false);
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to schedule exam", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // Calculate Syllabus Progress
    const completedTopics = syllabus.filter(s => s.status === 'completed').length;
    const totalTopics = syllabus.length;
    const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-border/50 shadow-2xl">
                <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 p-6 pb-4 border-b border-border/40">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <CalendarIcon className="h-6 w-6 text-primary" />
                            Schedule New Exam
                        </DialogTitle>
                        <DialogDescription>
                            Create a new examination. The subject syllabus progress will be shown below to assist in scheduling.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <ScrollArea className="max-h-[70vh]">
                    <form id="create-exam-form" onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <div className="space-y-2">
                                <Label>Exam Name <span className="text-destructive">*</span></Label>
                                <Input
                                    required
                                    placeholder="e.g. Mid Term Math Test"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="rounded-xl border-border/50 h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Exam Type <span className="text-destructive">*</span></Label>
                                <Select required value={formData.exam_type} onValueChange={(v) => setFormData({ ...formData, exam_type: v })}>
                                    <SelectTrigger className="rounded-xl h-11">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unit_test">Unit Test</SelectItem>
                                        <SelectItem value="mid_term">Mid Term</SelectItem>
                                        <SelectItem value="final">Final Exam</SelectItem>
                                        <SelectItem value="practical">Practical</SelectItem>
                                        <SelectItem value="assignment">Assignment / Project</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Class <span className="text-destructive">*</span></Label>
                                <Select required value={formData.class_id} onValueChange={(v) => setFormData({ ...formData, class_id: v })}>
                                    <SelectTrigger className="rounded-xl h-11">
                                        <SelectValue placeholder="Select class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Subject (Optional)</Label>
                                <Select value={formData.subject_id} onValueChange={(v) => setFormData({ ...formData, subject_id: v })} disabled={!formData.class_id}>
                                    <SelectTrigger className="rounded-xl h-11">
                                        <SelectValue placeholder={formData.class_id ? "Select subject" : "Select class first"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none" className="text-muted-foreground italic">General / All Subjects</SelectItem>
                                        {subjects.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Exam Date</Label>
                                <Input
                                    type="date"
                                    value={formData.exam_date}
                                    onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                                    className="rounded-xl border-border/50 h-11"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Total Marks <span className="text-destructive">*</span></Label>
                                    <Input
                                        required
                                        type="number"
                                        min="1"
                                        value={formData.total_marks}
                                        onChange={(e) => setFormData({ ...formData, total_marks: e.target.value })}
                                        className="rounded-xl border-border/50 h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Passing Marks</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.passing_marks}
                                        onChange={(e) => setFormData({ ...formData, passing_marks: e.target.value })}
                                        className="rounded-xl border-border/50 h-11"
                                    />
                                </div>
                            </div>

                        </div>

                        {/* Syllabus Integration Preview */}
                        {formData.class_id && formData.subject_id && formData.subject_id !== 'none' && (
                            <div className="mt-6 p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <BookOpen className="h-4 w-4 text-primary" />
                                        Syllabus Coverage Status
                                    </div>
                                    <Badge variant={progressPercentage > 80 ? "default" : progressPercentage > 40 ? "secondary" : "outline"}>
                                        {progressPercentage}% Completed
                                    </Badge>
                                </div>
                                {totalTopics > 0 ? (
                                    <div className="space-y-1.5">
                                        <Progress value={progressPercentage} className="h-2" />
                                        <p className="text-xs text-muted-foreground text-right">
                                            {completedTopics} out of {totalTopics} topics completed
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">No syllabus defined for this subject yet.</p>
                                )}
                            </div>
                        )}

                    </form>
                </ScrollArea>

                <div className="p-6 pt-4 border-t border-border/40 bg-muted/10">
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
                        <Button type="submit" form="create-exam-form" disabled={loading} className="rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarIcon className="h-4 w-4 mr-2" />}
                            Schedule Exam
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
