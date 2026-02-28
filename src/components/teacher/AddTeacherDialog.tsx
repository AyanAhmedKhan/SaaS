import { useState } from "react";
import {
    User,
    Mail,
    Phone,
    BookOpen,
    Award,
    Briefcase,
    Loader2,
    Plus,
    KeyRound,
    Eye,
    EyeOff,
    Info,
    UserPlus,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { createTeacher } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AddTeacherDialogProps {
    onSuccess: () => void;
}

interface FormData {
    name: string;
    email: string;
    phone: string;
    subject_specialization: string;
    qualification: string;
    experience_years: string;
    create_login: boolean;
    password: string;
}

interface FormErrors {
    [key: string]: string;
}

const INITIAL_FORM: FormData = {
    name: "",
    email: "",
    phone: "",
    subject_specialization: "",
    qualification: "",
    experience_years: "",
    create_login: true,
    password: "",
};

export function AddTeacherDialog({ onSuccess }: AddTeacherDialogProps) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<FormData>({ ...INITIAL_FORM });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { toast } = useToast();

    const updateField = (field: keyof FormData, value: string | boolean) => {
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
        if (!form.name.trim()) newErrors.name = "Teacher name is required";
        if (!form.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = "Please enter a valid email address";
        }
        if (form.create_login) {
            if (!form.password) {
                newErrors.password = "Password is required when creating login";
            } else if (form.password.length < 8) {
                newErrors.password = "Password must be at least 8 characters";
            }
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
            };
            if (form.phone) payload.phone = form.phone.trim();
            if (form.subject_specialization)
                payload.subject_specialization = form.subject_specialization.trim();
            if (form.qualification) payload.qualification = form.qualification.trim();
            if (form.experience_years)
                payload.experience_years = parseInt(form.experience_years) || 0;
            if (form.create_login) {
                payload.create_login = true;
                payload.password = form.password;
            } else {
                payload.create_login = false;
            }

            const res = await createTeacher(payload as any);
            if (res.success) {
                toast({
                    title: "Teacher Added",
                    description: `${form.name} has been added successfully.`,
                });
                handleReset();
                setOpen(false);
                onSuccess();
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err?.message || "Failed to add teacher.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setForm({ ...INITIAL_FORM });
        setErrors({});
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
                    Add Teacher
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-blue-600 px-6 py-5 text-white">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <UserPlus className="h-5 w-5" />
                            </div>
                            Add New Teacher
                        </DialogTitle>
                        <DialogDescription className="text-white/80 text-sm">
                            Fill in the teacher details. Fields marked * are required.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <ScrollArea className="max-h-[450px]">
                    <div className="px-6 py-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <Label htmlFor="teacher-name" className="text-sm font-medium flex items-center gap-1">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    Full Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="teacher-name"
                                    placeholder="e.g. Dr. Priya Singh"
                                    value={form.name}
                                    onChange={(e) => updateField("name", e.target.value)}
                                    className={`mt-1.5 rounded-lg ${errors.name ? "border-destructive" : ""}`}
                                />
                                {renderFieldError("name")}
                            </div>
                            <div>
                                <Label htmlFor="teacher-email" className="text-sm font-medium flex items-center gap-1">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                    Email <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="teacher-email"
                                    type="email"
                                    placeholder="teacher@example.com"
                                    value={form.email}
                                    onChange={(e) => updateField("email", e.target.value)}
                                    className={`mt-1.5 rounded-lg ${errors.email ? "border-destructive" : ""}`}
                                />
                                {renderFieldError("email")}
                            </div>
                            <div>
                                <Label htmlFor="teacher-phone" className="text-sm font-medium flex items-center gap-1">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    Phone
                                </Label>
                                <Input
                                    id="teacher-phone"
                                    placeholder="e.g. +91 98765 43210"
                                    value={form.phone}
                                    onChange={(e) => updateField("phone", e.target.value)}
                                    className="mt-1.5 rounded-lg"
                                />
                            </div>
                            <div>
                                <Label htmlFor="teacher-subject" className="text-sm font-medium flex items-center gap-1">
                                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                    Subject Specialization
                                </Label>
                                <Input
                                    id="teacher-subject"
                                    placeholder="e.g. Mathematics"
                                    value={form.subject_specialization}
                                    onChange={(e) => updateField("subject_specialization", e.target.value)}
                                    className="mt-1.5 rounded-lg"
                                />
                            </div>
                            <div>
                                <Label htmlFor="teacher-qual" className="text-sm font-medium flex items-center gap-1">
                                    <Award className="h-3.5 w-3.5 text-muted-foreground" />
                                    Qualification
                                </Label>
                                <Input
                                    id="teacher-qual"
                                    placeholder="e.g. M.Ed, B.Sc"
                                    value={form.qualification}
                                    onChange={(e) => updateField("qualification", e.target.value)}
                                    className="mt-1.5 rounded-lg"
                                />
                            </div>
                            <div>
                                <Label htmlFor="teacher-exp" className="text-sm font-medium flex items-center gap-1">
                                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                                    Experience (years)
                                </Label>
                                <Input
                                    id="teacher-exp"
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 5"
                                    value={form.experience_years}
                                    onChange={(e) => updateField("experience_years", e.target.value)}
                                    className="mt-1.5 rounded-lg"
                                />
                            </div>
                        </div>

                        {/* Login Section */}
                        <div className="border-t border-border/60 pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <KeyRound className="h-4 w-4 text-primary" />
                                    Login Account
                                </h4>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="teacher-login" className="text-xs text-muted-foreground cursor-pointer">
                                        Create login
                                    </Label>
                                    <Switch
                                        id="teacher-login"
                                        checked={form.create_login}
                                        onCheckedChange={(checked) => updateField("create_login", checked)}
                                    />
                                </div>
                            </div>

                            {form.create_login ? (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="bg-blue-500/10 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-xs flex items-start gap-2">
                                        <Info className="h-4 w-4 mt-0.5 shrink-0" />
                                        <p>
                                            A user account will be created so this teacher can log in to
                                            manage classes, attendance, and assignments.
                                        </p>
                                    </div>
                                    <div>
                                        <Label htmlFor="teacher-password" className="text-sm font-medium">
                                            Password <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="relative mt-1.5">
                                            <Input
                                                id="teacher-password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Minimum 8 characters"
                                                value={form.password}
                                                onChange={(e) => updateField("password", e.target.value)}
                                                className={`rounded-lg pr-10 ${errors.password ? "border-destructive" : ""}`}
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
                                    No login will be created. You can create one later.
                                </p>
                            )}
                        </div>
                    </div>
                </ScrollArea>

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
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-sm"
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmitting ? "Adding..." : "Add Teacher"}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
