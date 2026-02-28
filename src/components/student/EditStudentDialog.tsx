import { useState, useEffect } from "react";
import {
    User,
    Mail,
    Hash,
    Phone,
    MapPin,
    Calendar,
    Heart,
    Droplets,
    Users,
    Loader2,
    Eye,
    EyeOff,
    GraduationCap,
    Pencil,
    Save,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { updateStudent, getClasses } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Student, Class as ClassType } from "@/types";

interface EditStudentDialogProps {
    student: Student;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface FormData {
    name: string;
    email: string;
    roll_number: string;
    class_id: string;
    gender: string;
    date_of_birth: string;
    phone: string;
    address: string;
    blood_group: string;
    admission_date: string;
    parent_name: string;
    parent_email: string;
    parent_phone: string;
    status: string;
}

interface FormErrors {
    [key: string]: string;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const GENDERS = ["Male", "Female", "Other"];
const STATUSES = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "graduated", label: "Graduated" },
    { value: "transferred", label: "Transferred" },
];

export function EditStudentDialog({
    student,
    open,
    onOpenChange,
    onSuccess,
}: EditStudentDialogProps) {
    const [activeTab, setActiveTab] = useState("basic");
    const [form, setForm] = useState<FormData>({
        name: "",
        email: "",
        roll_number: "",
        class_id: "",
        gender: "",
        date_of_birth: "",
        phone: "",
        address: "",
        blood_group: "",
        admission_date: "",
        parent_name: "",
        parent_email: "",
        parent_phone: "",
        status: "",
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [classes, setClasses] = useState<ClassType[]>([]);
    const { toast } = useToast();

    // Populate form when dialog opens
    useEffect(() => {
        if (open && student) {
            setForm({
                name: student.name || "",
                email: student.email || "",
                roll_number: student.roll_number || "",
                class_id: student.class_id || "",
                gender: student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : "",
                date_of_birth: student.date_of_birth ? student.date_of_birth.substring(0, 10) : "",
                phone: student.phone || "",
                address: student.address || "",
                blood_group: student.blood_group || "",
                admission_date: student.admission_date ? student.admission_date.substring(0, 10) : "",
                parent_name: student.parent_name || "",
                parent_email: student.parent_email || "",
                parent_phone: student.parent_phone || "",
                status: student.status || "active",
            });
            setErrors({});
            setActiveTab("basic");

            getClasses().then((res) => {
                if (res.success && res.data) {
                    setClasses((res.data as { classes: ClassType[] }).classes || []);
                }
            });
        }
    }, [open, student]);

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
        if (!form.name.trim()) newErrors.name = "Student name is required";
        if (!form.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = "Please enter a valid email address";
        }
        if (!form.roll_number.trim()) newErrors.roll_number = "Roll number is required";
        if (form.parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parent_email)) {
            newErrors.parent_email = "Please enter a valid parent email";
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            const basicFields = ["name", "email", "roll_number", "class_id", "gender", "date_of_birth", "status"];
            const contactFields = ["phone", "address", "blood_group", "admission_date"];
            const errorFields = Object.keys(newErrors);
            if (errorFields.some((f) => basicFields.includes(f))) setActiveTab("basic");
            else if (errorFields.some((f) => contactFields.includes(f))) setActiveTab("contact");
            else setActiveTab("parent");
        }

        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setIsSubmitting(true);

        try {
            const payload: Record<string, unknown> = {
                name: form.name.trim(),
                email: form.email.trim(),
                roll_number: form.roll_number.trim(),
                status: form.status,
            };

            if (form.class_id) payload.class_id = form.class_id;
            if (form.gender) payload.gender = form.gender.toLowerCase();
            if (form.date_of_birth) payload.date_of_birth = form.date_of_birth;
            if (form.phone) payload.phone = form.phone.trim();
            if (form.address) payload.address = form.address.trim();
            if (form.blood_group) payload.blood_group = form.blood_group;
            if (form.admission_date) payload.admission_date = form.admission_date;
            if (form.parent_name) payload.parent_name = form.parent_name.trim();
            if (form.parent_email) payload.parent_email = form.parent_email.trim();
            if (form.parent_phone) payload.parent_phone = form.parent_phone.trim();

            const res = await updateStudent(student.id, payload as any);
            if (res.success) {
                toast({
                    title: "Student Updated",
                    description: `${form.name}'s details have been saved.`,
                });
                onOpenChange(false);
                onSuccess();
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err?.message || "Failed to update student.",
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

    const hasBasicErrors = ["name", "email", "roll_number"].some((f) => errors[f]);
    const hasContactErrors = ["phone", "address", "blood_group", "admission_date"].some((f) => errors[f]);
    const hasParentErrors = ["parent_name", "parent_email", "parent_phone"].some((f) => errors[f]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden">
                {/* Gradient Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Pencil className="h-5 w-5" />
                            </div>
                            Edit Student Details
                        </DialogTitle>
                        <DialogDescription className="text-white/80 text-sm">
                            Update {student.name}'s profile information below.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="px-6 pt-4">
                        <TabsList className="grid w-full grid-cols-3 h-11 bg-muted/60 rounded-xl p-1">
                            <TabsTrigger
                                value="basic"
                                className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                            >
                                <GraduationCap className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                                Basic Info
                                {hasBasicErrors && <span className="ml-1.5 h-2 w-2 rounded-full bg-destructive inline-block" />}
                            </TabsTrigger>
                            <TabsTrigger
                                value="contact"
                                className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                            >
                                <Phone className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                                Contact
                                {hasContactErrors && <span className="ml-1.5 h-2 w-2 rounded-full bg-destructive inline-block" />}
                            </TabsTrigger>
                            <TabsTrigger
                                value="parent"
                                className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                            >
                                <Users className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                                Parent Info
                                {hasParentErrors && <span className="ml-1.5 h-2 w-2 rounded-full bg-destructive inline-block" />}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="max-h-[420px]">
                        <div className="px-6 py-4">
                            <TabsContent value="basic" className="mt-0 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <Label htmlFor="edit-name" className="text-sm font-medium flex items-center gap-1">
                                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                                            Full Name <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="edit-name"
                                            value={form.name}
                                            onChange={(e) => updateField("name", e.target.value)}
                                            className={`mt-1.5 rounded-lg ${errors.name ? "border-destructive" : ""}`}
                                        />
                                        {renderFieldError("name")}
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-email" className="text-sm font-medium flex items-center gap-1">
                                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                            Email <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="edit-email"
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => updateField("email", e.target.value)}
                                            className={`mt-1.5 rounded-lg ${errors.email ? "border-destructive" : ""}`}
                                        />
                                        {renderFieldError("email")}
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-roll" className="text-sm font-medium flex items-center gap-1">
                                            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                            Roll Number <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="edit-roll"
                                            value={form.roll_number}
                                            onChange={(e) => updateField("roll_number", e.target.value)}
                                            className={`mt-1.5 rounded-lg ${errors.roll_number ? "border-destructive" : ""}`}
                                        />
                                        {renderFieldError("roll_number")}
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium flex items-center gap-1">
                                            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                                            Class
                                        </Label>
                                        <Select value={form.class_id} onValueChange={(v) => updateField("class_id", v)}>
                                            <SelectTrigger className="mt-1.5 rounded-lg">
                                                <SelectValue placeholder="Select class" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {classes.map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        {c.name} {c.section ? `- ${c.section}` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium flex items-center gap-1">
                                            <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                                            Gender
                                        </Label>
                                        <Select value={form.gender} onValueChange={(v) => updateField("gender", v)}>
                                            <SelectTrigger className="mt-1.5 rounded-lg">
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {GENDERS.map((g) => (
                                                    <SelectItem key={g} value={g}>{g}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-dob" className="text-sm font-medium flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                            Date of Birth
                                        </Label>
                                        <Input
                                            id="edit-dob"
                                            type="date"
                                            value={form.date_of_birth}
                                            onChange={(e) => updateField("date_of_birth", e.target.value)}
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
                            </TabsContent>

                            <TabsContent value="contact" className="mt-0 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="edit-phone" className="text-sm font-medium flex items-center gap-1">
                                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                            Phone
                                        </Label>
                                        <Input
                                            id="edit-phone"
                                            value={form.phone}
                                            onChange={(e) => updateField("phone", e.target.value)}
                                            className="mt-1.5 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium flex items-center gap-1">
                                            <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
                                            Blood Group
                                        </Label>
                                        <Select value={form.blood_group} onValueChange={(v) => updateField("blood_group", v)}>
                                            <SelectTrigger className="mt-1.5 rounded-lg">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BLOOD_GROUPS.map((bg) => (
                                                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-admission" className="text-sm font-medium flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                            Admission Date
                                        </Label>
                                        <Input
                                            id="edit-admission"
                                            type="date"
                                            value={form.admission_date}
                                            onChange={(e) => updateField("admission_date", e.target.value)}
                                            className="mt-1.5 rounded-lg"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Label htmlFor="edit-address" className="text-sm font-medium flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                            Address
                                        </Label>
                                        <Input
                                            id="edit-address"
                                            value={form.address}
                                            onChange={(e) => updateField("address", e.target.value)}
                                            className="mt-1.5 rounded-lg"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="parent" className="mt-0 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="edit-parent-name" className="text-sm font-medium">Parent Name</Label>
                                        <Input
                                            id="edit-parent-name"
                                            value={form.parent_name}
                                            onChange={(e) => updateField("parent_name", e.target.value)}
                                            className="mt-1.5 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-parent-email" className="text-sm font-medium">Parent Email</Label>
                                        <Input
                                            id="edit-parent-email"
                                            type="email"
                                            value={form.parent_email}
                                            onChange={(e) => updateField("parent_email", e.target.value)}
                                            className={`mt-1.5 rounded-lg ${errors.parent_email ? "border-destructive" : ""}`}
                                        />
                                        {renderFieldError("parent_email")}
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-parent-phone" className="text-sm font-medium">Parent Phone</Label>
                                        <Input
                                            id="edit-parent-phone"
                                            value={form.parent_phone}
                                            onChange={(e) => updateField("parent_phone", e.target.value)}
                                            className="mt-1.5 rounded-lg"
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </ScrollArea>
                </Tabs>

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
