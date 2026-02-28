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
    KeyRound,
    Loader2,
    Plus,
    Eye,
    EyeOff,
    GraduationCap,
    UserPlus,
    Info,
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
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createStudent, getClasses } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Class as ClassType } from "@/types";

interface AddStudentDialogProps {
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
    create_login: boolean;
    password: string;
}

interface FormErrors {
    [key: string]: string;
}

const INITIAL_FORM: FormData = {
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
    create_login: false,
    password: "",
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const GENDERS = ["Male", "Female", "Other"];

export function AddStudentDialog({ onSuccess }: AddStudentDialogProps) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("basic");
    const [form, setForm] = useState<FormData>({ ...INITIAL_FORM });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [classes, setClasses] = useState<ClassType[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            getClasses().then((res) => {
                if (res.success && res.data) {
                    setClasses(
                        (res.data as { classes: ClassType[] }).classes || []
                    );
                }
            });
        }
    }, [open]);

    const updateField = (field: keyof FormData, value: string | boolean) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
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
        if (!form.roll_number.trim())
            newErrors.roll_number = "Roll number is required";

        if (form.parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parent_email)) {
            newErrors.parent_email = "Please enter a valid parent email";
        }

        if (form.create_login) {
            if (!form.password) {
                newErrors.password = "Password is required when creating login";
            } else if (form.password.length < 8) {
                newErrors.password = "Password must be at least 8 characters";
            }
        }

        setErrors(newErrors);

        // Auto-navigate to the tab with first error
        if (Object.keys(newErrors).length > 0) {
            const basicFields = ["name", "email", "roll_number", "class_id", "gender", "date_of_birth"];
            const contactFields = ["phone", "address", "blood_group", "admission_date"];
            const parentFields = ["parent_name", "parent_email", "parent_phone", "password"];

            const errorFields = Object.keys(newErrors);
            if (errorFields.some((f) => basicFields.includes(f))) {
                setActiveTab("basic");
            } else if (errorFields.some((f) => contactFields.includes(f))) {
                setActiveTab("contact");
            } else if (errorFields.some((f) => parentFields.includes(f))) {
                setActiveTab("parent");
            }
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
            if (form.create_login) {
                payload.create_login = true;
                payload.password = form.password;
            }

            const res = await createStudent(payload as any);

            if (res.success) {
                toast({
                    title: "Student Created",
                    description: `${form.name} has been enrolled successfully.`,
                });
                handleReset();
                setOpen(false);
                onSuccess();
            }
        } catch (err: any) {
            const message =
                err?.message || "Failed to create student. Please try again.";
            toast({
                title: "Error",
                description: message,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setForm({ ...INITIAL_FORM });
        setErrors({});
        setActiveTab("basic");
        setShowPassword(false);
    };

    const renderFieldError = (field: string) => {
        if (!errors[field]) return null;
        return (
            <p className="text-xs text-destructive mt-1 animate-in fade-in slide-in-from-top-1">
                {errors[field]}
            </p>
        );
    };

    const hasBasicErrors = ["name", "email", "roll_number", "class_id", "gender", "date_of_birth"].some(
        (f) => errors[f]
    );
    const hasContactErrors = ["phone", "address", "blood_group", "admission_date"].some(
        (f) => errors[f]
    );
    const hasParentErrors = ["parent_name", "parent_email", "parent_phone", "password"].some(
        (f) => errors[f]
    );

    return (
        <Dialog
            open={open}
            onOpenChange={(val) => {
                if (!val) handleReset();
                setOpen(val);
            }}
        >
            <DialogTrigger asChild>
                <Button className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md hover:shadow-lg transition-all duration-200">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Student
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden">
                {/* Gradient Header */}
                <div className="bg-gradient-to-r from-primary to-blue-600 px-6 py-5 text-white">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <UserPlus className="h-5 w-5" />
                            </div>
                            Enroll New Student
                        </DialogTitle>
                        <DialogDescription className="text-white/80 text-sm">
                            Fill in the student details below. Fields marked with * are
                            required.
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
                                {hasBasicErrors && (
                                    <span className="ml-1.5 h-2 w-2 rounded-full bg-destructive inline-block" />
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="contact"
                                className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                            >
                                <Phone className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                                Contact
                                {hasContactErrors && (
                                    <span className="ml-1.5 h-2 w-2 rounded-full bg-destructive inline-block" />
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="parent"
                                className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                            >
                                <KeyRound className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                                Parent & Login
                                {hasParentErrors && (
                                    <span className="ml-1.5 h-2 w-2 rounded-full bg-destructive inline-block" />
                                )}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="max-h-[420px]">
                        <div className="px-6 py-4">
                            {/* Tab 1: Basic Info */}
                            <TabsContent value="basic" className="mt-0 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Name */}
                                    <div className="sm:col-span-2">
                                        <Label htmlFor="student-name" className="text-sm font-medium flex items-center gap-1">
                                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                                            Full Name <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="student-name"
                                            placeholder="e.g. Aarav Sharma"
                                            value={form.name}
                                            onChange={(e) => updateField("name", e.target.value)}
                                            className={`mt-1.5 rounded-lg ${errors.name ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                                        />
                                        {renderFieldError("name")}
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <Label htmlFor="student-email" className="text-sm font-medium flex items-center gap-1">
                                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                            Email Address <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="student-email"
                                            type="email"
                                            placeholder="student@example.com"
                                            value={form.email}
                                            onChange={(e) => updateField("email", e.target.value)}
                                            className={`mt-1.5 rounded-lg ${errors.email ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                                        />
                                        {renderFieldError("email")}
                                    </div>

                                    {/* Roll Number */}
                                    <div>
                                        <Label htmlFor="student-roll" className="text-sm font-medium flex items-center gap-1">
                                            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                            Roll Number <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="student-roll"
                                            placeholder="e.g. R1001"
                                            value={form.roll_number}
                                            onChange={(e) => updateField("roll_number", e.target.value)}
                                            className={`mt-1.5 rounded-lg ${errors.roll_number ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                                        />
                                        {renderFieldError("roll_number")}
                                    </div>

                                    {/* Class */}
                                    <div>
                                        <Label className="text-sm font-medium flex items-center gap-1">
                                            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                                            Class
                                        </Label>
                                        <Select
                                            value={form.class_id}
                                            onValueChange={(v) => updateField("class_id", v)}
                                        >
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

                                    {/* Gender */}
                                    <div>
                                        <Label className="text-sm font-medium flex items-center gap-1">
                                            <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                                            Gender
                                        </Label>
                                        <Select
                                            value={form.gender}
                                            onValueChange={(v) => updateField("gender", v)}
                                        >
                                            <SelectTrigger className="mt-1.5 rounded-lg">
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {GENDERS.map((g) => (
                                                    <SelectItem key={g} value={g}>
                                                        {g}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Date of Birth */}
                                    <div>
                                        <Label htmlFor="student-dob" className="text-sm font-medium flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                            Date of Birth
                                        </Label>
                                        <Input
                                            id="student-dob"
                                            type="date"
                                            value={form.date_of_birth}
                                            onChange={(e) => updateField("date_of_birth", e.target.value)}
                                            className="mt-1.5 rounded-lg"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Tab 2: Contact & Details */}
                            <TabsContent value="contact" className="mt-0 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Phone */}
                                    <div>
                                        <Label htmlFor="student-phone" className="text-sm font-medium flex items-center gap-1">
                                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                            Phone Number
                                        </Label>
                                        <Input
                                            id="student-phone"
                                            placeholder="e.g. +91 98765 43210"
                                            value={form.phone}
                                            onChange={(e) => updateField("phone", e.target.value)}
                                            className="mt-1.5 rounded-lg"
                                        />
                                    </div>

                                    {/* Blood Group */}
                                    <div>
                                        <Label className="text-sm font-medium flex items-center gap-1">
                                            <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
                                            Blood Group
                                        </Label>
                                        <Select
                                            value={form.blood_group}
                                            onValueChange={(v) => updateField("blood_group", v)}
                                        >
                                            <SelectTrigger className="mt-1.5 rounded-lg">
                                                <SelectValue placeholder="Select blood group" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BLOOD_GROUPS.map((bg) => (
                                                    <SelectItem key={bg} value={bg}>
                                                        {bg}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Admission Date */}
                                    <div>
                                        <Label htmlFor="student-admission" className="text-sm font-medium flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                            Admission Date
                                        </Label>
                                        <Input
                                            id="student-admission"
                                            type="date"
                                            value={form.admission_date}
                                            onChange={(e) => updateField("admission_date", e.target.value)}
                                            className="mt-1.5 rounded-lg"
                                        />
                                    </div>

                                    {/* Address */}
                                    <div className="sm:col-span-2">
                                        <Label htmlFor="student-address" className="text-sm font-medium flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                            Address
                                        </Label>
                                        <Input
                                            id="student-address"
                                            placeholder="e.g. 123 Main Street, City"
                                            value={form.address}
                                            onChange={(e) => updateField("address", e.target.value)}
                                            className="mt-1.5 rounded-lg"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Tab 3: Parent & Login */}
                            <TabsContent value="parent" className="mt-0 space-y-5">
                                {/* Parent Section */}
                                <div>
                                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                                        <Users className="h-4 w-4 text-primary" />
                                        Parent / Guardian Details
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="parent-name" className="text-sm font-medium">
                                                Parent Name
                                            </Label>
                                            <Input
                                                id="parent-name"
                                                placeholder="e.g. Rajesh Sharma"
                                                value={form.parent_name}
                                                onChange={(e) => updateField("parent_name", e.target.value)}
                                                className="mt-1.5 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="parent-email" className="text-sm font-medium">
                                                Parent Email
                                            </Label>
                                            <Input
                                                id="parent-email"
                                                type="email"
                                                placeholder="parent@example.com"
                                                value={form.parent_email}
                                                onChange={(e) => updateField("parent_email", e.target.value)}
                                                className={`mt-1.5 rounded-lg ${errors.parent_email ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                                            />
                                            {renderFieldError("parent_email")}
                                        </div>
                                        <div>
                                            <Label htmlFor="parent-phone" className="text-sm font-medium">
                                                Parent Phone
                                            </Label>
                                            <Input
                                                id="parent-phone"
                                                placeholder="e.g. +91 98765 43210"
                                                value={form.parent_phone}
                                                onChange={(e) => updateField("parent_phone", e.target.value)}
                                                className="mt-1.5 rounded-lg"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-border/60" />

                                {/* Login Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                            <KeyRound className="h-4 w-4 text-primary" />
                                            Login Account
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="create-login" className="text-xs text-muted-foreground cursor-pointer">
                                                Create login
                                            </Label>
                                            <Switch
                                                id="create-login"
                                                checked={form.create_login}
                                                onCheckedChange={(checked) =>
                                                    updateField("create_login", checked)
                                                }
                                            />
                                        </div>
                                    </div>

                                    {form.create_login ? (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="bg-blue-500/10 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-xs flex items-start gap-2">
                                                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                                                <p>
                                                    A student user account will be created with the email
                                                    and password below. The student can log in to access
                                                    their dashboard, assignments, and grades.
                                                    {form.parent_email && " A parent account will also be created."}
                                                </p>
                                            </div>

                                            <div>
                                                <Label htmlFor="student-password" className="text-sm font-medium">
                                                    Password <span className="text-destructive">*</span>
                                                </Label>
                                                <div className="relative mt-1.5">
                                                    <Input
                                                        id="student-password"
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="Minimum 8 characters"
                                                        value={form.password}
                                                        onChange={(e) => updateField("password", e.target.value)}
                                                        className={`rounded-lg pr-10 ${errors.password ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                        ) : (
                                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </Button>
                                                </div>
                                                {renderFieldError("password")}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                            No login will be created. You can create one later from the
                                            student's profile.
                                        </p>
                                    )}
                                </div>
                            </TabsContent>
                        </div>
                    </ScrollArea>
                </Tabs>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                    <div className="flex items-center justify-between w-full">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            disabled={isSubmitting}
                            className="text-muted-foreground"
                        >
                            Reset
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-sm"
                            >
                                {isSubmitting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {isSubmitting ? "Creating..." : "Enroll Student"}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
