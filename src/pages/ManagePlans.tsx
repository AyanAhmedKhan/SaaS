import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { createPlan, deletePlan, getPlans, updatePlan } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { SubscriptionPlan } from "@/types";

const FEATURE_OPTIONS = [
    "Admin Dashboard",
    "Student Management",
    "Teacher Management",
    "Attendance Tracking",
    "Timetable",
    "Fee Management",
    "Notices & Announcements",
    "Exams & Grading",
    "Syllabus Tracking",
    "Reports & Analytics",
    "Assignments",
    "AI Insights",
    "Multi-Admin Support",
    "REST API Access",
    "Multi-Branch Management",
];

type PlanFormState = {
    name: string;
    slug: string;
    tagline: string;
    monthly_price: string;
    annual_price: string;
    max_students: string;
    max_teachers: string;
    max_admins: string;
    max_classes: string;
    features: { text: string; included: boolean }[];
};

const emptyForm = (): PlanFormState => ({
    name: "",
    slug: "",
    tagline: "",
    monthly_price: "0",
    annual_price: "0",
    max_students: "100",
    max_teachers: "10",
    max_admins: "1",
    max_classes: "10",
    features: FEATURE_OPTIONS.map((text) => ({ text, included: false })),
});

function toForm(plan?: SubscriptionPlan): PlanFormState {
    if (!plan) return emptyForm();
    const selected = new Map((plan.features || []).map((f) => [f.text, f.included]));
    return {
        name: plan.name,
        slug: plan.slug,
        tagline: plan.tagline || "",
        monthly_price: String(plan.monthly_price ?? 0),
        annual_price: String(plan.annual_price ?? 0),
        max_students: String(plan.max_students ?? 100),
        max_teachers: String(plan.max_teachers ?? 10),
        max_admins: String(plan.max_admins ?? 1),
        max_classes: String(plan.max_classes ?? 10),
        features: FEATURE_OPTIONS.map((text) => ({ text, included: selected.get(text) === true })),
    };
}

export default function ManagePlans() {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [openCreate, setOpenCreate] = useState(false);
    const [editPlan, setEditPlan] = useState<SubscriptionPlan | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<PlanFormState>(emptyForm());
    const { toast } = useToast();

    const sortedPlans = useMemo(
        () => [...plans].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        [plans]
    );

    const loadPlans = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getPlans(true);
            if (res.success && res.data?.plans) {
                setPlans(res.data.plans);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load plans";
            toast({ title: "Error", description: message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadPlans();
    }, [loadPlans]);

    const updateField = (field: keyof PlanFormState, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const toggleFeature = (text: string, checked: boolean) => {
        setForm((prev) => ({
            ...prev,
            features: prev.features.map((f) => (f.text === text ? { ...f, included: checked } : f)),
        }));
    };

    const resetCreate = () => {
        setForm(emptyForm());
        setOpenCreate(false);
    };

    const openEdit = (plan: SubscriptionPlan) => {
        setEditPlan(plan);
        setForm(toForm(plan));
    };

    const payloadFromForm = () => ({
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        tagline: form.tagline.trim(),
        monthly_price: Number(form.monthly_price || 0),
        annual_price: Number(form.annual_price || 0),
        max_students: Number(form.max_students || 100),
        max_teachers: Number(form.max_teachers || 10),
        max_admins: Number(form.max_admins || 1),
        max_classes: Number(form.max_classes || 10),
        features: form.features,
    });

    const handleCreate = async () => {
        if (!form.name.trim() || !form.slug.trim()) {
            toast({ title: "Validation error", description: "Name and slug are required", variant: "destructive" });
            return;
        }

        try {
            setSaving(true);
            await createPlan(payloadFromForm());
            toast({ title: "Plan created", description: "Custom plan created successfully" });
            resetCreate();
            await loadPlans();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to create plan";
            toast({ title: "Create failed", description: message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async () => {
        if (!editPlan) return;
        if (!form.name.trim()) {
            toast({ title: "Validation error", description: "Name is required", variant: "destructive" });
            return;
        }

        try {
            setSaving(true);
            await updatePlan(editPlan.id, payloadFromForm());
            toast({ title: "Plan updated", description: "Plan changes saved" });
            setEditPlan(null);
            await loadPlans();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update plan";
            toast({ title: "Update failed", description: message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleDeactivate = async (plan: SubscriptionPlan) => {
        if (plan.is_default) {
            toast({ title: "Blocked", description: "Default plans cannot be deactivated", variant: "destructive" });
            return;
        }

        try {
            await deletePlan(plan.id);
            toast({ title: "Plan deactivated", description: `${plan.name} has been deactivated` });
            await loadPlans();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to deactivate plan";
            toast({ title: "Deactivate failed", description: message, variant: "destructive" });
        }
    };

    const renderPlanForm = (disableSlug = false) => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} />
                </div>
                <div>
                    <Label>Slug</Label>
                    <Input value={form.slug} disabled={disableSlug} onChange={(e) => updateField("slug", e.target.value)} />
                </div>
                <div>
                    <Label>Tagline</Label>
                    <Input value={form.tagline} onChange={(e) => updateField("tagline", e.target.value)} />
                </div>
                <div>
                    <Label>Monthly Price</Label>
                    <Input type="number" value={form.monthly_price} onChange={(e) => updateField("monthly_price", e.target.value)} />
                </div>
                <div>
                    <Label>Annual Price</Label>
                    <Input type="number" value={form.annual_price} onChange={(e) => updateField("annual_price", e.target.value)} />
                </div>
                <div>
                    <Label>Max Students</Label>
                    <Input type="number" value={form.max_students} onChange={(e) => updateField("max_students", e.target.value)} />
                </div>
                <div>
                    <Label>Max Teachers</Label>
                    <Input type="number" value={form.max_teachers} onChange={(e) => updateField("max_teachers", e.target.value)} />
                </div>
                <div>
                    <Label>Max Admins</Label>
                    <Input type="number" value={form.max_admins} onChange={(e) => updateField("max_admins", e.target.value)} />
                </div>
                <div>
                    <Label>Max Classes</Label>
                    <Input type="number" value={form.max_classes} onChange={(e) => updateField("max_classes", e.target.value)} />
                </div>
                <div className="col-span-2">
                    <Label>Features</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-md p-3 mt-1 max-h-48 overflow-y-auto">
                        {form.features.map((feature) => (
                            <label key={feature.text} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={feature.included}
                                    onCheckedChange={(checked) => toggleFeature(feature.text, checked === true)}
                                />
                                <span>{feature.text}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <DashboardLayout>
            <div className="space-y-6 page-enter">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
                            <Layers className="h-7 w-7 text-primary" />
                            Manage Plans
                        </h1>
                        <p className="text-muted-foreground text-sm">Create and manage dynamic subscription plans.</p>
                    </div>

                    <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                        <DialogTrigger asChild>
                            <Button className="rounded-xl">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Plan
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Create Custom Plan</DialogTitle>
                            </DialogHeader>
                            {renderPlanForm()}
                            <DialogFooter>
                                <Button variant="outline" onClick={resetCreate} disabled={saving}>Cancel</Button>
                                <Button onClick={handleCreate} disabled={saving}>
                                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Save Plan
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <CardHeader><div className="h-6 w-1/2 bg-muted rounded" /></CardHeader>
                                <CardContent><div className="h-24 bg-muted rounded" /></CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {sortedPlans.map((plan) => (
                            <Card key={plan.id} className={!plan.is_active ? "opacity-70" : ""}>
                                <CardHeader className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={plan.is_default ? "default" : "secondary"}>
                                                {plan.is_default ? "Default" : "Custom"}
                                            </Badge>
                                            <Badge variant={plan.is_active ? "outline" : "secondary"}>
                                                {plan.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">/{plan.slug}</p>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-sm text-muted-foreground">{plan.tagline || "No tagline"}</p>
                                    <div className="text-sm space-y-1">
                                        <p>Monthly: ₹{plan.monthly_price.toLocaleString("en-IN")}</p>
                                        <p>Annual: ₹{plan.annual_price.toLocaleString("en-IN")}</p>
                                        <p>Limits: {plan.max_students} students, {plan.max_teachers} teachers, {plan.max_admins} admins</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button variant="outline" size="sm" onClick={() => openEdit(plan)}>
                                            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeactivate(plan)}
                                            disabled={plan.is_default || !plan.is_active}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Deactivate
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <Dialog open={!!editPlan} onOpenChange={(open) => !open && setEditPlan(null)}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Edit Plan</DialogTitle>
                        </DialogHeader>
                        {renderPlanForm(editPlan?.is_default === true)}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditPlan(null)} disabled={saving}>Cancel</Button>
                            <Button onClick={handleUpdate} disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
