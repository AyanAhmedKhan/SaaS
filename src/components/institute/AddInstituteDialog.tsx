import { useState } from "react";
import {
    Building2,
    Mail,
    Phone,
    Globe,
    MapPin,
    Hash,
    Loader2,
    Plus,
    Users,
    CreditCard,
} from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { createInstitute } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AddInstituteDialogProps {
    onSuccess: () => void;
}

interface FormData {
    name: string;
    code: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    email: string;
    website: string;
    max_students: string;
    subscription_plan: string;
}

interface FormErrors {
    [key: string]: string;
}

const INITIAL_FORM: FormData = {
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    email: "",
    website: "",
    max_students: "500",
    subscription_plan: "basic",
};

const PLANS = [
    { value: "basic", label: "Basic" },
    { value: "standard", label: "Standard" },
    { value: "premium", label: "Premium" },
    { value: "enterprise", label: "Enterprise" },
];

export function AddInstituteDialog({ onSuccess }: AddInstituteDialogProps) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<FormData>({ ...INITIAL_FORM });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const updateField = (field: keyof FormData, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
        }
    };

    const validate = (): boolean => {
        const e: FormErrors = {};
        if (!form.name.trim()) e.name = "Institute name is required";
        if (!form.code.trim()) {
            e.code = "Institute code is required";
        } else if (!/^[A-Za-z0-9_-]+$/.test(form.code)) {
            e.code = "Code must be alphanumeric";
        }
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            e.email = "Invalid email address";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const payload: Record<string, unknown> = {
                name: form.name.trim(),
                code: form.code.trim().toUpperCase(),
                subscription_plan: form.subscription_plan,
                max_students: parseInt(form.max_students) || 500,
            };
            if (form.address) payload.address = form.address.trim();
            if (form.city) payload.city = form.city.trim();
            if (form.state) payload.state = form.state.trim();
            if (form.phone) payload.phone = form.phone.trim();
            if (form.email) payload.email = form.email.trim();
            if (form.website) payload.website = form.website.trim();

            const res = await createInstitute(payload as any);
            if (res.success) {
                toast({ title: "Institute Created", description: `${form.name} has been registered successfully.` });
                handleReset();
                setOpen(false);
                onSuccess();
            }
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "Failed to create institute.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setForm({ ...INITIAL_FORM });
        setErrors({});
    };

    const renderError = (field: string) => {
        if (!errors[field]) return null;
        return <p className="text-xs text-destructive mt-1 animate-in fade-in slide-in-from-top-1">{errors[field]}</p>;
    };

    return (
        <Dialog open={open} onOpenChange={(val) => { if (!val) handleReset(); setOpen(val); }}>
            <DialogTrigger asChild>
                <Button className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md hover:shadow-lg transition-all duration-200">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Institute
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-blue-600 px-6 py-5 text-white">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Building2 className="h-5 w-5" />
                            </div>
                            Register New Institute
                        </DialogTitle>
                        <DialogDescription className="text-white/80 text-sm">
                            Fill in the details to register a new educational institute.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <ScrollArea className="max-h-[450px]">
                    <div className="px-6 py-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    Institute Name <span className="text-destructive">*</span>
                                </Label>
                                <Input placeholder="e.g. Delhi Public School" value={form.name} onChange={(e) => updateField("name", e.target.value)} className={`mt-1.5 rounded-lg ${errors.name ? "border-destructive" : ""}`} />
                                {renderError("name")}
                            </div>
                            <div>
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                    Institute Code <span className="text-destructive">*</span>
                                </Label>
                                <Input placeholder="e.g. DPS001" value={form.code} onChange={(e) => updateField("code", e.target.value.toUpperCase())} className={`mt-1.5 rounded-lg font-mono ${errors.code ? "border-destructive" : ""}`} />
                                {renderError("code")}
                            </div>
                            <div>
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                    Email
                                </Label>
                                <Input type="email" placeholder="admin@institute.com" value={form.email} onChange={(e) => updateField("email", e.target.value)} className={`mt-1.5 rounded-lg ${errors.email ? "border-destructive" : ""}`} />
                                {renderError("email")}
                            </div>
                            <div>
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    Phone
                                </Label>
                                <Input placeholder="+91 98765 43210" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="mt-1.5 rounded-lg" />
                            </div>
                            <div>
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                    Website
                                </Label>
                                <Input placeholder="https://www.institute.edu" value={form.website} onChange={(e) => updateField("website", e.target.value)} className="mt-1.5 rounded-lg" />
                            </div>
                            <div className="sm:col-span-2">
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                    Address
                                </Label>
                                <Input placeholder="Full address" value={form.address} onChange={(e) => updateField("address", e.target.value)} className="mt-1.5 rounded-lg" />
                            </div>
                            <div>
                                <Label className="text-sm font-medium">City</Label>
                                <Input placeholder="e.g. New Delhi" value={form.city} onChange={(e) => updateField("city", e.target.value)} className="mt-1.5 rounded-lg" />
                            </div>
                            <div>
                                <Label className="text-sm font-medium">State</Label>
                                <Input placeholder="e.g. Delhi" value={form.state} onChange={(e) => updateField("state", e.target.value)} className="mt-1.5 rounded-lg" />
                            </div>
                        </div>

                        {/* Plan & Capacity */}
                        <div className="border-t border-border/60 pt-4">
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-primary" />
                                Plan & Capacity
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-medium">Subscription Plan</Label>
                                    <Select value={form.subscription_plan} onValueChange={(v) => updateField("subscription_plan", v)}>
                                        <SelectTrigger className="mt-1.5 rounded-lg"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {PLANS.map((p) => (
                                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                        Max Students
                                    </Label>
                                    <Input type="number" min="1" placeholder="500" value={form.max_students} onChange={(e) => updateField("max_students", e.target.value)} className="mt-1.5 rounded-lg" />
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                    <div className="flex items-center justify-between w-full">
                        <Button variant="ghost" size="sm" onClick={handleReset} disabled={isSubmitting} className="text-muted-foreground">Reset</Button>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-sm">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmitting ? "Creating..." : "Create Institute"}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
