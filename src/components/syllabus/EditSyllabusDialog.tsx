import { useState, useEffect } from "react";
import {
    Pencil, Loader2, AlertCircle, Hash, AlignLeft, CheckCircle2, Clock, Trash2
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { updateSyllabusEntry, deleteSyllabusEntry } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { SyllabusEntry } from "@/types";

interface EditSyllabusDialogProps {
    entry: SyllabusEntry;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EditSyllabusDialog({ entry, open, onOpenChange, onSuccess }: EditSyllabusDialogProps) {
    const [unit, setUnit] = useState("");
    const [topic, setTopic] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("not_started");
    const [completionPercentage, setCompletionPercentage] = useState<number>(0);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open && entry) {
            setUnit(entry.unit_name || "");
            setTopic(entry.topic_name || "");
            setDescription(entry.description || "");
            setStatus(entry.status || "not_started");
            setCompletionPercentage(entry.completion_percentage || 0);
            setErrors({});
        }
    }, [open, entry]);

    // Sync completion percentage with status
    useEffect(() => {
        if (status === "completed") {
            setCompletionPercentage(100);
        } else if (status === "not_started") {
            setCompletionPercentage(0);
        } else if (status === "in_progress" && completionPercentage === 0) {
            setCompletionPercentage(50);
        }
    }, [status]);

    const handleSubmit = async () => {
        const newErrors: Record<string, string> = {};
        if (!topic.trim()) newErrors.topic = "Topic name is required";
        if (completionPercentage < 0 || completionPercentage > 100) newErrors.completion = "Invalid percentage";
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        setIsSubmitting(true);
        try {
            const payload: Record<string, any> = {
                unit: unit.trim() || null,
                topic: topic.trim(),
                description: description.trim() || null,
                status,
                completion_percentage: completionPercentage
            };

            const res = await updateSyllabusEntry(entry.id, payload);
            if (res.success) {
                toast({ title: "Topic Updated", description: `Updated details for "${topic}".` });
                onOpenChange(false);
                onSuccess();
            }
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "Failed to update topic.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await deleteSyllabusEntry(entry.id);
            if (res.success) {
                toast({ title: "Topic Deleted", description: `Removed "${topic}" from syllabus.` });
                setShowDeleteConfirm(false);
                onOpenChange(false);
                onSuccess();
            }
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "Failed to delete topic.", variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white">
                        <DialogHeader className="space-y-1">
                            <DialogTitle className="text-white text-lg font-bold flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                        <Pencil className="h-5 w-5" />
                                    </div>
                                    Edit Syllabus Topic
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDeleteConfirm(true); }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </DialogTitle>
                            <DialogDescription className="text-white/80 text-sm">
                                Update progress or details for this topic.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="px-6 py-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                    Status
                                </Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="mt-1.5 rounded-lg">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="not_started">Upcoming</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    Completion %
                                </Label>
                                <div className="relative mt-1.5">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={completionPercentage}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setCompletionPercentage(Math.min(100, Math.max(0, val)));
                                            if (val === 100) setStatus("completed");
                                            else if (val > 0) setStatus("in_progress");
                                            else if (val === 0) setStatus("not_started");
                                        }}
                                        className={`rounded-lg pr-8 ${errors.completion ? "border-destructive" : ""}`}
                                        disabled={status === "completed" || status === "not_started"}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label className="text-sm font-medium flex items-center gap-1">
                                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                Unit Name
                            </Label>
                            <Input placeholder="e.g. Unit 1: Algebra" value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-1.5 rounded-lg" />
                        </div>

                        <div>
                            <Label className="text-sm font-medium flex items-center gap-1">
                                <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                Topic Name <span className="text-destructive">*</span>
                            </Label>
                            <Input placeholder="e.g. Linear Equations" value={topic} onChange={(e) => { setTopic(e.target.value); if (errors.topic) setErrors({}); }} className={`mt-1.5 rounded-lg ${errors.topic ? "border-destructive" : ""}`} />
                            {errors.topic && <p className="text-xs text-destructive mt-1">{errors.topic}</p>}
                        </div>

                        <div>
                            <Label className="text-sm font-medium flex items-center gap-1">
                                <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                Description
                            </Label>
                            <Textarea placeholder="Details about this topic..." value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5 rounded-lg resize-none" rows={3} />
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                        <div className="flex items-center justify-end w-full gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-500/90 hover:to-orange-500/90">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmitting ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Topic</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{topic}" from the syllabus? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={(e) => { e.preventDefault(); handleDelete(); }}
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
