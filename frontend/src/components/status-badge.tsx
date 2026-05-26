import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase();
  
  let baseClass = "uppercase font-semibold rounded-md px-2.5 py-0.5 text-xs border ";
  
  switch (normalizedStatus) {
    case "INTERVIEWING":
      baseClass += "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/20";
      break;
    case "APPLIED":
      baseClass += "bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20 border-orange-500/20";
      break;
    case "OFFER":
      baseClass += "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20";
      break;
    case "REJECTED":
      baseClass += "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20";
      break;
    default:
      baseClass += "bg-zinc-100 text-zinc-900 border-zinc-200 hover:bg-zinc-200 dark:bg-white dark:text-black dark:border-transparent dark:hover:bg-zinc-200";
      break;
  }

  return <Badge className={`${baseClass} ${className}`.trim()}>{normalizedStatus}</Badge>;
}
