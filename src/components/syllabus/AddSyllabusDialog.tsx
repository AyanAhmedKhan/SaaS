import { useState, useEffect } from "react";
import {
    BookOpen, Loader2, Plus, AlertCircle, Hash, AlignLeft
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createSyllabusEntry, getClasses, getSubjects, getSubjectsByClass } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Class as ClassType, Subject } from "@/types";

interface AddSyllabusDialogProps {
    onSuccess: () => void;
    defaultClassId?: string;
    defaultSubjectId?: string;
}

export function AddSyllabusDialog({ onSuccess, defaultClassId = "all", defaultSubjectId = "all" }: AddSyllabusDialogProps) {
    const [open, setOpen] = useState(false);
    const [classes, setClasses] = useState<ClassType[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loadingContext, setLoadingContext] = useState(false);

    const [classId, setClassId] = useState(defaultClassId === "all" ? "" : defaultClassId);
    const [subjectId, setSubjectId] = useState(defaultSubjectId === "all" ? "" : defaultSubjectId);
    const [unit, setUnit] = useState("");
    const [topic, setTopic] = useState("");
    const [description, setDescription] = useState("");

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            setLoadingContext(true);
            getClasses()
                .then(res => {
                    if (res.success && res.data) {
                        setClasses((res.data as { classes: ClassType[] }).classes || []);
                    }
                })
                .finally(() => setLoadingContext(false));

            // Preset from props
            if (defaultClassId !== "all") setClassId(defaultClassId);
            if (defaultSubjectId !== "all") setSubjectId(defaultSubjectId);
        }
    }, [open, defaultClassId, defaultSubjectId]);

    useEffect(() => {
        if (classId) {
            setSubjectId(""); // Reset subject when class changes
            getSubjectsByClass(classId).then(res => {
                if (res.success && res.data) {
                    setSubjects((res.data as { subjects: Subject[] }).subjects || []);
                }
            });
        } else {
            setSubjects([]);
        }
    }, [classId]);

    const handleSubmit = async () => {
        const newErrors: Record<string, string> = {};
        if (!classId) newErrors.classId = "Class is required";
        if (!subjectId) newErrors.subjectId = "Subject is required";
        if (!topic.trim()) newErrors.topic = "Topic name is required";
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        setIsSubmitting(true);
        try {
            const payload: Record<string, any> = {
                class_id: classId,
                subject_id: subjectId,
                topic: topic.trim(),
                status: "not_started",
                completion_percentage: 0
            };
            if (unit) payload.unit = unit.trim();
            if (description) payload.description = description.trim();

            const res = await createSyllabusEntry(payload);
            if (res.success) {
                toast({ title: "Topic Created", description: `Added "${topic}" to the syllabus.` });
                setOpen(false);
                setUnit(""); setTopic(""); setDescription(""); setErrors({});
                onSuccess();
            }
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "Failed to create topic.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => { if (!val) { setUnit(""); setTopic(""); setDescription(""); setErrors({}); } setOpen(val); }}>
            <DialogTrigger asChild>
                <Button className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Topic
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-blue-600 px-6 py-5 text-white">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            Add Syllabus Topic
                        </DialogTitle>
                        <DialogDescription className="text-white/80 text-sm">
                            Create a new entry in the syllabus.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-sm font-medium">Class <span className="text-destructive">*</span></Label>
                            <Select value={classId} onValueChange={setClassId}>
                                <SelectTrigger className={`mt-1.5 rounded-lg ${errors.classId ? "border-destructive" : ""}`}>
                                    <SelectValue placeholder="Select class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Subject <span className="text-destructive">*</span></Label>
                            <Select value={subjectId} onValueChange={setSubjectId} disabled={!classId || subjects.length === 0}>
                                <SelectTrigger className={`mt-1.5 rounded-lg ${errors.subjectId ? "border-destructive" : ""}`}>
                                    <SelectValue placeholder={!classId ? "Select internal class first" : "Select subject"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name} {s.code && `(${s.code})`}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-medium flex items-center gap-1">
                            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                            Unit Name (Optional)
                        </Label>
                        <Input placeholder="e.g. Unit 1: Algebra" value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-1.5 rounded-lg" />
                    </div>

                    <div>
                        <Label className="text-sm font-medium flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            Topic Name <span className="text-destructive">*</span>
                        </Label>
                        <Input placeholder="e.g. Linear Equations" value={topic} onChange={(e) => { setTopic(e.target.value); if (errors.topic) setErrors({}); }} className={`mt-1.5 rounded-lg ${errors.topic ? "border-destructive" : ""}`} />
                        {errors.topic && <p className="text-xs text-destructive mt-1">{errors.topic}</p>}
                    </div>

                    <div>
                        <Label className="text-sm font-medium flex items-center gap-1">
                            <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
                            Description (Optional)
                        </Label>
                        <Textarea placeholder="Details about this topic..." value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5 rounded-lg resize-none" rows={3} />
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                    <div className="flex items-center justify-end w-full gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-gradient-to-r from-primary to-blue-600">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? "Creating..." : "Add Topic"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
