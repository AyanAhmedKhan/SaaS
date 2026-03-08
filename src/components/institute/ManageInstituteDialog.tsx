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
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { updateInstitute, getInstitute, getPlans } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Institute, SubscriptionPlan } from "@/types";

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

const MODULES = [
    { key: "attendance", label: "Attendance" },
    { key: "assignments", label: "Assignments" },
    { key: "fees", label: "Fees" },
    { key: "exams", label: "Exams" },
    { key: "syllabus", label: "Syllabus" },
    { key: "timetable", label: "Timetable" },
    { key: "notices", label: "Notices" },
    { key: "reports", label: "Reports" },
    { key: "ai_insight", label: "AI Insight" },
] as const;

const DEFAULT_MODULES_ENABLED: Record<string, boolean> = {
    attendance: true,
    assignments: true,
    fees: true,
    exams: true,
    syllabus: true,
    timetable: true,
    notices: true,
    reports: true,
    ai_insight: true,
};

const FALLBACK_PLANS: SubscriptionPlan[] = [
    { id: "plan_starter", slug: "starter", name: "Starter", tagline: "Everything a small school needs", monthly_price: 2999, annual_price: 29990, max_students: 200, max_teachers: 15, max_admins: 1, max_classes: 10, features: [], is_default: true, is_active: true, sort_order: 1 },
    { id: "plan_professional", slug: "professional", name: "Professional", tagline: "Complete school OS for academics", monthly_price: 7999, annual_price: 79990, max_students: 1000, max_teachers: 75, max_admins: 5, max_classes: 40, features: [], is_default: true, is_active: true, sort_order: 2 },
    { id: "plan_ai_pro", slug: "ai_pro", name: "AI Pro", tagline: "Your school's AI co-pilot", monthly_price: 12999, annual_price: 129990, max_students: 2000, max_teachers: 150, max_admins: 10, max_classes: 80, features: [], is_default: true, is_active: true, sort_order: 3 },
    { id: "plan_enterprise", slug: "enterprise", name: "Enterprise", tagline: "Scale without limits", monthly_price: 19999, annual_price: 199990, max_students: 99999, max_teachers: 99999, max_admins: 99999, max_classes: 99999, features: [], is_default: true, is_active: true, sort_order: 4 },
];

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
    const [modulesEnabled, setModulesEnabled] = useState<Record<string, boolean>>(DEFAULT_MODULES_ENABLED);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [planDialogOpen, setPlanDialogOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState("starter");
    const [plansLoadFailed, setPlansLoadFailed] = useState(false);
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
            setSelectedPlan(institute.subscription_plan || "starter");
            setModulesEnabled({
                ...DEFAULT_MODULES_ENABLED,
                ...(institute.modules_enabled || {}),
            });
            setErrors({});
            // Fetch detailed stats
            setLoadingStats(true);
            getInstitute(institute.id)
                .then((res) => {
                    if (res.success && res.data) {
                        const data = res.data as { institute: Institute & { stats?: InstituteStats } };
                        if (data.institute.stats) setStats(data.institute.stats);
                        setModulesEnabled({
                            ...DEFAULT_MODULES_ENABLED,
                            ...(data.institute.modules_enabled || {}),
                        });
                    }
                })
                .catch(() => { })
                .finally(() => setLoadingStats(false));

            setLoadingPlans(true);
            setPlansLoadFailed(false);
            getPlans()
                .then((res) => {
                    if (res.success && res.data?.plans) {
                        setPlans(res.data.plans);
                    } else {
                        setPlans(FALLBACK_PLANS);
                        setPlansLoadFailed(true);
                    }
                })
                .catch(() => {
                    setPlans(FALLBACK_PLANS);
                    setPlansLoadFailed(true);
                })
                .finally(() => setLoadingPlans(false));
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
            payload.subscription_plan = selectedPlan;
            payload.modules_enabled = modulesEnabled;

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

    const toggleModule = (moduleKey: string, enabled: boolean) => {
        setModulesEnabled((prev) => ({ ...prev, [moduleKey]: enabled }));
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
                                <div className="mt-1.5 flex items-center gap-2">
                                    <Badge variant="outline" className="text-sm capitalize px-3 py-1.5">
                                        <CreditCard className="h-3.5 w-3.5 mr-1" />
                                        {selectedPlan}
                                    </Badge>
                                    <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button type="button" variant="outline" size="sm">Change Plan</Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[460px]">
                                            <DialogHeader>
                                                <DialogTitle>Select Subscription Plan</DialogTitle>
                                                <DialogDescription>Choose a plan for this institute.</DialogDescription>
                                            </DialogHeader>
                                            {loadingPlans ? (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Loading plans...
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {plansLoadFailed && (
                                                        <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1">
                                                            Unable to load plans from server. Showing default plan options.
                                                        </p>
                                                    )}
                                                    {plans.length === 0 && (
                                                        <p className="text-sm text-muted-foreground py-3">No plans available.</p>
                                                    )}
                                                    {plans.map((plan) => (
                                                        <button
                                                            key={plan.id}
                                                            type="button"
                                                            onClick={() => setSelectedPlan(plan.slug)}
                                                            className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedPlan === plan.slug ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-medium capitalize">{plan.name}</span>
                                                                {selectedPlan === plan.slug && <Badge variant="secondary">Selected</Badge>}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-1">{plan.tagline || "No tagline"}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            <DialogFooter>
                                                <Button type="button" onClick={() => setPlanDialogOpen(false)}>Done</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                            <div className="sm:col-span-2 border-t pt-4 mt-1">
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                    Feature Access
                                </Label>
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {MODULES.map((module) => (
                                        <div key={module.key} className="flex items-center justify-between rounded-lg border px-3 py-2">
                                            <span className="text-sm font-medium">{module.label}</span>
                                            <Switch
                                                checked={modulesEnabled[module.key] !== false}
                                                onCheckedChange={(checked) => toggleModule(module.key, checked)}
                                            />
                                        </div>
                                    ))}
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
