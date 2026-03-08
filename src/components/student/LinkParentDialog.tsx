import { useState, useEffect, useCallback } from "react";
import { Search, Users, Link2, LinkIcon, Loader2, Unlink, UserCheck, Phone, Mail, AlertCircle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getParentUsers, linkParent, unlinkParent, type ParentUser } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Student } from "@/types";

interface LinkParentDialogProps {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LinkParentDialog({ student, open, onOpenChange, onSuccess }: LinkParentDialogProps) {
  const { isRole, user } = useAuth();
  const { toast } = useToast();

  const isSuperAdmin = isRole("super_admin");

  const [search, setSearch] = useState("");
  const [parents, setParents] = useState<ParentUser[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [selectedParent, setSelectedParent] = useState<ParentUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const isLinked = !!student.parent_id;

  const fetchParents = useCallback(async (q: string) => {
    setLoadingParents(true);
    setSearchError(null);
    try {
      const params: Record<string, string> = {};
      if (q) params.search = q;
      if (isSuperAdmin && student.institute_id) params.institute_id = student.institute_id;

      const res = await getParentUsers(params);
      if (res.success && res.data) {
        setParents((res.data as { parents: ParentUser[] }).parents || []);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Failed to load parents");
    } finally {
      setLoadingParents(false);
    }
  }, [isSuperAdmin, student.institute_id]);

  // Load parents when dialog opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedParent(null);
      fetchParents("");
    }
  }, [open, fetchParents]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => fetchParents(search), 350);
    return () => clearTimeout(t);
  }, [search, open, fetchParents]);

  const handleLink = async () => {
    if (!selectedParent) return;
    setSaving(true);
    try {
      const instId = isSuperAdmin ? student.institute_id : undefined;
      await linkParent(student.id, selectedParent.id, instId);
      toast({
        title: "Parent linked",
        description: `${selectedParent.name} is now linked to ${student.name}.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Failed to link parent",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      const instId = isSuperAdmin ? student.institute_id : undefined;
      await unlinkParent(student.id, instId);
      toast({
        title: "Parent unlinked",
        description: `${student.parent_name ?? "Parent"} has been removed from ${student.name}.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Failed to unlink parent",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Link Parent to {student.name}
          </DialogTitle>
          <DialogDescription>
            Assign an existing parent account to this student, or unlink the current one.
          </DialogDescription>
        </DialogHeader>

        {/* Current parent banner */}
        {isLinked && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Currently linked</span>
              <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 border-0">
                <UserCheck className="h-3 w-3 mr-1" /> Linked
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {(student.parent_name ?? "P").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{student.parent_name ?? "—"}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {student.parent_email && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 shrink-0" /> {student.parent_email}
                    </span>
                  )}
                  {student.parent_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" /> {student.parent_phone}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                onClick={handleUnlink}
                disabled={unlinking}
              >
                {unlinking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unlink className="h-3.5 w-3.5 mr-1" />
                )}
                Unlink
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            {isLinked ? "Reassign to a different parent:" : "Search for a parent account:"}
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {searchError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {searchError}
            </div>
          )}

          <ScrollArea className="h-52 rounded-lg border bg-muted/20">
            {loadingParents ? (
              <div className="flex items-center justify-center h-full py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : parents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 gap-2 text-center px-4">
                <Users className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {search ? "No parents match your search." : "No parent accounts found in this institute."}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Parent accounts are created when adding a student with a parent email.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {parents.map((parent) => {
                  const isCurrentParent = parent.id === student.parent_id;
                  const isSelected = selectedParent?.id === parent.id;
                  return (
                    <button
                      key={parent.id}
                      type="button"
                      onClick={() => setSelectedParent(isSelected ? null : parent)}
                      disabled={isCurrentParent}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                        "hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed",
                        isSelected && "bg-primary/10 ring-1 ring-inset ring-primary/30"
                      )}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback
                          className={cn(
                            "text-xs font-bold",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {parent.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{parent.name}</span>
                          {isCurrentParent && (
                            <Badge className="text-[10px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 border-0">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{parent.email}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {parent.linked_children ?? 0}{" "}
                        {Number(parent.linked_children) === 1 ? "child" : "children"}
                      </span>
                      {isSelected && (
                        <Link2 className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || unlinking}>
            Cancel
          </Button>
          <Button onClick={handleLink} disabled={!selectedParent || saving || unlinking}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLinked ? "Reassign Parent" : "Link Parent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
