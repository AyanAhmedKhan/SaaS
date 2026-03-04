import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAssignmentDetails, submitAssignment } from "@/lib/api";
import type { Assignment, AssignmentSubmission } from "@/types";
import { Loader2, Calendar, FileText, Download, CheckCircle2, Clock, Link as LinkIcon, AlertCircle, UploadCloud, MessageSquare, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentAssignmentDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assignmentId: string | null;
    onSuccess: () => void;
}

export function StudentAssignmentDetailsDialog({
    open,
    onOpenChange,
    assignmentId,
    onSuccess,
}: StudentAssignmentDetailsDialogProps) {
    const [loading, setLoading] = useState(false);
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);

    const [gdriveLink, setGdriveLink] = useState("");
    const [submissionText, setSubmissionText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [linkError, setLinkError] = useState("");

    useEffect(() => {
        if (open && assignmentId) {
            loadDetails();
            setGdriveLink("");
            setSubmissionText("");
            setLinkError("");
        }
    }, [open, assignmentId]);

    const loadDetails = async () => {
        if (!assignmentId) return;

        setLoading(true);
        try {
            const response = await getAssignmentDetails(assignmentId);
            if (response.success && response.data) {
                setAssignment(response.data.assignment);
                // The backend returns only this student's submission when requested by a student
                setSubmission(response.data.submissions?.[0] || null);
            }
        } catch (error) {
            console.error("Failed to load assignment details:", error);
        } finally {
            setLoading(false);
        }
    };

    const validateGdriveLink = (url: string) => {
        if (!url) return false;
        const regex = /(drive\.google\.com|docs\.google\.com)/i;
        return regex.test(url);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignmentId) return;

        if (!validateGdriveLink(gdriveLink)) {
            setLinkError("Please provide a valid Google Drive link (drive.google.com or docs.google.com).");
            return;
        }
        setLinkError("");

        setSubmitting(true);
        try {
            await submitAssignment(assignmentId, {
                submission_text: submissionText,
                file_url: gdriveLink,
            });
            await loadDetails();
            onSuccess();
        } catch (error) {
            console.error("Failed to submit assignment:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const isOverdue = assignment ? new Date(assignment.due_date).getTime() < Date.now() : false;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <p className="text-muted-foreground font-medium animate-pulse">Loading details...</p>
                    </div>
                ) : assignment ? (
                    <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                        {/* LEFT COLUMN: ASSIGNMENT DETAILS */}
                        <div className="w-full md:w-1/2 p-6 md:p-8 bg-muted/10 border-r border-border/50 overflow-y-auto custom-scrollbar">
                            <div className="space-y-6">
                                <div>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        <Badge variant="outline" className="bg-background/50 border-border/50 shadow-none uppercase text-[10px] tracking-wider font-bold text-muted-foreground">
                                            {assignment.subject_name || assignment.class_name}
                                        </Badge>
                                        <Badge variant="outline" className={cn(
                                            "shadow-none px-2 py-0.5",
                                            isOverdue && !submission ? 'bg-red-500/10 text-red-600 border-red-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                        )}>
                                            {isOverdue && !submission ? <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Overdue</span> : <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Active</span>}
                                        </Badge>
                                    </div>
                                    <h3 className="text-2xl font-black text-foreground leading-tight tracking-tight mb-4">{assignment.title}</h3>

                                    <div className="flex flex-wrap items-center gap-4 text-sm text-foreground mb-6 bg-background/50 p-3 rounded-xl border border-border/40">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 bg-muted rounded-md"><Calendar className="h-4 w-4 text-muted-foreground" /></div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Deadline</p>
                                                <p className={cn("font-semibold mt-0.5 leading-none", isOverdue ? "text-red-500" : "")}>{new Date(assignment.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                            </div>
                                        </div>
                                        <div className="w-px h-8 bg-border/50" />
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 bg-amber-500/10 rounded-md"><Award className="h-4 w-4 text-amber-500" /></div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Total Marks</p>
                                                <p className="font-semibold text-foreground mt-0.5 leading-none">{assignment.total_marks}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {assignment.description && (
                                        <div>
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Description</Label>
                                            <p className="text-sm text-foreground/90 leading-relaxed bg-background/50 p-4 rounded-xl border border-border/30">{assignment.description}</p>
                                        </div>
                                    )}

                                    {assignment.instructions && (
                                        <div>
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Instructions</Label>
                                            <div className="text-sm text-foreground/90 leading-relaxed bg-primary/5 p-4 rounded-xl border border-primary/10 whitespace-pre-wrap">
                                                {assignment.instructions}
                                            </div>
                                        </div>
                                    )}

                                    {assignment.attachment_url && (
                                        <div className="pt-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Reference Material</Label>
                                            <Button variant="outline" className="w-full justify-start h-12 bg-background/50 border-border/50 hover:bg-background/80 hover:text-primary transition-colors group" asChild>
                                                <a href={assignment.attachment_url} target="_blank" rel="noopener noreferrer">
                                                    <Download className="h-4 w-4 mr-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    <span className="font-medium">Download Attachment</span>
                                                </a>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: SUBMISSION PORTAL */}
                        <div className="w-full md:w-1/2 p-6 md:p-8 bg-background overflow-y-auto custom-scrollbar flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <Label className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                    <UploadCloud className="w-4 h-4 text-primary" /> Submission Portal
                                </Label>
                            </div>

                            {submission ? (
                                /* ALREADY SUBMITTED STATE */
                                <div className="flex-1 flex flex-col space-y-6">
                                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-2 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
                                        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <h4 className="font-bold text-lg text-emerald-700 dark:text-emerald-400">Successfully Submitted</h4>
                                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 mx-auto">
                                            <Clock className="w-3.5 h-3.5" /> {new Date(submission.submitted_at).toLocaleString()}
                                            {submission.is_late && <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[9px] uppercase shadow-none h-4">Late</Badge>}
                                        </p>
                                    </div>

                                    {/* GRADING ALERT */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center border border-border/50 shadow-sm">
                                                <Award className="w-5 h-5 text-amber-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</p>
                                                {submission.marks_obtained !== null && submission.marks_obtained !== undefined ? (
                                                    <p className="font-bold text-foreground">Graded</p>
                                                ) : (
                                                    <p className="font-medium text-muted-foreground">Pending Review</p>
                                                )}
                                            </div>
                                        </div>
                                        {submission.marks_obtained !== null && submission.marks_obtained !== undefined && (
                                            <div className="text-right">
                                                <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-600 px-3 py-1 shadow-sm text-sm">
                                                    {submission.marks_obtained} / {assignment.total_marks}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4 flex-1">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-muted-foreground">Your Submitted Link</Label>
                                            <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-md group-hover:bg-blue-200 dark:group-hover:bg-blue-700 transition-colors">
                                                    <LinkIcon className="h-4 w-4" />
                                                </div>
                                                <span className="text-sm font-medium truncate">{submission.file_url}</span>
                                            </a>
                                        </div>

                                        {submission.submission_text && (
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-muted-foreground">Your Remarks</Label>
                                                <div className="text-sm bg-muted/30 p-4 rounded-lg border border-border/30 text-foreground whitespace-pre-wrap">
                                                    {submission.submission_text}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {submission.teacher_remarks && (
                                        <div className="mt-6 p-5 bg-gradient-to-br from-primary/10 to-transparent rounded-xl border border-primary/20 relative">
                                            <MessageSquare className="absolute top-4 right-4 w-5 h-5 text-primary/40" />
                                            <Label className="text-xs font-black uppercase tracking-wider text-primary mb-2 block">Teacher's Feedback</Label>
                                            <p className="text-sm text-foreground leading-relaxed mt-2">{submission.teacher_remarks}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* NOT YET SUBMITTED STATE */
                                <div className="flex-1 flex flex-col h-full">
                                    {isOverdue && !assignment.allow_late_submission ? (
                                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-red-500/5 rounded-2xl border border-red-500/20">
                                            <div className="w-16 h-16 bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mb-4">
                                                <AlertCircle className="h-8 w-8" />
                                            </div>
                                            <h4 className="font-bold text-xl text-red-700 dark:text-red-400 mb-2">Submission Closed</h4>
                                            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                                The deadline for this assignment has passed, and late submissions are currently disabled.
                                            </p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-6">
                                            {isOverdue && assignment.allow_late_submission && (
                                                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-start gap-3">
                                                    <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                                                    <p className="text-sm text-orange-800 dark:text-orange-300">
                                                        <span className="font-bold">Overdue Alert:</span> You are submitting this past the deadline. It will be marked as <Badge variant="destructive" className="mx-1 py-0 px-1 text-[10px] uppercase shadow-none h-4">Late</Badge>.
                                                    </p>
                                                </div>
                                            )}

                                            <div className="flex-1 space-y-6">
                                                <div className="space-y-3">
                                                    <Label htmlFor="gdriveLink" className="text-sm font-semibold flex flex-col gap-1">
                                                        <span>Google Drive / Docs Link <span className="text-red-500">*</span></span>
                                                        <span className="text-xs text-muted-foreground font-normal">Ensure link sharing is set to "Anyone with the link can view".</span>
                                                    </Label>
                                                    <div className="relative group">
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/5 dark:bg-white/10 rounded-md flex items-center justify-center text-muted-foreground group-focus-within:text-primary group-focus-within:bg-primary/10 transition-colors">
                                                            <LinkIcon className="h-4 w-4" />
                                                        </div>
                                                        <Input
                                                            id="gdriveLink"
                                                            placeholder="https://drive.google.com/file/d/..."
                                                            value={gdriveLink}
                                                            onChange={(e) => {
                                                                setGdriveLink(e.target.value);
                                                                if (linkError) validateGdriveLink(e.target.value) && setLinkError("");
                                                            }}
                                                            className={cn(
                                                                "pl-14 h-12 bg-muted/30 border-border/50 transition-all rounded-xl focus-visible:ring-primary/20",
                                                                linkError && "border-red-500 focus-visible:ring-red-500/20"
                                                            )}
                                                            required
                                                        />
                                                    </div>
                                                    {linkError && <p className="text-xs font-semibold text-red-500 animate-in fade-in slide-in-from-top-1">{linkError}</p>}
                                                </div>

                                                <div className="space-y-3">
                                                    <Label htmlFor="submissionText" className="text-sm font-semibold flex flex-col gap-1">
                                                        <span>Additional Remarks <span className="text-muted-foreground font-normal">(Optional)</span></span>
                                                    </Label>
                                                    <Textarea
                                                        id="submissionText"
                                                        placeholder="Add any notes for your teacher regarding your submission..."
                                                        value={submissionText}
                                                        onChange={(e) => setSubmissionText(e.target.value)}
                                                        rows={5}
                                                        className="resize-none bg-muted/30 border-border/50 rounded-xl focus-visible:ring-primary/20"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-border/50">
                                                <Button type="submit" size="lg" className="w-full text-base font-bold shadow-lg shadow-primary/25 h-12" disabled={submitting}>
                                                    {submitting ? (
                                                        <><Loader2 className="h-5 w-5 mr-3 animate-spin" /> Submitting securely...</>
                                                    ) : (
                                                        <><UploadCloud className="h-5 w-5 mr-3" /> Confirm & Submit Work</>
                                                    )}
                                                </Button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 px-6">
                        <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium text-lg">Assignment details could not be loaded.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
