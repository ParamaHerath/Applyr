"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface JobApplication {
  id: number;
  companyName: string;
  role: string;
  jobLink: string;
  status: string;
  appliedDate: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "INTERVIEWING":
      return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20">Interviewing</Badge>;
    case "APPLIED":
      return <Badge className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20">Applied</Badge>;
    case "OFFER":
      return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20">Offer</Badge>;
    case "REJECTED":
      return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [appliedDate, setAppliedDate] = useState("");
  const [jobLink, setJobLink] = useState("");

  const fetchApplications = async () => {
    const token = getTokenFromCookie();
    if (!token) return router.push("/login");

    try {
      const res = await fetch("http://localhost:8080/api/applications", {
        headers: { "Authorization": `Bearer ${token}` }
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getTokenFromCookie();

    const payload = { companyName, role, status, appliedDate: appliedDate || null, jobLink };

    try {
      const res = await fetch("http://localhost:8080/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsDialogOpen(false);
        setCompanyName("");
        setRole("");
        setStatus("DRAFT");
        setAppliedDate("");
        setJobLink("");
        fetchApplications();
      }
    } catch (err) {
      console.error("Failed to add application", err);
    }
  };

  const handleDelete = async (id: number) => {
    const token = getTokenFromCookie();
    if (!confirm("Are you sure you want to delete this application?")) return;
    try {
      const res = await fetch(`http://localhost:8080/api/applications/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchApplications();
      }
    } catch (err) {
      console.error("Failed to delete application", err);
    }
  };

  const filteredApps = applications.filter(app => 
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
        
        <Button className="shrink-0 rounded-md" onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Application
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Application</DialogTitle>
              <DialogDescription>
                Track a new job you applied to.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddApplication} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="companyName" className="text-right">Company</Label>
                <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <Input id="role" value={role} onChange={e => setRole(e.target.value)} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">Status</Label>
                <div className="col-span-3">
                  <Select value={status} onValueChange={(v) => setStatus(v ?? "DRAFT")}>
                    <SelectTrigger>
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">Date</Label>
                <Input id="date" type="date" value={appliedDate} onChange={e => setAppliedDate(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="link" className="text-right">Link</Label>
                <Input id="link" type="url" placeholder="https://..." value={jobLink} onChange={e => setJobLink(e.target.value)} className="col-span-3" />
              </div>
              <div className="flex justify-end mt-4">
                <Button type="submit">Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>

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
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.companyName}</TableCell>
                      <TableCell>{app.role}</TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{app.appliedDate || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(app.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
