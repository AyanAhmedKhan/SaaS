import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, Users, FileText, Calendar, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface PermissionsMap {
    [role: string]: {
        manage_students: boolean;
        manage_attendance: boolean;
        manage_remarks: boolean;
        manage_exams: boolean;
    };
}

const PERMISSION_METADATA = [
    { key: "manage_students", label: "Edit Student Profiles", icon: Users, desc: "Can edit details of students in their assigned classes." },
    { key: "manage_attendance", label: "Manage Attendance", icon: Calendar, desc: "Can mark and update daily attendance." },
    { key: "manage_remarks", label: "Add Remarks", icon: FileText, desc: "Can add behavioral or subject-specific remarks for students." },
    { key: "manage_exams", label: "Manage Exams", icon: CheckCircle, desc: "Can create exams and enter marks/results." },
];

export function SettingsPermissions() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [permissions, setPermissions] = useState<PermissionsMap | null>(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState<string | null>(null); // To show spinner on specific toggle

    useEffect(() => {
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        try {
            setLoading(true);
            const res = await api.get<{ permissions: PermissionsMap }>(
                `/settings/permissions${user?.role === 'super_admin' ? '?institute_id=inst_01' : ''}`
            );

            if (res.success && res.data) {
                setPermissions(res.data.permissions);
            } else {
                toast({ title: "Error", description: "Failed to load permissions", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to connect to server", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (role: string, permissionKey: string, currentValue: boolean) => {
        if (!permissions) return;

        const newValue = !currentValue;
        setToggling(`${role}-${permissionKey}`);

        // Optimistic update
        const updatedPermissions = { ...permissions };
        updatedPermissions[role] = { ...updatedPermissions[role], [permissionKey]: newValue };
        setPermissions(updatedPermissions);

        try {
            const res = await api.put('/settings/permissions', {
                ...(user?.role === 'super_admin' ? { institute_id: 'inst_01' } : {}),
                role,
                permissions: updatedPermissions[role]
            });

            if (!res.success) {
                throw new Error(res.error?.message || "Failed to update permission");
            }
            toast({ title: "Updated", description: "Permission successfully updated." });
        } catch (error) {
            console.error(error);
            // Revert changes
            setPermissions(permissions);
            toast({ title: "Error", description: "Failed to save permission change", variant: "destructive" });
        } finally {
            setToggling(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Loading permissions...</span>
            </div>
        );
    }

    if (!permissions) return null;

    const roles = [
        { id: 'class_teacher', label: 'Class Teacher', color: 'bg-blue-500/10 text-blue-600', ring: 'ring-blue-500/20' },
        { id: 'subject_teacher', label: 'Subject Teacher', color: 'bg-emerald-500/10 text-emerald-600', ring: 'ring-emerald-500/20' }
    ];

    return (
        <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Faculty Powers Matrix</CardTitle>
                        <CardDescription className="mt-1">
                            Configure exactly what Class Teachers and Subject Teachers are allowed to do across the platform.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-muted/50 border-b">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-semibold text-muted-foreground w-1/3">
                                    Permission
                                </th>
                                {roles.map(role => (
                                    <th key={role.id} scope="col" className="px-6 py-4 font-semibold text-center w-1/3">
                                        <div className={cn("inline-flex items-center px-2.5 py-1 rounded-full ring-1 font-semibold", role.color, role.ring)}>
                                            {role.label}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {PERMISSION_METADATA.map((perm) => {
                                const Icon = perm.icon;
                                return (
                                    <tr key={perm.key} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 p-1.5 bg-muted rounded-md text-foreground">
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-foreground">{perm.label}</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">{perm.desc}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {roles.map(role => {
                                            const isChecked = permissions[role.id]?.[perm.key as keyof typeof permissions[typeof role.id]] ?? false;
                                            const isToggling = toggling === `${role.id}-${perm.key}`;
                                            return (
                                                <td key={`${role.id}-${perm.key}`} className="px-6 py-5 text-center align-middle">
                                                    <div className="flex justify-center items-center h-full">
                                                        {isToggling ? (
                                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                        ) : (
                                                            <Switch
                                                                checked={isChecked}
                                                                onCheckedChange={() => handleToggle(role.id, perm.key, isChecked)}
                                                                className="data-[state=checked]:bg-primary"
                                                            />
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
