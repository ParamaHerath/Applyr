"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Bell, Palette, Sliders } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const SETTINGS_STORAGE_KEY = "applyr.settings";

type SettingsState = {
	emailUpdates: boolean;
	interviewReminders: boolean;
	weeklyDigest: boolean;
	reminderCadence: "daily" | "weekly" | "off";
	defaultStatus: "DRAFT" | "APPLIED" | "INTERVIEWING" | "OFFER" | "REJECTED";
	autoArchiveRejected: boolean;
};

const defaultSettings: SettingsState = {
	emailUpdates: true,
	interviewReminders: true,
	weeklyDigest: true,
	reminderCadence: "weekly",
	defaultStatus: "APPLIED",
	autoArchiveRejected: false,
};

export default function SettingsPage() {
	const { theme, setTheme } = useTheme();
	const [isMounted, setIsMounted] = useState(false);
	const [settings, setSettings] = useState<SettingsState>(defaultSettings);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Persist demo preferences locally.
	useEffect(() => {
		try {
			const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as Partial<SettingsState>;
				setSettings((prev) => ({ ...prev, ...parsed }));
			}
		} catch {
			setSettings(defaultSettings);
		}
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
		} catch {
			// Ignore storage write failures (private mode, etc.).
		}
	}, [settings]);

	const themeValue = isMounted ? theme ?? "system" : "system";

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-bold tracking-tight">Settings</h1>
				<p className="text-muted-foreground">
					Customize your experience and notification preferences.
				</p>
			</div>

			<div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_1px_1fr] lg:gap-0">
				<div className="flex flex-col gap-6 lg:pr-3">
					<Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
						<CardHeader className="pb-4">
							<div className="flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
									<Palette className="h-4 w-4 text-primary" />
								</div>
								<div>
									<CardTitle className="text-base">Appearance</CardTitle>
									<CardDescription className="text-xs">
										Theme and display settings for the dashboard.
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<div className="space-y-1">
									<Label htmlFor="theme">Theme</Label>
									<p className="text-xs text-muted-foreground">
										Choose light, dark, or use your system default.
									</p>
								</div>
								<div className="w-full sm:w-56">
									<Select
										value={themeValue}
										onValueChange={(value) => value && setTheme(value)}
									>
										<SelectTrigger id="theme" className="w-full">
											<SelectValue placeholder="Select theme" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="light">Light</SelectItem>
											<SelectItem value="dark">Dark</SelectItem>
											<SelectItem value="system">System</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
						<CardHeader className="pb-4">
							<div className="flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
									<Bell className="h-4 w-4 text-primary" />
								</div>
								<div>
									<CardTitle className="text-base">Notifications</CardTitle>
									<CardDescription className="text-xs">
										Stay on top of updates without the noise.
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="flex items-start justify-between gap-4 rounded-lg border border-border/50 bg-background/40 px-4 py-3">
								<div className="space-y-1">
									<Label htmlFor="email-updates" className="text-sm">
										Email updates
									</Label>
									<p className="text-xs text-muted-foreground">
										Get a notification when your status changes.
									</p>
								</div>
								<input
									id="email-updates"
									type="checkbox"
									className="mt-1 h-4 w-4"
									checked={settings.emailUpdates}
									onChange={(e) =>
										setSettings((prev) => ({
											...prev,
											emailUpdates: e.target.checked,
										}))
									}
								/>
							</div>

							<div className="flex items-start justify-between gap-4 rounded-lg border border-border/50 bg-background/40 px-4 py-3">
								<div className="space-y-1">
									<Label htmlFor="interview-reminders" className="text-sm">
										Interview reminders
									</Label>
									<p className="text-xs text-muted-foreground">
										Remind me 24 hours before scheduled interviews.
									</p>
								</div>
								<input
									id="interview-reminders"
									type="checkbox"
									className="mt-1 h-4 w-4"
									checked={settings.interviewReminders}
									onChange={(e) =>
										setSettings((prev) => ({
											...prev,
											interviewReminders: e.target.checked,
										}))
									}
								/>
							</div>

							<div className="flex items-start justify-between gap-4 rounded-lg border border-border/50 bg-background/40 px-4 py-3">
								<div className="space-y-1">
									<Label htmlFor="weekly-digest" className="text-sm">
										Weekly digest
									</Label>
									<p className="text-xs text-muted-foreground">
										Get a weekly summary of your pipeline.
									</p>
								</div>
								<input
									id="weekly-digest"
									type="checkbox"
									className="mt-1 h-4 w-4"
									checked={settings.weeklyDigest}
									onChange={(e) =>
										setSettings((prev) => ({
											...prev,
											weeklyDigest: e.target.checked,
										}))
									}
								/>
							</div>

							<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<div className="space-y-1">
									<Label htmlFor="reminder-cadence">Reminder cadence</Label>
									<p className="text-xs text-muted-foreground">
										Control how often reminder emails are sent.
									</p>
								</div>
								<div className="w-full sm:w-56">
									<Select
										value={settings.reminderCadence}
										onValueChange={(value) =>
											value &&
											setSettings((prev) => ({
												...prev,
												reminderCadence: value as SettingsState["reminderCadence"],
											}))
										}
									>
										<SelectTrigger id="reminder-cadence" className="w-full">
											<SelectValue placeholder="Select cadence" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="daily">Daily</SelectItem>
											<SelectItem value="weekly">Weekly</SelectItem>
											<SelectItem value="off">Off</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="hidden lg:block bg-border/50" aria-hidden="true" />

				<div className="flex flex-col gap-6 lg:pl-3">
					<Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
						<CardHeader className="pb-4">
							<div className="flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
									<Sliders className="h-4 w-4 text-primary" />
								</div>
								<div>
									<CardTitle className="text-base">Defaults and Automation</CardTitle>
									<CardDescription className="text-xs">
										Tune how new applications are created and managed.
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<div className="space-y-1">
									<Label htmlFor="default-status">Default status</Label>
									<p className="text-xs text-muted-foreground">
										Pre-fill the status on new application entries.
									</p>
								</div>
								<div className="w-full sm:w-56">
									<Select
										value={settings.defaultStatus}
										onValueChange={(value) =>
											value &&
											setSettings((prev) => ({
												...prev,
												defaultStatus: value as SettingsState["defaultStatus"],
											}))
										}
									>
										<SelectTrigger id="default-status" className="w-full">
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

							<div className="flex items-start justify-between gap-4 rounded-lg border border-border/50 bg-background/40 px-4 py-3">
								<div className="space-y-1">
									<Label htmlFor="auto-archive" className="text-sm">
										Auto-archive rejected applications
									</Label>
									<p className="text-xs text-muted-foreground">
										Move rejected items to the archive after 30 days.
									</p>
								</div>
								<input
									id="auto-archive"
									type="checkbox"
									className="mt-1 h-4 w-4"
									checked={settings.autoArchiveRejected}
									onChange={(e) =>
										setSettings((prev) => ({
											...prev,
											autoArchiveRejected: e.target.checked,
										}))
									}
								/>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			<p className="text-xs text-muted-foreground">
				Preferences are saved locally in this browser.
			</p>
		</div>
	);
}
