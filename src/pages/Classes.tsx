import { useState, useEffect, useCallback } from "react";
import {
    Plus, Edit2, Trash2, Loader2, AlertCircle, BookOpen, Users, Building2
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getClasses, createClass, updateClass, deleteClass, getAcademicYears } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { InstituteSelector } from "@/components/InstituteSelector";
import type { Class as ClassType, AcademicYear, Institute } from "@/types";

export default function Classes() {
    const { isRole } = useAuth();
    const [classes, setClasses] = useState<ClassType[]>([]);
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog states
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Form states
    const [formData, setFormData] = useState({ name: "", section: "A", capacity: 60, academic_year_id: "" });
    const [selectedClass, setSelectedClass] = useState<ClassType | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { toast } = useToast();

    // Super admin institute selection
    const isSuperAdmin = isRole('super_admin');
    const [selectedInstituteId, setSelectedInstituteId] = useState<string | null>(() => {
        if (isSuperAdmin) {
            return localStorage.getItem('super_admin_selected_institute');
        }
        return null;
    });
    const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null);

    const canManage = isRole('super_admin', 'institute_admin');

    const handleInstituteSelect = (instituteId: string | null, institute: Institute | null) => {
        setSelectedInstituteId(instituteId);
        setSelectedInstitute(institute);
        if (instituteId) {
            localStorage.setItem('super_admin_selected_institute', instituteId);
        } else {
            localStorage.removeItem('super_admin_selected_institute');
        }
    };

    // Fetch data
    const fetchData = useCallback(async () => {
        // For super admins, don't fetch if no institute is selected
        if (isSuperAdmin && !selectedInstituteId) {
            setLoading(false);
            setClasses([]);
            setAcademicYears([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const params = isSuperAdmin && selectedInstituteId ? { institute_id: selectedInstituteId } : undefined;
            const [clsRes, ayRes] = await Promise.all([
                getClasses(params),
                getAcademicYears(params)
            ]);

            if (clsRes.success && clsRes.data) {
                setClasses((clsRes.data as { classes: ClassType[] }).classes || []);
            }
            if (ayRes.success && ayRes.data) {
                setAcademicYears((ayRes.data as { academicYears: AcademicYear[] }).academicYears || []);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load classes");
            toast({ title: "Error", description: "Failed to load classes", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast, isSuperAdmin, selectedInstituteId]);

    useEffect(() => { 
        fetchData(); 
    }, [fetchData]);

    // Create class
    const handleCreate = async () => {
        if (!formData.name.trim() || !formData.academic_year_id) {
            toast({ title: "Validation Error", description: "Please fill in all required fields", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await createClass({
                name: formData.name.trim(),
                section: formData.section,
                capacity: parseInt(formData.capacity.toString()),
                academic_year_id: formData.academic_year_id
            });

            if (res.success) {
                toast({ title: "Success", description: `Class "${formData.name}" created successfully` });
                setShowCreateDialog(false);
                setFormData({ name: "", section: "A", capacity: 60, academic_year_id: "" });
                fetchData();
            }
        } catch (err) {
            toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create class", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Update class
    const handleUpdate = async () => {
        if (!selectedClass || !formData.name.trim()) {
            toast({ title: "Validation Error", description: "Please fill in all required fields", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await updateClass(selectedClass.id, {
                name: formData.name.trim(),
                section: formData.section,
                capacity: parseInt(formData.capacity.toString())
            });

            if (res.success) {
                toast({ title: "Success", description: `Class updated successfully` });
                setShowEditDialog(false);
                setSelectedClass(null);
                setFormData({ name: "", section: "A", capacity: 60, academic_year_id: "" });
                fetchData();
            }
        } catch (err) {
            toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update class", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete class
    const handleDelete = async () => {
        if (!selectedClass) return;

        setIsSubmitting(true);
        try {
            const res = await deleteClass(selectedClass.id);
            if (res.success) {
                toast({ title: "Success", description: `Class deleted successfully` });
                setShowDeleteConfirm(false);
                setSelectedClass(null);
                fetchData();
            }
        } catch (err) {
            toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete class", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditDialog = (cls: ClassType) => {
        setSelectedClass(cls);
        setFormData({
            name: cls.name,
            section: cls.section || "A",
            capacity: cls.capacity || 60,
            academic_year_id: cls.academic_year_id || ""
        });
        setShowEditDialog(true);
    };

    const openDeleteConfirm = (cls: ClassType) => {
        setSelectedClass(cls);
        setShowDeleteConfirm(true);
    };

    const resetForm = () => {
        setFormData({ name: "", section: "A", capacity: 60, academic_year_id: "" });
        setSelectedClass(null);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-screen">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 page-enter">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Classes</h1>
                        <p className="text-muted-foreground text-sm">Manage all classes and sections.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isSuperAdmin && (
                            <InstituteSelector
                                selectedInstituteId={selectedInstituteId}
                                onSelectInstitute={handleInstituteSelect}
                            />
                        )}
                        {canManage && (!isSuperAdmin || selectedInstituteId) && (
                            <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Class
                            </Button>
                        )}
                    </div>
                </div>

                {/* Super Admin: No Institute Selected */}
                {isSuperAdmin && !selectedInstituteId && !loading && (
                    <div className="text-center py-20 border rounded-xl bg-gradient-to-br from-primary/5 to-blue-500/5 shadow-sm">
                        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                            <Building2 className="h-10 w-10 text-primary/60" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Select an Institute</h3>
                        <p className="text-muted-foreground text-sm font-medium mb-6 max-w-md mx-auto">
                            Please select an institute from the dropdown above to view and manage its classes.
                        </p>
                    </div>
                )}

                {error && (
                    <Card className="border-destructive/50 bg-destructive/10">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-destructive">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Classes Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {classes.length > 0 ? (
                        classes.map(cls => (
                            <Card key={cls.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                                <BookOpen className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{cls.name}</CardTitle>
                                                <p className="text-sm text-muted-foreground">Section {cls.section}</p>
                                            </div>
                                        </div>
                                        {canManage && (
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => openEditDialog(cls)}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => openDeleteConfirm(cls)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span>Capacity: <span className="font-medium">{cls.capacity} students</span></span>
                                    </div>
                                    {cls.class_teacher_id && (
                                        <Badge variant="outline" className="w-fit">Class Teacher Assigned</Badge>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card className="md:col-span-2 lg:col-span-3">
                            <CardContent className="pt-12 pb-12 text-center">
                                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                <p className="text-muted-foreground">No classes found. {canManage && "Create one to get started."}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Create Class Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            Create New Class
                        </DialogTitle>
                        <DialogDescription>Add a new class or section</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Class Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g. 9th, 10th, 11th"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1.5"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="section">Section</Label>
                                <Select value={formData.section} onValueChange={(val) => setFormData({ ...formData, section: val })}>
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['A', 'B', 'C', 'D', 'E'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="capacity">Capacity</Label>
                                <Input
                                    id="capacity"
                                    type="number"
                                    min="1"
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 60 })}
                                    className="mt-1.5"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="academic_year">Academic Year *</Label>
                            <Select value={formData.academic_year_id} onValueChange={(val) => setFormData({ ...formData, academic_year_id: val })}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue placeholder="Select academic year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {academicYears.map(ay => (
                                        <SelectItem key={ay.id} value={ay.id}>{ay.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={isSubmitting} className="bg-primary">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Class
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Class Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit2 className="h-5 w-5" />
                            Edit Class
                        </DialogTitle>
                        <DialogDescription>Update class details</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-name">Class Name</Label>
                            <Input
                                id="edit-name"
                                placeholder="e.g. 9th, 10th, 11th"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1.5"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-section">Section</Label>
                                <Select value={formData.section} onValueChange={(val) => setFormData({ ...formData, section: val })}>
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['A', 'B', 'C', 'D', 'E'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="edit-capacity">Capacity</Label>
                                <Input
                                    id="edit-capacity"
                                    type="number"
                                    min="1"
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 60 })}
                                    className="mt-1.5"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }}>Cancel</Button>
                        <Button onClick={handleUpdate} disabled={isSubmitting} className="bg-primary">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Class</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{selectedClass?.name} {selectedClass?.section}"? This action cannot be undone and may affect students and timetables.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleDelete}
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
}
