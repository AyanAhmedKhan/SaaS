import { useState, useEffect } from "react";
import {
    BookOpen,
    School,
    Loader2,
    Plus,
    Shield,
    X,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { getClasses, getSubjects } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Teacher, Class as ClassType, Subject, TeacherAssignment } from "@/types";

interface AssignTeacherDialogProps {
    teacher: Teacher;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AssignTeacherDialog({
    teacher,
    open,
    onOpenChange,
    onSuccess,
}: AssignTeacherDialogProps) {
    const [classes, setClasses] = useState<ClassType[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [isClassTeacher, setIsClassTeacher] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            setLoading(true);
            setSelectedClassId("");
            setSelectedSubjectId("");
            setIsClassTeacher(false);
            Promise.all([getClasses(), getSubjects()])
                .then(([classRes, subjectRes]) => {
                    if (classRes.success && classRes.data) {
                        setClasses((classRes.data as { classes: ClassType[] }).classes || []);
                    }
                    if (subjectRes.success && subjectRes.data) {
                        setSubjects((subjectRes.data as { subjects: Subject[] }).subjects || []);
                    }
                })
                .finally(() => setLoading(false));
        }
    }, [open]);

    const handleAssign = async () => {
        if (!selectedClassId || !selectedSubjectId) {
            toast({
                title: "Missing Fields",
                description: "Please select both a class and subject.",
                variant: "destructive",
            });
            return;
        }

        // Check for duplicate
        const isDuplicate = teacher.assignments?.some(
            (a) => a.class_id === selectedClassId && a.subject_id === selectedSubjectId
        );
        if (isDuplicate) {
            toast({
                title: "Already Assigned",
                description: "This teacher is already assigned to this class-subject pair.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await api.post(`/teachers/${teacher.id}/assign`, {
                class_id: selectedClassId,
                subject_id: selectedSubjectId,
                is_class_teacher: isClassTeacher,
            });
            if (res.success) {
                toast({
                    title: "Assignment Added",
                    description: `${teacher.name} has been assigned successfully.`,
                });
                setSelectedClassId("");
                setSelectedSubjectId("");
                setIsClassTeacher(false);
                onSuccess();
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err?.message || "Failed to assign teacher.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentAssignments = teacher.assignments || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-5 text-white">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <School className="h-5 w-5" />
                            </div>
                            Assign Classes & Subjects
                        </DialogTitle>
                        <DialogDescription className="text-white/80 text-sm">
                            Manage {teacher.name}'s class and subject assignments.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <ScrollArea className="max-h-[450px]">
                    <div className="px-6 py-5 space-y-5">
                        {/* Current Assignments */}
                        <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-primary" />
                                Current Assignments ({currentAssignments.length})
                            </h4>
                            {currentAssignments.length === 0 ? (
                                <div className="text-center py-6 bg-muted/30 rounded-xl">
                                    <School className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">No assignments yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {currentAssignments.map((a) => (
                                        <div
                                            key={a.id || `${a.class_id}-${a.subject_id}`}
                                            className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${a.is_class_teacher ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
                                                    {a.is_class_teacher ? (
                                                        <Shield className="h-4 w-4 text-amber-600" />
                                                    ) : (
                                                        <BookOpen className="h-4 w-4 text-primary" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {a.class_name || a.class_id}
                                                        {a.section ? ` - ${a.section}` : ""}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">{a.subject_name || a.subject_id}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {a.is_class_teacher && (
                                                    <Badge className="bg-amber-500/10 text-amber-600 text-[10px]">
                                                        Class Teacher
                                                    </Badge>
                                                )}
                                                <Badge variant="outline" className="text-[10px]">
                                                    Subject Teacher
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add New Assignment */}
                        <div className="border-t border-border/60 pt-4">
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Plus className="h-4 w-4 text-primary" />
                                Add New Assignment
                            </h4>

                            {loading ? (
                                <div className="flex items-center justify-center h-20 gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    <span className="text-sm text-muted-foreground">Loading classes & subjects...</span>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium">
                                                Class <span className="text-destructive">*</span>
                                            </Label>
                                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                                <SelectTrigger className="mt-1.5 rounded-lg">
                                                    <SelectValue placeholder="Select class" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {classes.map((c) => (
                                                        <SelectItem key={c.id} value={c.id}>
                                                            {c.name}{c.section ? ` - ${c.section}` : ""}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">
                                                Subject <span className="text-destructive">*</span>
                                            </Label>
                                            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                                                <SelectTrigger className="mt-1.5 rounded-lg">
                                                    <SelectValue placeholder="Select subject" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {subjects.map((s) => (
                                                        <SelectItem key={s.id} value={s.id}>
                                                            {s.name}{s.code ? ` (${s.code})` : ""}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                                        <div>
                                            <Label htmlFor="class-teacher-toggle" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                                                <Shield className="h-4 w-4 text-amber-500" />
                                                Assign as Class Teacher
                                            </Label>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Class teachers can manage attendance & remarks for this class.
                                            </p>
                                        </div>
                                        <Switch
                                            id="class-teacher-toggle"
                                            checked={isClassTeacher}
                                            onCheckedChange={setIsClassTeacher}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                    <div className="flex items-center justify-end w-full gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button
                            onClick={handleAssign}
                            disabled={isSubmitting || !selectedClassId || !selectedSubjectId}
                            className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-500/90 hover:to-violet-600/90 shadow-sm"
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? "Assigning..." : "Add Assignment"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
