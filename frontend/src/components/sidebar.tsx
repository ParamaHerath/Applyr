"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  LayoutDashboard,
  ListTodo,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

const sidebarLinks = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Applications", href: "/dashboard/applications", icon: ListTodo },
  { name: "Settings", href: "/settings", icon: Settings },
];

/** Returns up to 2 initials from a display name, e.g. "Jane Doe" → "JD" */
function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isProfileActive = pathname === "/dashboard/profile";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-border bg-background sm:flex">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-border/40">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold tracking-tight text-xl"
        >
          <Briefcase className="h-6 w-6 text-primary" />
          <span>Applyr</span>
        </Link>
      </div>

      <div className="flex flex-1 flex-col justify-between py-4 overflow-hidden">
        {/* Main nav */}
        <nav className="grid gap-1 px-3 text-sm font-medium">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section: profile card + logout */}
        <div className="px-3 flex flex-col gap-1">
          {/* Profile card — acts as nav link to /dashboard/profile */}
          <Link
            href="/dashboard/profile"
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all",
              isProfileActive
                ? "bg-primary/10"
                : "hover:bg-muted"
            )}
          >
            {/* Avatar circle */}
            <div
              className={cn(
                "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold tracking-wide transition-all",
                isProfileActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/15 text-primary group-hover:bg-primary/25"
              )}
            >
              {user?.name ? getInitials(user.name) : "?"}
            </div>

            {/* Name + email */}
            <div className="flex flex-1 flex-col min-w-0">
              <span
                className={cn(
                  "text-sm font-medium truncate leading-tight transition-colors",
                  isProfileActive
                    ? "text-primary"
                    : "text-foreground group-hover:text-primary"
                )}
              >
                {user?.name ?? "Your Profile"}
              </span>
              <span className="text-xs text-muted-foreground truncate leading-tight">
                {user?.email ?? ""}
              </span>
            </div>

            {/* Chevron hint */}
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 transition-all",
                isProfileActive
                  ? "text-primary"
                  : "text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5"
              )}
            />
          </Link>

          {/* Divider */}
          <div className="my-1 border-t border-border/60" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
