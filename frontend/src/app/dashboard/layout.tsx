import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <Sidebar />
      <div className="flex flex-col sm:gap-4 sm:py-6 sm:pl-64 w-full">
        <main className="flex-1 items-start p-4 sm:px-8 sm:py-0">
          {children}
        </main>
      </div>
    </div>
  );
}
