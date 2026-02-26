import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { changePasswordApi, getNotificationPreferences, updateNotificationPreferences } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
    Settings as SettingsIcon, Lock, Bell, User, Shield, LogOut,
    Eye, EyeOff, CheckCircle2, Loader2, Smartphone, Mail, GraduationCap,
} from "lucide-react";

export default function Settings() {
    const { user, logout } = useAuth();
    const { toast } = useToast();

    // ──── Password State ────
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    // ──── Notification Preferences ────
    const [emailNotif, setEmailNotif] = useState(true);
    const [whatsappNotif, setWhatsappNotif] = useState(false);
    const [phone, setPhone] = useState("");
    const [loadingPrefs, setLoadingPrefs] = useState(true);
    const [savingPrefs, setSavingPrefs] = useState(false);

    const roleLabel = user?.role?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "User";

    // Load notification preferences
    const fetchPrefs = useCallback(async () => {
        try {
            setLoadingPrefs(true);
            const res = await getNotificationPreferences();
            if (res.success && res.data) {
                const prefs = res.data as { email_notifications?: boolean; whatsapp_notifications?: boolean; phone?: string };
                setEmailNotif(prefs.email_notifications ?? true);
                setWhatsappNotif(prefs.whatsapp_notifications ?? false);
                setPhone(prefs.phone || "");
            }
        } catch {
            // silently fail — defaults are fine
        } finally {
            setLoadingPrefs(false);
        }
    }, []);

    useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

    // Handle password change
    const handlePasswordChange = async () => {
        if (!currentPassword || !newPassword) {
            toast({ title: "Error", description: "Please fill in all password fields.", variant: "destructive" });
            return;
        }
        if (newPassword.length < 6) {
            toast({ title: "Error", description: "New password must be at least 6 characters.", variant: "destructive" });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" });
            return;
        }

        try {
            setChangingPassword(true);
            const res = await changePasswordApi(currentPassword, newPassword);
            if (res.success) {
                toast({ title: "Success", description: "Password changed successfully." });
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                toast({ title: "Error", description: (res as any).error?.message || "Failed to change password.", variant: "destructive" });
            }
        } catch (err) {
            toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to change password.", variant: "destructive" });
        } finally {
            setChangingPassword(false);
        }
    };

    // Handle notification preferences save
    const handleSavePrefs = async () => {
        try {
            setSavingPrefs(true);
            const res = await updateNotificationPreferences({
                email_notifications: emailNotif,
                whatsapp_notifications: whatsappNotif,
                phone: phone || undefined,
            });
            if (res.success) {
                toast({ title: "Saved", description: "Notification preferences updated." });
            } else {
                toast({ title: "Error", description: "Failed to save preferences.", variant: "destructive" });
            }
        } catch (err) {
            toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to save preferences.", variant: "destructive" });
        } finally {
            setSavingPrefs(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-4 sm:space-y-6 page-enter max-w-2xl mx-auto">
                {/* Header */}
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">Settings</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage your account and preferences.</p>
                </div>

                {/* ═══════ PROFILE OVERVIEW ═══════ */}
                <Card className="border-border/40">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <Avatar className="h-12 w-12 sm:h-14 sm:w-14 ring-2 ring-primary/20">
                                <AvatarImage src={user?.avatar} />
                                <AvatarFallback className="bg-primary/10 text-primary text-lg sm:text-xl font-bold">
                                    {user?.name?.charAt(0) || "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <p className="text-base sm:text-lg font-semibold text-foreground truncate">{user?.name || "User"}</p>
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">{user?.email}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                                        <Shield className="h-3 w-3 mr-1" />
                                        {roleLabel}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ═══════ CHANGE PASSWORD ═══════ */}
                <Card className="border-border/40">
                    <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-3">
                        <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                            <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            Change Password
                        </CardTitle>
                        <CardDescription className="text-[10px] sm:text-xs">
                            Update your password to keep your account secure.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
                        <div className="space-y-1.5">
                            <Label htmlFor="current-pw" className="text-xs sm:text-sm">Current Password</Label>
                            <div className="relative">
                                <Input
                                    id="current-pw"
                                    type={showCurrentPassword ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    className="pr-10 h-9 sm:h-10 text-xs sm:text-sm"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                >
                                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="new-pw" className="text-xs sm:text-sm">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="new-pw"
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password (min 6 chars)"
                                    className="pr-10 h-9 sm:h-10 text-xs sm:text-sm"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="confirm-pw" className="text-xs sm:text-sm">Confirm New Password</Label>
                            <Input
                                id="confirm-pw"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter new password"
                                className="h-9 sm:h-10 text-xs sm:text-sm"
                            />
                            {confirmPassword && newPassword && confirmPassword !== newPassword && (
                                <p className="text-[10px] sm:text-xs text-destructive">Passwords do not match</p>
                            )}
                        </div>

                        <Button
                            onClick={handlePasswordChange}
                            disabled={changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                            className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
                        >
                            {changingPassword ? (
                                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Changing...</>
                            ) : (
                                <><Lock className="h-3.5 w-3.5 mr-1.5" /> Update Password</>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* ═══════ NOTIFICATION PREFERENCES ═══════ */}
                <Card className="border-border/40">
                    <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-3">
                        <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            Notifications
                        </CardTitle>
                        <CardDescription className="text-[10px] sm:text-xs">
                            Choose how you want to receive notifications.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-5 px-4 sm:px-6 pb-4 sm:pb-6">
                        {loadingPrefs ? (
                            <div className="flex items-center justify-center py-8 gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                <span className="text-xs text-muted-foreground">Loading preferences...</span>
                            </div>
                        ) : (
                            <>
                                {/* Email Notifications */}
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2.5 sm:gap-3">
                                        <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
                                            <Mail className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs sm:text-sm font-medium text-foreground">Email Notifications</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground">Receive updates via email</p>
                                        </div>
                                    </div>
                                    <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
                                </div>

                                <Separator />

                                {/* WhatsApp Notifications */}
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2.5 sm:gap-3">
                                        <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/10">
                                            <Smartphone className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs sm:text-sm font-medium text-foreground">WhatsApp Notifications</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground">Receive updates via WhatsApp</p>
                                        </div>
                                    </div>
                                    <Switch checked={whatsappNotif} onCheckedChange={setWhatsappNotif} />
                                </div>

                                {/* Phone number (shown when WhatsApp is enabled) */}
                                {whatsappNotif && (
                                    <div className="space-y-1.5 pl-9 sm:pl-11">
                                        <Label htmlFor="phone" className="text-xs sm:text-sm">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+91 9876543210"
                                            className="h-9 sm:h-10 text-xs sm:text-sm max-w-xs"
                                        />
                                    </div>
                                )}

                                <Button
                                    onClick={handleSavePrefs}
                                    disabled={savingPrefs}
                                    variant="outline"
                                    className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
                                >
                                    {savingPrefs ? (
                                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...</>
                                    ) : (
                                        <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Save Preferences</>
                                    )}
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* ═══════ ACCOUNT ACTIONS ═══════ */}
                <Card className="border-border/40 border-destructive/20">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div>
                                <p className="text-xs sm:text-sm font-medium text-foreground">Sign Out</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Log out of your account on this device.</p>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={logout}
                                className="h-9 sm:h-10 text-xs sm:text-sm w-full sm:w-auto"
                            >
                                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                                Sign Out
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Bottom safe area for mobile */}
                <div className="h-4 sm:h-0" />
            </div>
        </DashboardLayout>
    );
}
