import { useState, useEffect } from "react";
import { Loader2, Plus, AlertCircle, Save, Clock, MapPin, X, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { getSubjectsByClass, getTeachers, bulkSaveTimetable } from "@/lib/api";
import type { TimetableEntry, Subject, Teacher } from "@/types";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface ManageTimetableDialogProps {
    classId: string;
    className: string;
    initialEntries: TimetableEntry[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface DraftEntry {
    day_of_week: number;
    period_number: number;
    subject_id: string;
    teacher_id: string;
    start_time: string;
    end_time: string;
    room: string;
}

export function ManageTimetableDialog({ classId, className, initialEntries, open, onOpenChange, onSuccess }: ManageTimetableDialogProps) {
    const [entries, setEntries] = useState<DraftEntry[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loadingContext, setLoadingContext] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    // Dialog state for a specific cell
    const [activeCell, setActiveCell] = useState<{ day: number; period: number } | null>(null);
    const [cellData, setCellData] = useState<Partial<DraftEntry>>({});

    // Layout configuration
    const [maxPeriods, setMaxPeriods] = useState(8);

    useEffect(() => {
        if (open && classId) {
            setLoadingContext(true);
            Promise.all([
                getSubjectsByClass(classId),
                getTeachers()
            ]).then(([subRes, tRes]) => {
                if (subRes.success && subRes.data) {
                    setSubjects((subRes.data as { subjects: Subject[] }).subjects || []);
                }
                if (tRes.success && tRes.data) {
                    setTeachers((tRes.data as { teachers: Teacher[] }).teachers || []);
                }
            }).finally(() => setLoadingContext(false));

            // Map initial entries to draft structure
            const initialDrafts = initialEntries.map(e => ({
                day_of_week: e.day_of_week,
                period_number: e.period_number,
                subject_id: e.subject_id || "",
                teacher_id: e.teacher_id || "",
                start_time: e.start_time || "",
                end_time: e.end_time || "",
                room: e.room || ""
            }));
            setEntries(initialDrafts);

            // Determine max periods from data if > 8
            const dp = Math.max(8, ...initialDrafts.map(e => e.period_number));
            setMaxPeriods(dp);
        }
    }, [open, classId, initialEntries]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const validEntries = entries.filter(e => e.subject_id); // Only save entries with subjects attached
            const res = await bulkSaveTimetable(classId, validEntries);
            if (res.success) {
                toast({ title: "Timetable Saved", description: "The schedule has been updated successfully." });
                onOpenChange(false);
                onSuccess();
            }
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "Failed to save timetable.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const openCell = (day: number, period: number) => {
        const existing = entries.find(e => e.day_of_week === day && e.period_number === period);
        setActiveCell({ day, period });
        setCellData(existing || { subject_id: "", teacher_id: "", start_time: "", end_time: "", room: "" });
    };

    const saveCell = () => {
        if (!activeCell) return;
        const newEntries = entries.filter(e => !(e.day_of_week === activeCell.day && e.period_number === activeCell.period));
        if (cellData.subject_id) {
            newEntries.push({
                day_of_week: activeCell.day,
                period_number: activeCell.period,
                subject_id: cellData.subject_id || "",
                teacher_id: cellData.teacher_id || "",
                start_time: cellData.start_time || "",
                end_time: cellData.end_time || "",
                room: cellData.room || ""
            });
        }
        setEntries(newEntries);
        setActiveCell(null);
    };

    const removeCell = () => {
        if (!activeCell) return;
        setEntries(entries.filter(e => !(e.day_of_week === activeCell.day && e.period_number === activeCell.period)));
        setActiveCell(null);
    };

    const periods = Array.from({ length: maxPeriods }, (_, i) => i + 1);
    const days = [0, 1, 2, 3, 4, 5]; // Mon to Sat

    if (!open) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-blue-600 px-6 py-5 shrink-0 flex items-center justify-between text-white">
                        <DialogHeader className="space-y-1">
                            <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
                                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <Clock className="h-5 w-5" />
                                </div>
                                Manage Timetable: {className}
                            </DialogTitle>
                            <DialogDescription className="text-white/80 text-sm">
                                Click any cell to assign a subject and teacher for that period.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm bg-black/10 px-3 py-1.5 rounded-lg">
                                <span>Total Periods:</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => setMaxPeriods(Math.max(1, maxPeriods - 1))}>-</Button>
                                <span className="font-mono font-bold w-4 text-center">{maxPeriods}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => setMaxPeriods(maxPeriods + 1)}>+</Button>
                            </div>
                            <Button onClick={handleSave} disabled={isSaving || loadingContext} className="bg-white text-primary hover:bg-white/90">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Schedule
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-muted/10 p-4">
                        {loadingContext ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="min-w-[800px]">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-muted/50">
                                            <th className="p-3 border text-left font-semibold text-muted-foreground w-20 sticky left-0 bg-muted/95 z-10 backdrop-blur-sm">Period</th>
                                            {days.map(d => (
                                                <th key={d} className="p-3 border text-center font-semibold text-muted-foreground w-[16%]">
                                                    {DAY_NAMES[d]}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {periods.map(pNum => (
                                            <tr key={pNum}>
                                                <td className="p-3 border font-medium text-center text-muted-foreground bg-muted/50 sticky left-0 z-10">
                                                    {pNum}
                                                </td>
                                                {days.map(d => {
                                                    const entry = entries.find(e => e.day_of_week === d && e.period_number === pNum);
                                                    const subName = entry ? subjects.find(s => s.id === entry.subject_id)?.name : null;
                                                    const teacherName = entry ? teachers.find(t => t.id === entry.teacher_id)?.name : null;

                                                    return (
                                                        <td key={d} className="border p-2 min-h-[80px] align-top bg-white">
                                                            <div
                                                                onClick={() => openCell(d, pNum)}
                                                                className={`h-full min-h-[80px] w-full rounded-lg border-2 border-dashed p-2 cursor-pointer transition-all duration-200 ${entry
                                                                    ? "border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60"
                                                                    : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
                                                                    }`}
                                                            >
                                                                {entry ? (
                                                                    <div className="flex flex-col h-full justify-between gap-1">
                                                                        <div>
                                                                            <div className="font-semibold text-sm text-primary leading-tight line-clamp-2">{subName || "Unknown Subject"}</div>
                                                                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{teacherName || "No teacher"}</div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground font-mono">
                                                                            {(entry.start_time || entry.end_time) && <span>{entry.start_time?.slice(0, 5)} - {entry.end_time?.slice(0, 5)}</span>}
                                                                            {entry.room && <span className="ml-auto flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{entry.room}</span>}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-full text-muted-foreground/40 font-medium text-sm group-hover:text-primary/40">
                                                                        <Plus className="h-5 w-5 mr-1" /> Add
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Extracted Cell Dialog */}
            {activeCell && (
                <Dialog open={!!activeCell} onOpenChange={(open) => { if (!open) setActiveCell(null); }}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle>Period {activeCell.period} • {DAY_NAMES[activeCell.day]}</DialogTitle>
                            <DialogDescription>Assign a subject and teacher for this slot.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label>Subject <span className="text-destructive">*</span></Label>
                                <Select value={cellData.subject_id} onValueChange={(v) => setCellData({ ...cellData, subject_id: v })}>
                                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                    <SelectContent>
                                        {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Teacher</Label>
                                <Select value={cellData.teacher_id} onValueChange={(v) => setCellData({ ...cellData, teacher_id: v })}>
                                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">None</SelectItem>
                                        {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Start Time</Label>
                                    <Input type="time" value={cellData.start_time} onChange={(e) => setCellData({ ...cellData, start_time: e.target.value })} className="mt-1.5" />
                                </div>
                                <div>
                                    <Label>End Time</Label>
                                    <Input type="time" value={cellData.end_time} onChange={(e) => setCellData({ ...cellData, end_time: e.target.value })} className="mt-1.5" />
                                </div>
                            </div>
                            <div>
                                <Label>Room / Lab</Label>
                                <Input placeholder="e.g. Room 101" value={cellData.room} onChange={(e) => setCellData({ ...cellData, room: e.target.value })} className="mt-1.5" />
                            </div>
                        </div>
                        <DialogFooter className="flex items-center justify-between w-full sm:justify-between">
                            <Button type="button" variant="ghost" onClick={removeCell} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Clear Slot
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setActiveCell(null)}>Cancel</Button>
                                <Button onClick={saveCell} disabled={!cellData.subject_id}>Save to Draft</Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
