"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Building2,
  Briefcase,
  Calendar,
  Link2,
  Clock,
  Lock,
  Wand2,
  CheckCircle2,
  Search,
  FileText,
  Edit3,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobApplication {
  id: number;
  publicId: string;
  companyName: string;
  role: string;
  jobLink: string | null;
  status: string;
  appliedDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getStatusConfig(status: string): {
  label: string;
  dotClass: string;
} {
  switch (status) {
    case "INTERVIEWING":
      return {
        label: "INTERVIEWING",
        dotClass: "bg-blue-500",
      };
    case "APPLIED":
      return {
        label: "APPLIED",
        dotClass: "bg-orange-500",
      };
    case "OFFER":
      return {
        label: "OFFER",
        dotClass: "bg-emerald-500",
      };
    case "REJECTED":
      return {
        label: "REJECTED",
        dotClass: "bg-destructive",
      };
    default: // DRAFT and unknown
      return {
        label: status.toUpperCase(),
        dotClass: "bg-zinc-400 dark:bg-white",
      };
  }
}

/** Formats a LocalDate ("2026-05-22") or LocalDateTime ("2026-05-22T10:30:00") string. */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateStr);
  }
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-muted/60 ${className ?? ""}`} />
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <SkeletonBlock className="h-8 w-36" />
        <div className="flex gap-3">
          <SkeletonBlock className="h-8 w-32" />
          <SkeletonBlock className="h-8 w-28" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <SkeletonBlock className="h-9 w-72" />
        <SkeletonBlock className="h-5 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <SkeletonBlock className="h-52 w-full rounded-xl" />
          <SkeletonBlock className="h-52 w-full rounded-xl" />
        </div>
        <div className="flex flex-col gap-6">
          <SkeletonBlock className="h-52 w-full rounded-xl" />
          <SkeletonBlock className="h-52 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const publicId = params.id as string;

  const [app, setApp] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  useEffect(() => {
    const token = getTokenFromCookie();
    if (!token) {
      router.push("/login");
      return;
    }

    fetch(`http://localhost:8080/api/applications/${publicId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) return res.json();
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        throw new Error("Unexpected response");
      })
      .then((data) => {
        if (data) {
          setApp(data as JobApplication);
          setNotesDraft((data as JobApplication).notes || "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [publicId, router]);

  const handleSaveNotes = async () => {
    if (!app) return;
    setIsSavingNotes(true);
    const token = getTokenFromCookie();
    
    try {
      const res = await fetch(`http://localhost:8080/api/applications/${app.publicId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...app,
          notes: notesDraft
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setApp(updated);
        setNotesDraft(updated.notes || "");
        setIsEditingNotes(false);
      } else {
        console.error("Failed to save notes");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingNotes(false);
    }
  };

  if (loading) return <LoadingState />;

  if (notFound || !app) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-28 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/60 text-4xl">
          <Search className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Application Not Found
          </h1>
          <p className="text-muted-foreground text-sm">
            This application doesn&apos;t exist or you don&apos;t have access to
            it.
          </p>
        </div>
        <Link
          href="/dashboard/applications"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Applications
        </Link>
      </div>
    );
  }

  const status = getStatusConfig(app.status);

  return (
    <div className="flex flex-col gap-8">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/dashboard/applications"
          className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Applications
        </Link>

        <div className="flex items-center gap-3">
          {/* "Application Tailor" — routes to tailor page carrying the applicationId */}
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              router.push(`/dashboard/tailor?applicationId=${app.publicId}`)
            }
          >
            <Sparkles className="h-4 w-4" />
            Application Tailor
          </Button>

          {/* "Apply Now" — opens the job link in a new tab */}
          <Button
            className="gap-2"
            disabled={!app.jobLink}
            onClick={() => app.jobLink && window.open(app.jobLink, "_blank")}
            title={
              !app.jobLink
                ? "No job link saved — edit the application to add one"
                : undefined
            }
          >
            <ExternalLink className="h-4 w-4" />
            Apply Now
          </Button>
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{app.role}</h1>
          <StatusBadge status={app.status} className="h-7 px-3 py-1 flex items-center text-sm" />
        </div>
        <p className="flex items-center gap-2 text-lg text-muted-foreground">
          <Building2 className="h-4 w-4 shrink-0" />
          {app.companyName}
        </p>
        {app.appliedDate && (
          <p className="text-sm text-muted-foreground">
            Applied on {formatDate(app.appliedDate)}
          </p>
        )}
      </div>

      {/* ── Content grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column — 2 / 3 */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* ── Quick Info card (Left column) ──────────────────────────── */}
          <Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm relative overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Quick Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6">
                <div className="flex flex-col gap-1">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Lock className="h-3 w-3 opacity-50" /> Tech Stacks
                  </dt>
                  <dd className="text-sm">
                    <div className="mt-1.5 h-2 w-20 rounded-full bg-muted/60 animate-pulse" />
                  </dd>
                </div>

                <div className="flex flex-col gap-1">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Lock className="h-3 w-3 opacity-50" /> Salary Range
                  </dt>
                  <dd className="text-sm">
                    <div className="mt-1.5 h-2 w-16 rounded-full bg-muted/60 animate-pulse" />
                  </dd>
                </div>

                <div className="flex flex-col gap-1">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Lock className="h-3 w-3 opacity-50" /> Location
                  </dt>
                  <dd className="text-sm">
                    <div className="mt-1.5 h-2 w-24 rounded-full bg-muted/60 animate-pulse" />
                  </dd>
                </div>

                <div className="flex flex-col gap-1">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Lock className="h-3 w-3 opacity-50" /> Work Type
                  </dt>
                  <dd className="text-sm">
                    <div className="mt-1.5 h-2 w-16 rounded-full bg-muted/60 animate-pulse" />
                  </dd>
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Job Link
                  </dt>
                  <dd className="text-sm">
                    {app.jobLink ? (
                      <a
                        href={app.jobLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:underline break-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link2 className="h-3.5 w-3.5 shrink-0" />
                        {app.jobLink}
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                      </a>
                    ) : (
                      <span className="italic text-muted-foreground">
                        No link saved
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* ── Job Description card ──────────────────────────────────── */}
          <Card className="rounded-xl border-dashed border-border/60 bg-muted/10 shadow-sm relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[radial-gradient(ellipse_at_50%_0%,_var(--primary),_transparent_65%)]" />

            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Wand2 className="h-4 w-4 text-muted-foreground" />
                    Job Description
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    The full job description automatically parsed from the job link.
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 text-[10px] tracking-wide uppercase font-semibold rounded-md"
                >
                  Coming Soon
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex flex-col gap-3 pb-2">
                <div className="h-3 w-full rounded-full bg-muted/60 animate-pulse" />
                <div className="h-3 w-11/12 rounded-full bg-muted/60 animate-pulse" />
                <div className="h-3 w-4/5 rounded-full bg-muted/60 animate-pulse" />
                <div className="h-3 w-full rounded-full bg-muted/60 animate-pulse" />
                <div className="h-3 w-3/4 rounded-full bg-muted/60 animate-pulse" />
              </div>
            </CardContent>
          </Card>

          {/* ── Notes card ────────────────────────────────────────────── */}
          <Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Notes
              </CardTitle>
              {!isEditingNotes && (
                <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => setIsEditingNotes(true)}>
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isEditingNotes ? (
                <div className="flex flex-col gap-3">
                  <Textarea
                    placeholder="Add your interview prep notes, contact names, or research here..."
                    className="min-h-[120px] resize-y bg-background/50 text-sm"
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNotesDraft(app.notes || "");
                        setIsEditingNotes(false);
                      }}
                      disabled={isSavingNotes}
                    >
                      <X className="h-4 w-4 mr-1.5" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveNotes} disabled={isSavingNotes}>
                      {isSavingNotes ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1.5" />
                          Save Notes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="text-sm whitespace-pre-wrap rounded-md bg-muted/20 p-4 border border-border/40 min-h-[120px]"
                  onClick={() => !app.notes && setIsEditingNotes(true)}
                  style={{ cursor: !app.notes ? "pointer" : "default" }}
                >
                  {app.notes ? (
                    app.notes
                  ) : (
                    <span className="text-muted-foreground italic">No notes yet. Click Edit to add some.</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — 1 / 3 */}
        <div className="flex flex-col gap-6">

          {/* ── Tracking Details card ─────────────────────────────────── */}
          <Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Tracking Details
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-0">
              {/* Status row */}
              <div className="flex items-center gap-3 py-3">
                <div
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${status.dotClass}`}
                />
                <div className="flex flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Status
                  </span>
                  <span className="text-sm font-medium">{status.label}</span>
                </div>
              </div>
              <div className="border-t border-border/40" />

              {/* Date Applied */}
              <div className="flex items-center gap-3 py-3">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                <div className="flex flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Date Applied
                  </span>
                  <span className="text-sm font-medium">
                    {formatDate(app.appliedDate)}
                  </span>
                </div>
              </div>
              <div className="border-t border-border/40" />

              {/* Added to tracker */}
              <div className="flex items-center gap-3 py-3">
                <Clock className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                <div className="flex flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Added to tracker
                  </span>
                  <span className="text-sm font-medium">
                    {formatDate(app.createdAt)}
                  </span>
                </div>
              </div>
              <div className="border-t border-border/40" />

              {/* Last updated */}
              <div className="flex items-center gap-3 py-3">
                <Clock className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                <div className="flex flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Last updated
                  </span>
                  <span className="text-sm font-medium">
                    {formatDate(app.updatedAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Activity timeline card ────────────────────────────────── */}
          <Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Activity
              </CardTitle>
              <CardDescription className="text-xs">
                History of changes to this application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                {/* Event — Application created */}
                <div className="relative flex gap-4 pb-5">
                  <div className="flex flex-col items-center">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    </div>
                    {/* Connector line */}
                    <div className="mt-1 w-px flex-1 bg-border/50" />
                  </div>
                  <div className="flex flex-col gap-0.5 pt-1">
                    <p className="text-sm font-medium">Application created</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(app.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Placeholder — future events */}
                <div className="relative flex gap-4 opacity-35">
                  <div className="flex flex-col items-center">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-border/70">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 pt-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      More events coming
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      Status changes, resume tailored…
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
