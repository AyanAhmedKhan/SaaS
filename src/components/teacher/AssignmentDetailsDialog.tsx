import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAssignmentDetails, gradeSubmission } from "@/lib/api";
import type { Assignment, AssignmentSubmission } from "@/types";
import {
  Loader2, Calendar, Users, FileText, Download, CheckCircle2,
  Clock, AlertCircle, ExternalLink
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AssignmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string | null;
  onSuccess: () => void;
}

export function AssignmentDetailsDialog({
  open,
  onOpenChange,
  assignmentId,
  onSuccess,
}: AssignmentDetailsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmission | null>(null);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [gradeForm, setGradeForm] = useState({ marks_obtained: "", teacher_remarks: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && assignmentId) {
      loadDetails();
    }
  }, [open, assignmentId]);

  const loadDetails = async () => {
    if (!assignmentId) return;
    
    setLoading(true);
    try {
      const response = await getAssignmentDetails(assignmentId);
      if (response.success && response.data) {
        setAssignment(response.data.assignment);
        setSubmissions(response.data.submissions || []);
      }
    } catch (error) {
      console.error("Failed to load assignment details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeClick = (submission: AssignmentSubmission) => {
    setGradingSubmission(submission);
    setGradeForm({
      marks_obtained: String(submission.marks_obtained || ""),
      teacher_remarks: submission.teacher_remarks || "",
    });
    setGradeDialogOpen(true);
  };

  const handleGradeSubmit = async () => {
    if (!gradingSubmission || !assignmentId) return;

    setSubmitting(true);
    try {
      await gradeSubmission(assignmentId, gradingSubmission.id, {
        marks_obtained: parseInt(gradeForm.marks_obtained),
        teacher_remarks: gradeForm.teacher_remarks,
      });
      
      await loadDetails();
      setGradeDialogOpen(false);
      setGradingSubmission(null);
      onSuccess();
    } catch (error) {
      console.error("Failed to grade submission:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const getSubmissionStatus = (submission: AssignmentSubmission) => {
    if (submission.marks_obtained !== null && submission.marks_obtained !== undefined) {
      return { label: "Graded", color: "bg-green-500/10 text-green-600 border-green-600/30" };
    }
    if (submission.is_late) {
      return { label: "Late", color: "bg-amber-500/10 text-amber-600 border-amber-600/30" };
    }
    return { label: "Submitted", color: "bg-blue-500/10 text-blue-600 border-blue-600/30" };
  };

  const submittedCount = submissions.length;
  const gradedCount = submissions.filter(s => s.marks_obtained !== null && s.marks_obtained !== undefined).length;
  const pendingCount = submittedCount - gradedCount;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                      <Badge variant="outline">{assignment.class_name} {assignment.section}</Badge>
                      {assignment.subject_name && (
                        <Badge variant="outline">{assignment.subject_name}</Badge>
                      )}
                      <Badge variant="outline" className={
                        assignment.status === 'published' ? 'bg-green-500/10 text-green-600 border-green-600/30' :
                        assignment.status === 'draft' ? 'bg-gray-500/10 text-gray-600 border-gray-600/30' :
                        'bg-red-500/10 text-red-600 border-red-600/30'
                      }>
                        {assignment.status}
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
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
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Submissions</p>
                        <p className="font-medium">{submittedCount}/{assignment.total_students || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Graded</p>
                        <p className="font-medium">{gradedCount}/{submittedCount}</p>
                      </div>
                    </div>
                  </div>

                  {assignment.attachment_url && (
                    <div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={assignment.attachment_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download Attachment
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submissions */}
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All ({submittedCount})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
                  <TabsTrigger value="graded">Graded ({gradedCount})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-3 mt-4">
                  {submissions.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No submissions yet</p>
                    </div>
                  ) : (
                    submissions.map(submission => (
                      <SubmissionCard
                        key={submission.id}
                        submission={submission}
                        totalMarks={assignment.total_marks}
                        onGrade={handleGradeClick}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="pending" className="space-y-3 mt-4">
                  {submissions.filter(s => s.marks_obtained === null || s.marks_obtained === undefined).length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <p className="text-muted-foreground">All submissions graded!</p>
                    </div>
                  ) : (
                    submissions
                      .filter(s => s.marks_obtained === null || s.marks_obtained === undefined)
                      .map(submission => (
                        <SubmissionCard
                          key={submission.id}
                          submission={submission}
                          totalMarks={assignment.total_marks}
                          onGrade={handleGradeClick}
                        />
                      ))
                  )}
                </TabsContent>

                <TabsContent value="graded" className="space-y-3 mt-4">
                  {submissions.filter(s => s.marks_obtained !== null && s.marks_obtained !== undefined).length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No graded submissions yet</p>
                    </div>
                  ) : (
                    submissions
                      .filter(s => s.marks_obtained !== null && s.marks_obtained !== undefined)
                      .map(submission => (
                        <SubmissionCard
                          key={submission.id}
                          submission={submission}
                          totalMarks={assignment.total_marks}
                          onGrade={handleGradeClick}
                        />
                      ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Assignment not found</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Grade Dialog */}
      <AlertDialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grade Submission</AlertDialogTitle>
            <AlertDialogDescription>
              {gradingSubmission && (
                <span>Grading submission by {gradingSubmission.student_name}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="marks">Marks Obtained *</Label>
              <Input
                id="marks"
                type="number"
                value={gradeForm.marks_obtained}
                onChange={(e) => setGradeForm({ ...gradeForm, marks_obtained: e.target.value })}
                placeholder="Enter marks"
                min="0"
                max={assignment?.total_marks}
              />
              <p className="text-xs text-muted-foreground">Out of {assignment?.total_marks}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Teacher Remarks</Label>
              <Textarea
                id="remarks"
                value={gradeForm.teacher_remarks}
                onChange={(e) => setGradeForm({ ...gradeForm, teacher_remarks: e.target.value })}
                placeholder="Add feedback for the student"
                rows={4}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGradeSubmit} disabled={submitting || !gradeForm.marks_obtained}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Grade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SubmissionCard({
  submission,
  totalMarks,
  onGrade,
}: {
  submission: AssignmentSubmission;
  totalMarks: number;
  onGrade: (submission: AssignmentSubmission) => void;
}) {
  const status = submission.marks_obtained !== null && submission.marks_obtained !== undefined
    ? { label: "Graded", color: "bg-green-500/10 text-green-600 border-green-600/30" }
    : submission.is_late
    ? { label: "Late", color: "bg-amber-500/10 text-amber-600 border-amber-600/30" }
    : { label: "Submitted", color: "bg-blue-500/10 text-blue-600 border-blue-600/30" };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold">{submission.student_name}</h4>
                <p className="text-sm text-muted-foreground">Roll: {submission.roll_number}</p>
              </div>
              <Badge variant="outline" className={status.color}>
                {status.label}
              </Badge>
            </div>

            {submission.submission_text && (
              <div>
                <Label className="text-xs">Submission</Label>
                <p className="text-sm text-muted-foreground line-clamp-3">{submission.submission_text}</p>
              </div>
            )}

            {submission.file_url && (
              <Button variant="link" size="sm" className="h-auto p-0" asChild>
                <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Attachment
                </a>
              </Button>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Submitted {new Date(submission.submitted_at).toLocaleString()}</span>
              </div>
            </div>

            {submission.marks_obtained !== null && submission.marks_obtained !== undefined && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">Marks: {submission.marks_obtained}/{totalMarks}</span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round((submission.marks_obtained / totalMarks) * 100)}%)
                  </span>
                </div>
                {submission.teacher_remarks && (
                  <div>
                    <Label className="text-xs">Feedback</Label>
                    <p className="text-sm text-muted-foreground">{submission.teacher_remarks}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex sm:flex-col gap-2">
            <Button
              variant={submission.marks_obtained !== null && submission.marks_obtained !== undefined ? "outline" : "default"}
              size="sm"
              onClick={() => onGrade(submission)}
            >
              {submission.marks_obtained !== null && submission.marks_obtained !== undefined ? "Re-grade" : "Grade"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
