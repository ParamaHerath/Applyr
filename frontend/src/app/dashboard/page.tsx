"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Send, CheckCircle, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/context/auth-context";

interface JobApplication {
  id: number;
  companyName: string;
  role: string;
  jobLink: string;
  status: string;
  appliedDate: string;
}

function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function DashboardHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);

  useEffect(() => {
    const token = getTokenFromCookie();
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchApplications = async () => {
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
    fetchApplications();
  }, [router]);

  const stats = {
    total: applications.length,
    interviewing: applications.filter(a => a.status === "INTERVIEWING").length,
    offers: applications.filter(a => a.status === "OFFER").length,
    rejected: applications.filter(a => a.status === "REJECTED").length,
  };

  const recentApplications = applications.slice(0, 3); // top 3

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.name || "User"}! Here&apos;s an overview of your job search.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interviewing</CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.interviewing}</div>
            <p className="text-xs text-muted-foreground">Active processes</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offers</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.offers}</div>
            <p className="text-xs text-muted-foreground">Keep it up!</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Don&apos;t give up.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Your latest job tracking entries.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border/50 bg-background/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[200px]">Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentApplications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No applications found. Go add some!
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">{app.companyName}</TableCell>
                        <TableCell>{app.role}</TableCell>
                        <TableCell><StatusBadge status={app.status} /></TableCell>
                        <TableCell className="text-muted-foreground">{app.appliedDate || "N/A"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
