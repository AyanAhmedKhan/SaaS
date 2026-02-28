import { useState, useEffect, useCallback } from "react";
import { Plus, Calendar, AlertCircle, Loader2, CheckCircle2, Archive, CalendarDays, KeyRound, Check } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAcademicYears, createAcademicYear, updateAcademicYear, archiveAcademicYear } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { AcademicYear } from "@/types";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    is_current: z.boolean().default(false),
});

export default function AcademicYears() {
    const { isRole } = useAuth();
    const { toast } = useToast();
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const canManage = isRole('super_admin') || isRole('institute_admin');

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            start_date: "",
            end_date: "",
            is_current: false,
        },
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getAcademicYears();
            if (res.success && res.data) {
                setAcademicYears(res.data.academicYears || []);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load academic years";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!canManage) return;
        try {
            setSubmitting(true);
            const formattedData = {
                ...values,
            };
            const res = await createAcademicYear(formattedData);

            if (res.success) {
                toast({ title: "Success", description: "Academic year created successfully." });
                setCreateOpen(false);
                form.reset();
                fetchData();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to create academic year";
            toast({ title: "Error", description: message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSetCurrent = async (id: string) => {
        if (!canManage) return;
        try {
            const res = await updateAcademicYear(id, { is_current: true });
            if (res.success) {
                toast({ title: "Success", description: "Updated current academic year." });
                fetchData();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to set current year";
            toast({ title: "Error", description: message, variant: "destructive" });
        }
    };

    const handleArchive = async (id: string) => {
        if (!canManage) return;
        try {
            const res = await archiveAcademicYear(id);
            if (res.success) {
                toast({ title: "Success", description: "Academic year archived successfully." });
                fetchData();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to archive year";
            toast({ title: "Error", description: message, variant: "destructive" });
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 page-enter">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Academic Sessions</h1>
                        <p className="text-muted-foreground text-sm">Manage academic years and session transitions.</p>
                    </div>
                    {canManage && (
                        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md">
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Academic Year
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Create Academic Year</DialogTitle>
                                    <DialogDescription>
                                        Define a new academic session. This will allow you to onboard students to this specific year.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Session Name (e.g. 2024-2025)</Label>
                                        <Input id="name" {...form.register("name")} placeholder="2024-2025" />
                                        {form.formState.errors.name && (
                                            <p className="text-sm border-destructive text-destructive">{form.formState.errors.name.message}</p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="start_date">Start Date</Label>
                                            <Input id="start_date" type="date" {...form.register("start_date")} />
                                            {form.formState.errors.start_date && (
                                                <p className="text-sm text-destructive">{form.formState.errors.start_date.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="end_date">End Date</Label>
                                            <Input id="end_date" type="date" {...form.register("end_date")} />
                                            {form.formState.errors.end_date && (
                                                <p className="text-sm text-destructive">{form.formState.errors.end_date.message}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 border rounded-lg p-3">
                                        <input
                                            type="checkbox"
                                            id="is_current"
                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                            {...form.register("is_current")}
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <label htmlFor="is_current" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                Set as Current Session
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                This immediately makes this year the default global session across the portal.
                                            </p>
                                        </div>
                                    </div>
                                    <DialogFooter className="pt-4">
                                        <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                                        <Button type="submit" disabled={submitting}>
                                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Create Session
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center h-40 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-muted-foreground text-sm">Loading academic years...</p>
                    </div>
                )}

                {/* Error */}
                {error && !loading && (
                    <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
                        <AlertCircle className="h-8 w-8 text-destructive/60" />
                        <p className="text-muted-foreground text-sm">{error}</p>
                        <Button variant="outline" size="sm" onClick={fetchData}>Try Again</Button>
                    </div>
                )}

                {/* Academic Years List */}
                {!loading && !error && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {academicYears.map((ay, idx) => {
                            const startDate = new Date(ay.start_date);
                            const endDate = new Date(ay.end_date);
                            return (
                                <Card
                                    key={ay.id}
                                    className={`relative overflow-hidden hover:shadow-card-hover transition-all duration-300 animate-scale-in group ${ay.is_current ? 'border-primary shadow-sm' : ''} ${ay.is_archived ? 'opacity-70' : ''}`}
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    {ay.is_current && (
                                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-blue-500" />
                                    )}
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${ay.is_current ? 'bg-primary/10' : 'bg-muted'}`}>
                                                    <CalendarDays className={`h-5 w-5 ${ay.is_current ? 'text-primary' : 'text-muted-foreground'}`} />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg">{ay.name}</CardTitle>
                                                    <CardDescription className="text-xs pt-1">
                                                        {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 items-end">
                                                {ay.is_current && <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Current</Badge>}
                                                {ay.is_archived && <Badge variant="secondary"><Archive className="w-3 h-3 mr-1" /> Archived</Badge>}
                                                {!ay.is_current && !ay.is_archived && <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-2">
                                        <div className="flex items-center justify-end gap-2 border-t pt-4">
                                            {!ay.is_current && !ay.is_archived && canManage && (
                                                <>
                                                    <Button variant="outline" size="sm" onClick={() => handleSetCurrent(ay.id)}>
                                                        <Check className="h-4 w-4 mr-1.5 text-emerald-500" />
                                                        Set Current
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleArchive(ay.id)}>
                                                        <Archive className="h-4 w-4 mr-1.5" />
                                                        Archive
                                                    </Button>
                                                </>
                                            )}
                                            {ay.is_current && canManage && (
                                                <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary hover:bg-primary/10" asChild>
                                                    {/* Using asChild and onClick or routing to students with a filter? Here we could open year-end transition modal in future */}
                                                    <div className="text-xs font-medium cursor-help" title="To change current year, set another year as current.">Global Active Session</div>
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {!loading && !error && academicYears.length === 0 && (
                    <div className="text-center py-16 border rounded-xl bg-card/50 shadow-sm">
                        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                            <Calendar className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">No Academic Sessions</h3>
                        <p className="text-muted-foreground text-sm font-medium mb-4">You haven't added any academic years yet.</p>
                        {canManage && (
                            <Button onClick={() => setCreateOpen(true)}>Create First Session</Button>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
