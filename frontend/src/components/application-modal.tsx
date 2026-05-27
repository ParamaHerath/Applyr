"use client";

import { useState, useEffect } from "react";
import { Loader2, Wand2, Link as LinkIcon, ArrowLeft, AlertCircle, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  jobDescription: string | null;
  salaryRange: string | null;
  location: string | null;
  workType: string | null;
  techStacks: string | null;
}

interface ApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    publicId: string;
    companyName: string;
    role: string;
    status: string;
    appliedDate: string | null;
    jobLink: string | null;
    notes: string | null;
    jobDescription: string | null;
    salaryRange: string | null;
    location: string | null;
    workType: string | null;
    techStacks: string | null;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSaved?: (saved: any) => void;
  /** Pre-parsed data from the Chrome extension handoff. */
  extensionData?: Record<string, string>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "APPLIED":
      return "Applied";
    case "INTERVIEWING":
      return "Interviewing";
    case "OFFER":
      return "Offer";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ApplicationModal({
  open,
  onOpenChange,
  initialData,
  onSaved,
  extensionData,
}: ApplicationModalProps) {
  const isEditMode = Boolean(initialData);

  // ── Wizard State ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);
  const [didParse, setDidParse] = useState(false);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [jobLink, setJobLink] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [appliedDate, setAppliedDate] = useState("");
  const [location, setLocation] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [workType, setWorkType] = useState("");
  const [techStacks, setTechStacks] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Populate / reset fields whenever the modal opens or initial data changes
  useEffect(() => {
    if (open) {
      setDidParse(false);
      setParseError(null);
      if (initialData) {
        setJobLink(initialData.jobLink ?? "");
        setCompanyName(initialData.companyName);
        setRole(initialData.role);
        setStatus(initialData.status);
        setAppliedDate(initialData.appliedDate ?? "");
        setLocation(initialData.location ?? "");
        setSalaryRange(initialData.salaryRange ?? "");
        setWorkType(initialData.workType ?? "");
        setTechStacks(initialData.techStacks ?? "");
        setJobDescription(initialData.jobDescription ?? "");
        setStep(2); // Edit mode skips Step 1
      } else if (extensionData) {
        // Pre-fill from Chrome extension data
        setJobLink(extensionData.jobUrl ?? "");
        setCompanyName(extensionData.company ?? "");
        setRole(extensionData.title ?? "");
        setLocation(extensionData.location ?? "");
        setSalaryRange(extensionData.salary ?? "");
        setWorkType(extensionData.workType ?? "");
        setTechStacks(extensionData.techStacks ?? "");
        setJobDescription(extensionData.description ?? "");
        setStatus("DRAFT");
        setAppliedDate("");
        setDidParse(true);
        setStep(2); // Skip Step 1, go straight to review
      } else {
        setJobLink("");
        setCompanyName("");
        setRole("");
        setStatus("DRAFT");
        setAppliedDate("");
        setLocation("");
        setSalaryRange("");
        setWorkType("");
        setTechStacks("");
        setJobDescription("");
        setStep(1); // Add mode starts at Step 1
      }
    }
  }, [open, initialData, extensionData]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleParse = async () => {
    if (!jobLink) return;
    setIsParsing(true);
    setParseError(null);

    const token = getTokenFromCookie();
    if (!token) {
      setParseError("You must be logged in to parse job URLs.");
      setIsParsing(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:8080/api/parser/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: jobLink }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message =
          errorData?.message ||
          "We couldn't parse this URL. Please enter the details manually.";
        setParseError(message);
        setIsParsing(false);
        return;
      }

      const data = await res.json();

      // Map parsed fields to form state
      if (data.company) setCompanyName(data.company);
      if (data.title) setRole(data.title);
      if (data.location) setLocation(data.location);
      if (data.salary) setSalaryRange(data.salary);
      if (data.workType) setWorkType(data.workType);
      if (data.techStacks) setTechStacks(data.techStacks);
      if (data.description) setJobDescription(data.description);

      setDidParse(true);
      setStep(2);
    } catch (err) {
      console.error("Parse error:", err);
      setParseError(
        "Could not connect to the server. Please check that the backend is running."
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      // Prevent accidental submission in Step 1
      return;
    }

    const token = getTokenFromCookie();
    if (!token) return;

    const payload = {
      jobLink: jobLink || null,
      companyName,
      role,
      status,
      appliedDate: status === "DRAFT" ? null : (appliedDate || null),
      location: location || null,
      salaryRange: salaryRange || null,
      workType: workType || null,
      techStacks: techStacks || null,
      jobDescription: jobDescription || null,
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? "Edit Application"
              : step === 1
              ? "Add New Application"
              : didParse
              ? "Verify Job Details"
              : "Enter Job Details"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the details for this job application."
              : step === 1
              ? "Automatically pre-fill details from a job posting link, or enter them manually."
              : didParse
              ? "Review and refine the job details before saving."
              : "Manually fill in the details of the job application."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          /* ── STEP 1: Link & Parse ── */
          <div className="flex flex-col gap-6 py-4">
            {/* ── Extension Promotion ── */}
            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <Puzzle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Use the Applyr Chrome Extension
                </p>
                <p className="text-xs text-muted-foreground">
                  Works on LinkedIn, Indeed, Glassdoor &amp; every other job board. Install the extension, visit any job posting, and click to auto-fill.
                </p>
              </div>
            </div>

            {/* ── Divider with "or" ── */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-border/50" />
              <span className="text-xs text-muted-foreground font-medium">or paste a link</span>
              <div className="flex-1 border-t border-border/50" />
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-5 relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_50%_0%,_var(--primary),_transparent_70%)]" />
              <Label htmlFor="modal-link" className="font-semibold text-primary">
                Auto-fill from Job Link
              </Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="modal-link"
                  type="url"
                  placeholder="https://..."
                  value={jobLink}
                  onChange={(e) => setJobLink(e.target.value)}
                  className="pl-9 bg-background/50 text-base"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (jobLink && !isParsing) {
                        handleParse();
                      }
                    }
                  }}
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Works best with Greenhouse, Lever, Workable &amp; other ATS platforms. For LinkedIn or Indeed, use the Chrome Extension above.
              </p>
              {parseError && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>{parseError}</p>
                </div>
              )}
            </div>

            {/* Step 1 Actions */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isParsing}
                className="order-3 sm:order-1"
              >
                Cancel
              </Button>
              
              <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2 ml-auto w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDidParse(false);
                    setStep(2);
                  }}
                  disabled={isParsing}
                  className="w-full sm:w-auto"
                >
                  Fill Manually
                </Button>
                <Button
                  type="button"
                  onClick={handleParse}
                  disabled={!jobLink || isParsing}
                  className="gap-2 w-full sm:w-auto min-w-[140px]"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Parse Link
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ── STEP 2: Review & Edit Form ── */
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-2">
            
            {/* ── Manual Fields Section ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Row 1 */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="modal-company">Company <span className="text-destructive">*</span></Label>
                <Input
                  id="modal-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="modal-role">Role <span className="text-destructive">*</span></Label>
                <Input
                  id="modal-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="modal-salary">Salary Range</Label>
                <Input
                  id="modal-salary"
                  placeholder="e.g. $120k - $150k"
                  value={salaryRange || ""}
                  onChange={(e) => setSalaryRange(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="modal-tech">Tech Stacks</Label>
                <Input
                  id="modal-tech"
                  placeholder="e.g. React, Node.js, AWS"
                  value={techStacks || ""}
                  onChange={(e) => setTechStacks(e.target.value)}
                />
              </div>

              {/* Row 2 */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="modal-location">Location</Label>
                <Input
                  id="modal-location"
                  placeholder="e.g. San Francisco, CA"
                  value={location || ""}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="modal-work-type">Work Type</Label>
                <Select
                  value={workType || ""}
                  onValueChange={(v) => setWorkType(v || "")}
                >
                  <SelectTrigger id="modal-work-type" className="w-full">
                    <span className="flex flex-1 text-left text-sm">
                      {workType || "Select type"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                    <SelectItem value="On-site">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="modal-status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => {
                    const next = v ?? "DRAFT";
                    setStatus(next);
                    if (next === "DRAFT") setAppliedDate("");
                  }}
                >
                  <SelectTrigger id="modal-status" className="w-full">
                    <span className="flex flex-1 text-left text-sm">
                      {getStatusLabel(status)}
                    </span>
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
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="modal-date"
                  className={`transition-opacity ${
                    status === "DRAFT" ? "opacity-40" : ""
                  }`}
                >
                  Date Applied
                </Label>
                <Input
                  id="modal-date"
                  type="date"
                  value={status === "DRAFT" ? "" : (appliedDate || "")}
                  onChange={(e) => setAppliedDate(e.target.value)}
                  disabled={status === "DRAFT"}
                />
              </div>
            </div>

            {/* Job URL (full width) */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="modal-job-url">Job URL</Label>
              <Input
                id="modal-job-url"
                type="url"
                placeholder="https://..."
                value={jobLink}
                onChange={(e) => setJobLink(e.target.value)}
              />
            </div>

            {/* Job Description (full width) */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="modal-description">Job Description</Label>
              <Textarea
                id="modal-description"
                placeholder="Paste the full job description here..."
                className="min-h-[120px] resize-y"
                value={jobDescription || ""}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>

            {/* Step 2 Actions */}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
              {isEditMode ? (
                <>
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
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={isSaving}
                    className="gap-1.5 mr-auto"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
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
                    ) : (
                      "Save Application"
                    )}
                  </Button>
                </>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
