"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Loader2, KeyRound, UserRound } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

type AlertState = { type: "success" | "error"; message: string } | null;

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  // Profile fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI states
  const [profileAlert, setProfileAlert] = useState<AlertState>(null);
  const [passwordAlert, setPasswordAlert] = useState<AlertState>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Seed form from auth context
  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
    }
  }, [user]);

  // ── Save profile (name) ───────────────────────────────────────────────────

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileAlert(null);

    const token = getTokenFromCookie();
    if (!token) { router.push("/login"); return; }

    try {
      const res = await fetch("http://localhost:8080/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const data = await res.json();
        updateUser({ name: data.name });
        setProfileAlert({ type: "success", message: "Profile updated successfully." });
      } else {
        const text = await res.text();
        setProfileAlert({ type: "error", message: text || "Failed to update profile." });
      }
    } catch {
      setProfileAlert({ type: "error", message: "Network error. Is the backend running?" });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordAlert(null);

    if (newPassword !== confirmPassword) {
      setPasswordAlert({ type: "error", message: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordAlert({ type: "error", message: "Password must be at least 8 characters." });
      return;
    }

    setSavingPassword(true);
    const token = getTokenFromCookie();
    if (!token) { router.push("/login"); return; }

    try {
      const res = await fetch("http://localhost:8080/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        setPasswordAlert({ type: "success", message: "Password changed successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const text = await res.text();
        setPasswordAlert({ type: "error", message: text || "Failed to change password." });
      }
    } catch {
      setPasswordAlert({ type: "error", message: "Network error. Is the backend running?" });
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex w-full flex-col gap-8">
      {/* Page header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and account security.
        </p>
      </div>

      {/* Avatar + name hero */}
      <div className="flex w-full items-center gap-5 p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-2xl font-bold tracking-wide select-none ring-4 ring-primary/10">
          {name ? getInitials(name) : "?"}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-xl font-semibold truncate">{name || "—"}</p>
          <p className="text-sm text-muted-foreground truncate">{email}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* ── Edit profile card ───────────────────────────────────────────── */}
        <Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <UserRound className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Personal Information</CardTitle>
                <CardDescription className="text-xs">Update your display name.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
              {profileAlert && <Alert state={profileAlert} />}

              <div className="grid gap-2">
                <Label htmlFor="profile-name">Full Name</Label>
                <Input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  className="bg-background/50"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-background/30 opacity-60 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Email address cannot be changed after registration.
                </p>
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="rounded-md" disabled={savingProfile}>
                  {savingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ── Change password card ───────────────────────────────────────── */}
        <Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <KeyRound className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Change Password</CardTitle>
                <CardDescription className="text-xs">
                  You must enter your current password to set a new one.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
              {passwordAlert && <Alert state={passwordAlert} />}

              <div className="grid gap-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="bg-background/50"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className="bg-background/50"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-background/50"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="rounded-md" disabled={savingPassword}>
                  {savingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Shared alert sub-component ────────────────────────────────────────────────

function Alert({ state }: { state: NonNullable<AlertState> }) {
  const isSuccess = state.type === "success";
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${
        isSuccess
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-destructive/20 bg-destructive/10 text-destructive"
      }`}
    >
      {isSuccess ? (
        <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      )}
      <span>{state.message}</span>
    </div>
  );
}
