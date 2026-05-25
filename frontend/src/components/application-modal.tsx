"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApplicationFormData {
  companyName: string;
  role: string;
  status: string;
  appliedDate: string | null;
  jobLink: string;
}

interface ApplicationModalProps {
  /** Controls open/close state */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * When provided the modal runs in Edit mode (PUT /{publicId}).
   * When omitted it runs in Add mode (POST).
   */
  initialData?: {
    publicId: string;
    companyName: string;
    role: string;
    status: string;
    appliedDate: string | null;
    jobLink: string | null;
    notes: string | null;
  };
  /** Called after a successful save with the latest application data returned by the API. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSaved?: (saved: any) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ApplicationModal({
  open,
  onOpenChange,
  initialData,
  onSaved,
}: ApplicationModalProps) {
  const isEditMode = Boolean(initialData);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [appliedDate, setAppliedDate] = useState("");
  const [jobLink, setJobLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Populate / reset fields whenever the modal opens or initial data changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setCompanyName(initialData.companyName);
        setRole(initialData.role);
        setStatus(initialData.status);
        setAppliedDate(initialData.appliedDate ?? "");
        setJobLink(initialData.jobLink ?? "");
      } else {
        setCompanyName("");
        setRole("");
        setStatus("DRAFT");
        setAppliedDate("");
        setJobLink("");
      }
    }
  }, [open, initialData]);

  // ── Submit handler ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getTokenFromCookie();
    if (!token) return;

    const payload = {
      companyName,
      role,
      status,
      appliedDate: status === "DRAFT" ? null : (appliedDate || null),
      jobLink: jobLink || null,
      // Preserve notes when editing so we don't overwrite them
      ...(isEditMode && initialData ? { notes: initialData.notes } : {}),
    };

    setIsSaving(true);
    try {
      const url = isEditMode
        ? `http://localhost:8080/api/applications/${initialData!.publicId}`
        : "http://localhost:8080/api/applications";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const saved = await res.json();
        onOpenChange(false);
        onSaved?.(saved);
      } else {
        console.error("Failed to save application", res.status);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Application" : "Add New Application"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the details for this job application."
              : "Track a new job you're applying to."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {/* Company */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="modal-company" className="text-right">
              Company
            </Label>
            <Input
              id="modal-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="col-span-3"
              required
            />
          </div>

          {/* Role */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="modal-role" className="text-right">
              Role
            </Label>
            <Input
              id="modal-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="col-span-3"
              required
            />
          </div>

          {/* Status */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="modal-status" className="text-right">
              Status
            </Label>
            <div className="col-span-3">
              <Select
                value={status}
                onValueChange={(v) => {
                  const next = v ?? "DRAFT";
                  setStatus(next);
                  if (next === "DRAFT") setAppliedDate("");
                }}
              >
                <SelectTrigger id="modal-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="APPLIED">Applied</SelectItem>
                  <SelectItem value="INTERVIEWING">Interviewing</SelectItem>
                  <SelectItem value="OFFER">Offer</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Applied */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label
              htmlFor="modal-date"
              className={`text-right transition-opacity ${
                status === "DRAFT" ? "opacity-40" : ""
              }`}
            >
              Date
            </Label>
            <Input
              id="modal-date"
              type="date"
              value={status === "DRAFT" ? "" : appliedDate}
              onChange={(e) => setAppliedDate(e.target.value)}
              disabled={status === "DRAFT"}
              className="col-span-3"
            />
          </div>

          {/* Job Link */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="modal-link" className="text-right">
              Link
            </Label>
            <Input
              id="modal-link"
              type="url"
              placeholder="https://..."
              value={jobLink}
              onChange={(e) => setJobLink(e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : isEditMode ? (
                "Save Changes"
              ) : (
                "Add Application"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
