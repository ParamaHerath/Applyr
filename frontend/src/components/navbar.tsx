"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { setTheme, theme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Briefcase className="h-6 w-6" />
          <span className="font-bold tracking-tight text-xl">Applyr</span>
        </Link>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/login" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Log in
            </Link>
            <Button asChild size="sm" className="rounded-md">
              <Link href="/register">Get Started</Link>
            </Button>
          </nav>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
