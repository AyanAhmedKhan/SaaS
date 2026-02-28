import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createAssignment, updateAssignment } from "@/lib/api";
import type { Assignment, Class, Subject } from "@/types";
import { Loader2 } from "lucide-react";

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment | null;
  classes: Class[];
  subjects: Subject[];
  onSuccess: () => void;
}

export function AssignmentDialog({
  open,
  onOpenChange,
  assignment,
  classes,
  subjects,
  onSuccess,
}: AssignmentDialogProps) {
  console.log('[AssignmentDialog] Rendered with open:', open);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructions: "",
    class_id: "",
    subject_id: "",
    due_date: "",
    total_marks: "100",
    attachment_url: "",
    status: "draft",
    allow_late_submission: true,
  });

  useEffect(() => {
    if (assignment) {
      setFormData({
        title: assignment.title || "",
        description: assignment.description || "",
        instructions: assignment.instructions || "",
        class_id: assignment.class_id || "",
        subject_id: assignment.subject_id || "",
        due_date: assignment.due_date ? assignment.due_date.split('T')[0] : "",
        total_marks: String(assignment.total_marks || 100),
        attachment_url: assignment.attachment_url || "",
        status: assignment.status || "draft",
        allow_late_submission: assignment.allow_late_submission ?? true,
      });
    } else {
      setFormData({
        title: "",
        description: "",
        instructions: "",
        class_id: "",
        subject_id: "",
        due_date: "",
        total_marks: "100",
        attachment_url: "",
        status: "draft",
        allow_late_submission: true,
      });
    }
  }, [assignment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        total_marks: parseInt(formData.total_marks),
        status: formData.status as "draft" | "published" | "closed",
      };

      if (assignment) {
        await updateAssignment(assignment.id, payload);
      } else {
        await createAssignment(payload);
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{assignment ? "Edit Assignment" : "Create Assignment"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Assignment title"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="class_id">Class *</Label>
              <Select
                value={formData.class_id}
                onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} {cls.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject_id">Subject</Label>
              <Select
                value={formData.subject_id}
                onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {subjects.map(sub => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the assignment"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Detailed instructions for students"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_marks">Total Marks *</Label>
              <Input
                id="total_marks"
                type="number"
                value={formData.total_marks}
                onChange={(e) => setFormData({ ...formData, total_marks: e.target.value })}
                min="1"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachment_url">Attachment URL</Label>
            <Input
              id="attachment_url"
              value={formData.attachment_url}
              onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
              placeholder="https://example.com/file.pdf"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allow_late">Allow Late Submission</Label>
              <div className="flex items-center h-10">
                <Switch
                  id="allow_late"
                  checked={formData.allow_late_submission}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, allow_late_submission: checked })
                  }
                />
                <span className="ml-2 text-sm text-muted-foreground">
                  {formData.allow_late_submission ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {assignment ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
