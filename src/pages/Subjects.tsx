import { useState, useEffect, useCallback } from "react";
import {
    Search, BookOpen, Loader2, AlertCircle, Plus, Pencil,
    Hash, FileText, MoreVertical, CheckCircle, XCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getSubjects, createSubject, updateSubject } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Subject } from "@/types";

// ─── Add Subject Dialog ───
function AddSubjectDialog({ onSuccess }: { onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [description, setDescription] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = "Subject name is required";
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        setIsSubmitting(true);
        try {
            const payload: Record<string, unknown> = { name: name.trim() };
            if (code) payload.code = code.trim().toUpperCase();
            if (description) payload.description = description.trim();

            const res = await createSubject(payload as any);
            if (res.success) {
                toast({ title: "Subject Created", description: `${name} has been added.` });
                setName(""); setCode(""); setDescription(""); setErrors({});
                setOpen(false);
                onSuccess();
            }
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "Failed to create subject.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => { if (!val) { setName(""); setCode(""); setDescription(""); setErrors({}); } setOpen(val); }}>
            <DialogTrigger asChild>
                <Button className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md hover:shadow-lg transition-all duration-200">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subject
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-blue-600 px-6 py-5 text-white">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            Add New Subject
                        </DialogTitle>
                        <DialogDescription className="text-white/80 text-sm">
                            Create a new subject for your institute.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div>
                        <Label className="text-sm font-medium flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            Subject Name <span className="text-destructive">*</span>
                        </Label>
                        <Input placeholder="e.g. Mathematics" value={name} onChange={(e) => { setName(e.target.value); if (errors.name) setErrors({}); }} className={`mt-1.5 rounded-lg ${errors.name ? "border-destructive" : ""}`} />
                        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <Label className="text-sm font-medium flex items-center gap-1">
                            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                            Subject Code
                        </Label>
                        <Input placeholder="e.g. MATH, ENG, SCI" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="mt-1.5 rounded-lg font-mono" />
                    </div>
                    <div>
                        <Label className="text-sm font-medium flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            Description
                        </Label>
                        <Textarea placeholder="Optional description..." value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5 rounded-lg resize-none" rows={3} />
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                    <div className="flex items-center justify-end w-full gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? "Creating..." : "Create Subject"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Edit Subject Dialog ───
function EditSubjectDialog({ subject, open, onOpenChange, onSuccess }: {
    subject: Subject; open: boolean; onOpenChange: (o: boolean) => void; onSuccess: () => void;
}) {
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [description, setDescription] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open && subject) {
            setName(subject.name || "");
            setCode(subject.code || "");
            setDescription(subject.description || "");
            setIsActive(subject.is_active !== false);
        }
    }, [open, subject]);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setIsSubmitting(true);
        try {
            const payload: Record<string, unknown> = {
                name: name.trim(),
                code: code.trim() || null,
                description: description.trim() || null,
                is_active: isActive,
            };
            const res = await updateSubject(subject.id, payload as any);
            if (res.success) {
                toast({ title: "Subject Updated", description: `${name} has been updated.` });
                onOpenChange(false);
                onSuccess();
            }
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "Failed to update.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Pencil className="h-5 w-5" />
                            </div>
                            Edit Subject
                        </DialogTitle>
                        <DialogDescription className="text-white/80 text-sm">
                            Update {subject.name}'s details.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div>
                        <Label className="text-sm font-medium">Subject Name <span className="text-destructive">*</span></Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 rounded-lg" />
                    </div>
                    <div>
                        <Label className="text-sm font-medium">Subject Code</Label>
                        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="mt-1.5 rounded-lg font-mono" />
                    </div>
                    <div>
                        <Label className="text-sm font-medium">Description</Label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5 rounded-lg resize-none" rows={3} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                        <div>
                            <p className="text-sm font-medium">Active Status</p>
                            <p className="text-xs text-muted-foreground">Inactive subjects won't appear in dropdowns.</p>
                        </div>
                        <Button
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            onClick={() => setIsActive(!isActive)}
                            className={isActive ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                        >
                            {isActive ? <><CheckCircle className="h-3.5 w-3.5 mr-1" /> Active</> : <><XCircle className="h-3.5 w-3.5 mr-1" /> Inactive</>}
                        </Button>
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
    );
}

// ─── Subject Colors ───
const SUBJECT_COLORS = [
    { bg: "from-blue-500/10 to-blue-600/10", border: "border-blue-500/20", text: "text-blue-600", icon: "bg-blue-500/10" },
    { bg: "from-violet-500/10 to-purple-500/10", border: "border-violet-500/20", text: "text-violet-600", icon: "bg-violet-500/10" },
    { bg: "from-emerald-500/10 to-green-500/10", border: "border-emerald-500/20", text: "text-emerald-600", icon: "bg-emerald-500/10" },
    { bg: "from-amber-500/10 to-orange-500/10", border: "border-amber-500/20", text: "text-amber-600", icon: "bg-amber-500/10" },
    { bg: "from-rose-500/10 to-pink-500/10", border: "border-rose-500/20", text: "text-rose-600", icon: "bg-rose-500/10" },
    { bg: "from-cyan-500/10 to-sky-500/10", border: "border-cyan-500/20", text: "text-cyan-600", icon: "bg-cyan-500/10" },
    { bg: "from-indigo-500/10 to-blue-500/10", border: "border-indigo-500/20", text: "text-indigo-600", icon: "bg-indigo-500/10" },
    { bg: "from-teal-500/10 to-emerald-500/10", border: "border-teal-500/20", text: "text-teal-600", icon: "bg-teal-500/10" },
];

// ─── Main Page ───
export default function Subjects() {
    const { isRole } = useAuth();
    const { toast } = useToast();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [editSubject, setEditSubject] = useState<Subject | null>(null);

    const canManage = isRole('super_admin', 'institute_admin');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getSubjects();
            if (res.success && res.data) {
                setSubjects((res.data as { subjects: Subject[] }).subjects || []);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load subjects");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = subjects.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const activeCount = subjects.filter(s => s.is_active).length;
    const inactiveCount = subjects.length - activeCount;

    return (
        <DashboardLayout>
            <div className="space-y-6 page-enter">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Subjects</h1>
                        <p className="text-muted-foreground text-sm">
                            Manage subjects taught at your institute. Assign subjects to teachers from the Teachers page.
                        </p>
                    </div>
                    {canManage && <AddSubjectDialog onSuccess={fetchData} />}
                </div>

                {/* Summary */}
                {!loading && !error && subjects.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-primary">{subjects.length}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Total Subjects</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Active</p>
                        </div>
                        <div className="bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Inactive</p>
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search subjects by name or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 rounded-xl border-border/50 focus-visible:ring-primary/30"
                    />
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center h-40 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-muted-foreground text-sm">Loading subjects...</p>
                    </div>
                )}

                {/* Error */}
                {error && !loading && (
                    <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
                        <AlertCircle className="h-8 w-8 text-destructive/60" />
                        <p className="text-muted-foreground text-sm">{error}</p>
                    </div>
                )}

                {/* Subject Cards */}
                {!loading && !error && (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {filtered.map((subject, index) => {
                            const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
                            return (
                                <Card
                                    key={subject.id}
                                    className={cn(
                                        "overflow-hidden hover:shadow-card-hover transition-all duration-300 animate-scale-in group",
                                        !subject.is_active && "opacity-60"
                                    )}
                                    style={{ animationDelay: `${index * 30}ms` }}
                                >
                                    <div className={cn("h-1 bg-gradient-to-r", color.bg)} />
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", color.icon)}>
                                                    <BookOpen className={cn("h-5 w-5", color.text)} />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-sm">{subject.name}</h3>
                                                    {subject.code && (
                                                        <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                                            {subject.code}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {canManage && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreVertical className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setEditSubject(subject)}>Edit Subject</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                        {subject.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{subject.description}</p>
                                        )}
                                        <Badge variant="outline" className={cn("text-[10px]", subject.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted/50 text-muted-foreground")}>
                                            {subject.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {!loading && !error && filtered.length === 0 && (
                    <div className="text-center py-16">
                        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                        <p className="text-muted-foreground text-sm font-medium">
                            {searchQuery ? "No subjects matching your search." : "No subjects yet. Add your first subject!"}
                        </p>
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            {editSubject && (
                <EditSubjectDialog
                    subject={editSubject}
                    open={!!editSubject}
                    onOpenChange={(open) => { if (!open) setEditSubject(null); }}
                    onSuccess={fetchData}
                />
            )}
        </DashboardLayout>
    );
}
