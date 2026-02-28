import { useState, useEffect } from "react";
import { Loader2, ArrowRight } from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { bulkPromoteStudents, getAcademicYears, getClasses } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Student, AcademicYear, Class as ClassType } from "@/types";

interface BulkPromoteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedStudents: Student[];
    onSuccess: () => void;
}

export function BulkPromoteDialog({ open, onOpenChange, selectedStudents, onSuccess }: BulkPromoteDialogProps) {
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [classes, setClasses] = useState<ClassType[]>([]);
    const [targetYearId, setTargetYearId] = useState("");
    const [targetClassId, setTargetClassId] = useState("");
    const [promotionType, setPromotionType] = useState("promoted");
    const [submitting, setSubmitting] = useState(false);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            loadConfig();
        }
    }, [open]);

    const loadConfig = async () => {
        try {
            setLoadingConfig(true);
            const [ayRes, classRes] = await Promise.all([
                getAcademicYears(),
                getClasses()
            ]);
            if (ayRes.success && ayRes.data) {
                setAcademicYears(ayRes.data.academicYears || []);
                // Set default to current year
                const cur = ayRes.data.academicYears.find(a => a.is_current);
                if (cur) setTargetYearId(cur.id);
            }
            if (classRes.success && classRes.data) {
                setClasses(classRes.data.classes || []);
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to load academic years and classes.", variant: "destructive" });
        } finally {
            setLoadingConfig(false);
        }
    };

    const handlePromote = async () => {
        if (selectedStudents.length === 0) return;
        if (!targetYearId) {
            toast({ title: "Error", description: "Please select a target academic year.", variant: "destructive" });
            return;
        }
        if (promotionType === 'promoted' && !targetClassId) {
            toast({ title: "Error", description: "Please select a target class for promotion.", variant: "destructive" });
            return;
        }

        setSubmitting(true);

        // Group students by their current academic year to handle mixed selections safely,
        // though usually they are selected from the same view/year.
        const groupedByYear = selectedStudents.reduce((acc, student) => {
            const yId = student.academic_year_id || 'unknown';
            if (!acc[yId]) acc[yId] = [];
            acc[yId].push(student);
            return acc;
        }, {} as Record<string, Student[]>);

        try {
            let totalProcessed = 0;
            for (const [fromYearId, studentsChunk] of Object.entries(groupedByYear)) {
                const payload = {
                    to_academic_year_id: targetYearId,
                    promotions: studentsChunk.map(s => ({
                        student_id: s.id,
                        to_class_id: targetClassId || undefined,
                        promotion_type: promotionType
                    }))
                };

                // If fromYearId is missing or unknown, using the first target year as fallback is risky
                // but better to use the targetYearId than failing routing if it expects an ID.
                const routeYearId = fromYearId === 'unknown' ? targetYearId : fromYearId;

                await bulkPromoteStudents(routeYearId, payload);
                totalProcessed += studentsChunk.length;
            }

            toast({ title: "Success", description: `Successfully processed ${totalProcessed} students.` });
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast({ title: "Promotion Failed", description: err.message || "An error occurred during bulk operations.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Bulk Student Actions</DialogTitle>
                    <DialogDescription>
                        You are performing a bulk operation on {selectedStudents.length} selected student(s).
                    </DialogDescription>
                </DialogHeader>

                {loadingConfig ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Action Type</Label>
                            <Select value={promotionType} onValueChange={(val) => {
                                setPromotionType(val);
                                if (val === 'graduated' || val === 'transferred') setTargetClassId('');
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="promoted">Promote / Demote Class</SelectItem>
                                    <SelectItem value="graduated">Mark as Graduated</SelectItem>
                                    <SelectItem value="transferred">Mark as Transferred</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Target Academic Year</Label>
                            <Select value={targetYearId} onValueChange={setTargetYearId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Academic Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {academicYears.map(ay => (
                                        <SelectItem key={ay.id} value={ay.id}>
                                            {ay.name} {ay.is_current ? '(Current)' : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {promotionType === 'promoted' && (
                            <div className="space-y-2">
                                <Label>Target Class</Label>
                                <Select value={targetClassId} onValueChange={setTargetClassId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Class to move them to" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name} - {c.section}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 flex gap-3 text-sm mt-4">
                            <div><ArrowRight className="h-4 w-4 mt-0.5 text-primary" /></div>
                            <div>
                                <p className="font-medium text-foreground">What happens next?</p>
                                <p className="text-muted-foreground mt-1">
                                    {promotionType === 'promoted' && "Students will be moved to the new class and academic year records will be updated."}
                                    {promotionType === 'graduated' && "Students will be marked as graduated, remaining in their final year records."}
                                    {promotionType === 'transferred' && "Students will be marked as transferred out of the institute."}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
                    <Button onClick={handlePromote} disabled={submitting || (promotionType === 'promoted' && !targetClassId) || !targetYearId || selectedStudents.length === 0}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Execute
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
