import { useState, useEffect } from "react";
import {
    Building2,
    Mail,
    Phone,
    Globe,
    MapPin,
    Loader2,
    Settings,
    Users,
    CreditCard,
    GraduationCap,
    BookOpen,
    School,
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
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { updateInstitute, getInstitute } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Institute } from "@/types";

interface ManageInstituteDialogProps {
    institute: Institute;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface FormData {
    name: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    email: string;
    website: string;
    max_students: string;
    status: string;
}

interface FormErrors {
    [key: string]: string;
}

const STATUSES = [
    { value: "active", label: "Active" },
    { value: "suspended", label: "Suspended" },
    { value: "archived", label: "Archived" },
];

interface InstituteStats {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
}

export function ManageInstituteDialog({
    institute,
    open,
    onOpenChange,
    onSuccess,
}: ManageInstituteDialogProps) {
    const [form, setForm] = useState<FormData>({
        name: "", address: "", city: "", state: "",
        phone: "", email: "", website: "",
        max_students: "500", status: "active",
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stats, setStats] = useState<InstituteStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (open && institute) {
            setForm({
                name: institute.name || "",
                address: institute.address || "",
                city: institute.city || "",
                state: institute.state || "",
                phone: institute.phone || "",
                email: institute.email || "",
                website: institute.website || "",
                max_students: String(institute.max_students || 500),
                status: institute.status || "active",
            });
            setErrors({});
            // Fetch detailed stats
            setLoadingStats(true);
            getInstitute(institute.id)
                .then((res) => {
                    if (res.success && res.data) {
                        const data = res.data as { institute: Institute & { stats?: InstituteStats } };
                        if (data.institute.stats) setStats(data.institute.stats);
                    }
                })
                .catch(() => { })
                .finally(() => setLoadingStats(false));
        }
    }, [open, institute]);

    const updateField = (field: keyof FormData, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
        }
    };

    const validate = (): boolean => {
        const e: FormErrors = {};
        if (!form.name.trim()) e.name = "Name is required";
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const payload: Record<string, unknown> = { name: form.name.trim(), status: form.status };
            if (form.address) payload.address = form.address.trim();
            if (form.city) payload.city = form.city.trim();
            if (form.state) payload.state = form.state.trim();
            if (form.phone) payload.phone = form.phone.trim();
            if (form.email) payload.email = form.email.trim();
            if (form.website) payload.website = form.website.trim();
            payload.max_students = parseInt(form.max_students) || 500;

            const res = await updateInstitute(institute.id, payload as any);
            if (res.success) {
                toast({ title: "Institute Updated", description: `${form.name} has been updated.` });
                onOpenChange(false);
                onSuccess();
            }
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "Failed to update institute.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderError = (field: string) => {
        if (!errors[field]) return null;
        return <p className="text-xs text-destructive mt-1">{errors[field]}</p>;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5 text-white">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Settings className="h-5 w-5" />
                            </div>
                            Manage Institute
                        </DialogTitle>
                        <DialogDescription className="text-white/80 text-sm">
                            {institute.name} • <span className="font-mono">{institute.code}</span>
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <ScrollArea className="max-h-[460px]">
                    <div className="px-6 py-5 space-y-5">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                                <GraduationCap className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                                <p className="text-lg font-bold text-blue-600">
                                    {loadingStats ? "…" : stats?.totalStudents ?? "—"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">Students</p>
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                                <Users className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                                <p className="text-lg font-bold text-emerald-600">
                                    {loadingStats ? "…" : stats?.totalTeachers ?? "—"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">Teachers</p>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                                <School className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                                <p className="text-lg font-bold text-amber-600">
                                    {loadingStats ? "…" : stats?.totalClasses ?? "—"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">Classes</p>
                            </div>
                        </div>

                        {/* Editable Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    Institute Name <span className="text-destructive">*</span>
                                </Label>
                                <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} className={`mt-1.5 rounded-lg ${errors.name ? "border-destructive" : ""}`} />
                                {renderError("name")}
                            </div>
                            <div>
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                    Email
                                </Label>
                                <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className={`mt-1.5 rounded-lg ${errors.email ? "border-destructive" : ""}`} />
                                {renderError("email")}
                            </div>
                            <div>
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    Phone
                                </Label>
                                <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="mt-1.5 rounded-lg" />
                            </div>
                            <div>
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                    Website
                                </Label>
                                <Input value={form.website} onChange={(e) => updateField("website", e.target.value)} className="mt-1.5 rounded-lg" />
                            </div>
                            <div>
                                <Label className="text-sm font-medium">Status</Label>
                                <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                                    <SelectTrigger className="mt-1.5 rounded-lg"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {STATUSES.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="sm:col-span-2">
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                    Address
                                </Label>
                                <Input value={form.address} onChange={(e) => updateField("address", e.target.value)} className="mt-1.5 rounded-lg" />
                            </div>
                            <div>
                                <Label className="text-sm font-medium">City</Label>
                                <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} className="mt-1.5 rounded-lg" />
                            </div>
                            <div>
                                <Label className="text-sm font-medium">State</Label>
                                <Input value={form.state} onChange={(e) => updateField("state", e.target.value)} className="mt-1.5 rounded-lg" />
                            </div>
                            <div>
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                    Max Students
                                </Label>
                                <Input type="number" min="1" value={form.max_students} onChange={(e) => updateField("max_students", e.target.value)} className="mt-1.5 rounded-lg" />
                            </div>
                            <div>
                                <Label className="text-sm font-medium">Plan</Label>
                                <div className="mt-1.5">
                                    <Badge variant="outline" className="text-sm capitalize px-3 py-1.5">
                                        <CreditCard className="h-3.5 w-3.5 mr-1" />
                                        {institute.subscription_plan || "basic"}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                    <div className="flex items-center justify-end w-full gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-600/90 hover:to-purple-600/90 shadow-sm">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
