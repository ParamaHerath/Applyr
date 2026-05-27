"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ChevronRight, ExternalLink, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { ApplicationModal } from "@/components/application-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface JobApplication {
  id: number;
  publicId: string;
  companyName: string;
  role: string;
  jobLink: string | null;
  status: string;
  appliedDate: string | null;
  notes: string | null;
  jobDescription: string | null;
  salaryRange: string | null;
  location: string | null;
  workType: string | null;
  techStacks: string | null;
  createdAt: string;
}

function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

function getStatusFilterLabel(status: string): string {
  switch (status) {
    case "ALL":
      return "All Statuses";
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

function getSortByLabel(sort: string): string {
  switch (sort) {
    case "ADDED_DESC":
      return "Date Added (Newest)";
    case "ADDED_ASC":
      return "Date Added (Oldest)";
    case "APPLIED_DESC":
      return "Date Applied (Newest)";
    case "APPLIED_ASC":
      return "Date Applied (Oldest)";
    default:
      return sort;
  }
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("ADDED_DESC");

  // ── Extension handoff: detect ?action=new-parsed&data=... ──────────────
  const searchParams = useSearchParams();
  const [extensionData, setExtensionData] = useState<Record<string, string> | undefined>(undefined);

  const fetchApplications = useCallback(async () => {
    const token = getTokenFromCookie();
    if (!token) return router.push("/login");

    try {
      const res = await fetch("http://localhost:8080/api/applications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setApplications(await res.json());
      } else if (res.status === 401) {
        router.push("/login");
      }
    } catch (err) {
      console.error(err);
    }
  }, [router]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Detect extension handoff on mount
  useEffect(() => {
    const action = searchParams.get("action");
    const dataParam = searchParams.get("data");

    if (action === "new-parsed" && dataParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam));
        setExtensionData(parsed);
        setIsModalOpen(true);

        // Clean the URL to prevent re-triggering on refresh
        const url = new URL(window.location.href);
        url.searchParams.delete("action");
        url.searchParams.delete("data");
        window.history.replaceState({}, "", url.pathname);
      } catch (err) {
        console.error("Failed to parse extension data:", err);
      }
    }
  }, [searchParams]);

  const handleDelete = async (id: number) => {
    const token = getTokenFromCookie();
    if (!confirm("Are you sure you want to delete this application?")) return;
    try {
      const res = await fetch(`http://localhost:8080/api/applications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchApplications();
      }
    } catch (err) {
      console.error("Failed to delete application", err);
    }
  };

  const filteredApps = applications
    .filter((app) => {
      const matchesSearch =
        (app.companyName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.role || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus =
        statusFilter === "ALL" || app.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "ADDED_DESC") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "ADDED_ASC") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "APPLIED_DESC") {
        if (!a.appliedDate) return 1;
        if (!b.appliedDate) return -1;
        return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
      }
      if (sortBy === "APPLIED_ASC") {
        if (!a.appliedDate) return 1;
        if (!b.appliedDate) return -1;
        return new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime();
      }
      return 0;
    });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground">Manage and track your job applications.</p>
        </div>

        <Button className="shrink-0 rounded-md" onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Application
        </Button>
      </div>

      {/* ── Add/Edit Application Modal ─────────────────────────────────────── */}
      <ApplicationModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingApp(undefined);
        }}
        initialData={editingApp ? {
          publicId: editingApp.publicId,
          companyName: editingApp.companyName,
          role: editingApp.role,
          status: editingApp.status,
          appliedDate: editingApp.appliedDate,
          jobLink: editingApp.jobLink,
          notes: editingApp.notes,
          jobDescription: editingApp.jobDescription,
          salaryRange: editingApp.salaryRange,
          location: editingApp.location,
          workType: editingApp.workType,
          techStacks: editingApp.techStacks,
        } : undefined}
        onSaved={() => fetchApplications()}
        extensionData={extensionData}
      />

      <Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle>All Applications</CardTitle>
              <CardDescription>A list of all your recent job applications.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <div className="w-full sm:w-44">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "ALL")}>
                  <SelectTrigger className="w-full">
                    <span className="flex flex-1 text-left text-sm">
                      {getStatusFilterLabel(statusFilter)}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="APPLIED">Applied</SelectItem>
                    <SelectItem value="INTERVIEWING">Interviewing</SelectItem>
                    <SelectItem value="OFFER">Offer</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-48">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v || "ADDED_DESC")}>
                  <SelectTrigger className="w-full">
                    <span className="flex flex-1 text-left text-sm">
                      {getSortByLabel(sortBy)}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADDED_DESC">Date Added (Newest)</SelectItem>
                    <SelectItem value="ADDED_ASC">Date Added (Oldest)</SelectItem>
                    <SelectItem value="APPLIED_DESC">Date Applied (Newest)</SelectItem>
                    <SelectItem value="APPLIED_ASC">Date Applied (Oldest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-64">
                <Input
                  placeholder="Search companies or roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 bg-background/50 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[240px]">Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[150px]">Date Added</TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                  <TableHead className="w-[150px]">Date Applied</TableHead>
                  <TableHead className="w-[125px] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No applications found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApps.map((app) => (
                    <TableRow
                      key={app.id}
                      className="group cursor-pointer"
                      onClick={() => router.push(`/dashboard/applications/${app.publicId}`)}
                    >
                      <TableCell className="font-medium">{app.companyName}</TableCell>
                      <TableCell>{app.role}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(app.createdAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {app.status === "DRAFT" ? "—" : formatDate(app.appliedDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {app.jobLink && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(app.jobLink!, "_blank");
                                }}
                                title="Open job link"
                                className="text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingApp(app);
                                setIsModalOpen(true);
                              }}
                              title="Edit application"
                              className="text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(app.id);
                              }}
                              title="Delete application"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive-foreground cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
