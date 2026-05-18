"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";

const mockApplications = [
  { id: 1, company: "Google", role: "Software Engineer", status: "INTERVIEWING", date: "2026-05-15" },
  { id: 2, company: "Vercel", role: "Frontend Developer", status: "APPLIED", date: "2026-05-16" },
  { id: 3, company: "Netflix", role: "Senior Backend Engineer", status: "REJECTED", date: "2026-05-10" },
  { id: 4, company: "Stripe", role: "Full Stack Engineer", status: "OFFER", date: "2026-05-18" },
];

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

export default function ApplicationsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground">Manage and track your job applications.</p>
        </div>
        <Button className="shrink-0 rounded-md">
          <Plus className="mr-2 h-4 w-4" />
          Add Application
        </Button>
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
          <div className="rounded-md border border-border/50 bg-background/50">
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
                {mockApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.company}</TableCell>
                    <TableCell>{app.role}</TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{app.date}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
