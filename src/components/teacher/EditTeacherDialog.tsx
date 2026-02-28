import { useState, useEffect } from "react";
import {
    User,
    Mail,
    Phone,
    BookOpen,
    Award,
    Briefcase,
    Loader2,
    Pencil,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { updateTeacher } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Teacher } from "@/types";

interface EditTeacherDialogProps {
    teacher: Teacher;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface FormData {
    name: string;
    email: string;
    phone: string;
    subject_specialization: string;
    qualification: string;
    experience_years: string;
    status: string;
}

interface FormErrors {
    [key: string]: string;
}

const STATUSES = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "on_leave", label: "On Leave" },
];

export function EditTeacherDialog({
    teacher,
    open,
    onOpenChange,
    onSuccess,
}: EditTeacherDialogProps) {
    const [form, setForm] = useState<FormData>({
        name: "",
        email: "",
        phone: "",
        subject_specialization: "",
        qualification: "",
        experience_years: "",
        status: "active",
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open && teacher) {
            setForm({
                name: teacher.name || "",
                email: teacher.email || "",
                phone: teacher.phone || "",
                subject_specialization: teacher.subject_specialization || "",
                qualification: teacher.qualification || "",
                experience_years: teacher.experience_years !== undefined ? String(teacher.experience_years) : "",
                status: teacher.status || "active",
            });
            setErrors({});
        }
    }, [open, teacher]);

    const updateField = (field: keyof FormData, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        if (!form.name.trim()) newErrors.name = "Name is required";
        if (!form.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = "Invalid email";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setIsSubmitting(true);

        try {
            const payload: Record<string, unknown> = {
                name: form.name.trim(),
                email: form.email.trim(),
                status: form.status,
            };
            if (form.phone) payload.phone = form.phone.trim();
            if (form.subject_specialization)
                payload.subject_specialization = form.subject_specialization.trim();
            if (form.qualification) payload.qualification = form.qualification.trim();
            if (form.experience_years)
                payload.experience_years = parseInt(form.experience_years) || 0;

            const res = await updateTeacher(teacher.id, payload as any);
            if (res.success) {
                toast({
                    title: "Teacher Updated",
                    description: `${form.name}'s details have been saved.`,
                });
                onOpenChange(false);
                onSuccess();
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err?.message || "Failed to update teacher.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderFieldError = (field: string) => {
        if (!errors[field]) return null;
        return (
            <p className="text-xs text-destructive mt-1 animate-in fade-in slide-in-from-top-1">
                {errors[field]}
            </p>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Pencil className="h-5 w-5" />
                            </div>
                            Edit Teacher Details
                        </DialogTitle>
                        <DialogDescription className="text-white/80 text-sm">
                            Update {teacher.name}'s profile information.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <ScrollArea className="max-h-[420px]">
                    <div className="px-6 py-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <Label htmlFor="edit-t-name" className="text-sm font-medium flex items-center gap-1">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    Full Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="edit-t-name"
                                    value={form.name}
                                    onChange={(e) => updateField("name", e.target.value)}
                                    className={`mt-1.5 rounded-lg ${errors.name ? "border-destructive" : ""}`}
                                />
                                {renderFieldError("name")}
                            </div>
                            <div>
                                <Label htmlFor="edit-t-email" className="text-sm font-medium flex items-center gap-1">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                    Email <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="edit-t-email"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => updateField("email", e.target.value)}
                                    className={`mt-1.5 rounded-lg ${errors.email ? "border-destructive" : ""}`}
                                />
                                {renderFieldError("email")}
                            </div>
                            <div>
                                <Label htmlFor="edit-t-phone" className="text-sm font-medium flex items-center gap-1">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    Phone
                                </Label>
                                <Input
                                    id="edit-t-phone"
                                    value={form.phone}
                                    onChange={(e) => updateField("phone", e.target.value)}
                                    className="mt-1.5 rounded-lg"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-t-subject" className="text-sm font-medium flex items-center gap-1">
                                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                    Subject Specialization
                                </Label>
                                <Input
                                    id="edit-t-subject"
                                    value={form.subject_specialization}
                                    onChange={(e) => updateField("subject_specialization", e.target.value)}
                                    className="mt-1.5 rounded-lg"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-t-qual" className="text-sm font-medium flex items-center gap-1">
                                    <Award className="h-3.5 w-3.5 text-muted-foreground" />
                                    Qualification
                                </Label>
                                <Input
                                    id="edit-t-qual"
                                    value={form.qualification}
                                    onChange={(e) => updateField("qualification", e.target.value)}
                                    className="mt-1.5 rounded-lg"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-t-exp" className="text-sm font-medium flex items-center gap-1">
                                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                                    Experience (years)
                                </Label>
                                <Input
                                    id="edit-t-exp"
                                    type="number"
                                    min="0"
                                    value={form.experience_years}
                                    onChange={(e) => updateField("experience_years", e.target.value)}
                                    className="mt-1.5 rounded-lg"
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-medium">Status</Label>
                                <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                                    <SelectTrigger className="mt-1.5 rounded-lg">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUSES.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                    <div className="flex items-center justify-end w-full gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-500/90 hover:to-orange-500/90 shadow-sm"
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
