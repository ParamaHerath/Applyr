"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { ApplicationModal } from "@/components/application-modal";

interface JobApplication {
  id: number;
  publicId: string;
  companyName: string;
  role: string;
  jobLink: string;
  status: string;
  appliedDate: string;
  jobDescription: string | null;
  salaryRange: string | null;
  location: string | null;
  workType: string | null;
  techStacks: string | null;
}

function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchApplications = async () => {
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
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const filteredApps = applications.filter(
    (app) =>
      (app.companyName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.role || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* ── Add Application Modal ─────────────────────────────────────────── */}
      <ApplicationModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSaved={() => fetchApplications()}
      />

      <Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle>All Applications</CardTitle>
              <CardDescription>A list of all your recent job applications.</CardDescription>
            </div>
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 bg-background/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[200px]">Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Applied</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No applications found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApps.map((app) => (
                    <TableRow
                      key={app.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/dashboard/applications/${app.publicId}`)}
                    >
                      <TableCell className="font-medium">{app.companyName}</TableCell>
                      <TableCell>{app.role}</TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {app.appliedDate || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(app.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
