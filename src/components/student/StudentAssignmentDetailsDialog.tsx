import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAssignmentDetails, submitAssignment } from "@/lib/api";
import type { Assignment, AssignmentSubmission } from "@/types";
import { Loader2, Calendar, FileText, Download, CheckCircle2, Clock, Link as LinkIcon, AlertCircle } from "lucide-react";

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

    const isOverdue = assignment && new Date(assignment.due_date) < new Date();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Assignment Details</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : assignment ? (
                    <div className="space-y-6">
                        {/* Assignment Info */}
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <div>
                                    <h3 className="text-xl font-bold mb-2">{assignment.title}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {assignment.subject_name && (
                                            <Badge variant="outline">{assignment.subject_name}</Badge>
                                        )}
                                        <Badge variant="outline" className={
                                            isOverdue && !submission ? 'bg-red-500/10 text-red-600 border-red-600/30' : 'bg-primary/10 text-primary border-primary/30'
                                        }>
                                            {isOverdue && !submission ? 'Overdue' : 'Active'}
                                        </Badge>
                                    </div>
                                </div>

                                {assignment.description && (
                                    <div>
                                        <Label className="text-sm font-semibold">Description</Label>
                                        <p className="text-sm text-muted-foreground mt-1">{assignment.description}</p>
                                    </div>
                                )}

                                {assignment.instructions && (
                                    <div>
                                        <Label className="text-sm font-semibold">Instructions</Label>
                                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{assignment.instructions}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Due Date</p>
                                            <p className="font-medium">{new Date(assignment.due_date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Total Marks</p>
                                            <p className="font-medium">{assignment.total_marks}</p>
                                        </div>
                                    </div>
                                </div>

                                {assignment.attachment_url && (
                                    <div>
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={assignment.attachment_url} target="_blank" rel="noopener noreferrer">
                                                <Download className="h-4 w-4 mr-2" />
                                                Download Provided Reference
                                            </a>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Submission Section */}
                        {submission ? (
                            <Card className="border-green-500/20 bg-green-500/5">
                                <CardContent className="pt-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            <h4 className="font-semibold text-green-700">Submitted</h4>
                                        </div>
                                        {submission.marks_obtained !== null && submission.marks_obtained !== undefined ? (
                                            <Badge className="bg-green-600">Graded: {submission.marks_obtained}/{assignment.total_marks}</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-amber-600 border-amber-600/30">Pending Review</Badge>
                                        )}
                                    </div>

                                    {submission.file_url && (
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Your Google Drive Link</Label>
                                            <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                                <LinkIcon className="h-3 w-3" /> {submission.file_url}
                                            </a>
                                        </div>
                                    )}

                                    {submission.submission_text && (
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Your Remarks</Label>
                                            <p className="text-sm mt-1 bg-background p-3 rounded-md border">{submission.submission_text}</p>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>Submitted on: {new Date(submission.submitted_at).toLocaleString()}</span>
                                        {submission.is_late && <Badge variant="destructive" className="ml-2 text-[10px] h-4">Late</Badge>}
                                    </div>

                                    {submission.teacher_remarks && (
                                        <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                            <Label className="text-xs font-semibold text-blue-700 dark:text-blue-400">Teacher's Feedback</Label>
                                            <p className="text-sm mt-1">{submission.teacher_remarks}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="pt-6">
                                    <h4 className="font-semibold mb-4">Submit Your Work</h4>
                                    {isOverdue && !assignment.allow_late_submission ? (
                                        <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-100">
                                            <AlertCircle className="h-8 w-8 text-red-500" />
                                            <div>
                                                <p className="font-medium text-red-700 dark:text-red-400">Submission Closed</p>
                                                <p className="text-sm text-muted-foreground mt-1">This assignment is overdue and late submissions are not allowed.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            {isOverdue && assignment.allow_late_submission && (
                                                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-400 text-sm rounded-lg flex items-start gap-2 border border-amber-200">
                                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                                    <p>This assignment is overdue. Your submission will be marked as <strong>Late</strong>.</p>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label htmlFor="gdriveLink">Google Drive Link <span className="text-destructive">*</span></Label>
                                                <div className="relative">
                                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="gdriveLink"
                                                        placeholder="https://drive.google.com/file/d/..."
                                                        value={gdriveLink}
                                                        onChange={(e) => {
                                                            setGdriveLink(e.target.value);
                                                            if (linkError) validateGdriveLink(e.target.value) && setLinkError("");
                                                        }}
                                                        className="pl-9"
                                                        required
                                                    />
                                                </div>
                                                {linkError && <p className="text-xs text-destructive">{linkError}</p>}
                                                <p className="text-xs text-muted-foreground">Make sure the link's access is set to "Anyone with the link can view".</p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="submissionText">Additional Remarks (Optional)</Label>
                                                <Textarea
                                                    id="submissionText"
                                                    placeholder="Add any notes for your teacher..."
                                                    value={submissionText}
                                                    onChange={(e) => setSubmissionText(e.target.value)}
                                                    rows={3}
                                                />
                                            </div>

                                            <Button type="submit" className="w-full" disabled={submitting}>
                                                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                                Submit Assignment
                                            </Button>
                                        </form>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Assignment not found.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
