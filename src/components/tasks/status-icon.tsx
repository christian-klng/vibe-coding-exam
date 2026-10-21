import { CircleCheck, CircleDashed, CircleX, LoaderCircle } from "lucide-react";
import type { TaskStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const icons = {
  open: { Icon: CircleDashed, className: "text-muted-foreground" },
  checking: { Icon: LoaderCircle, className: "animate-spin text-muted-foreground" },
  passed: { Icon: CircleCheck, className: "text-emerald-600 dark:text-emerald-400" },
  failed: { Icon: CircleX, className: "text-destructive" },
} satisfies Record<TaskStatus, { Icon: typeof CircleDashed; className: string }>;

export function StatusIcon({ status, label, className }: { status: TaskStatus; label: string; className?: string }) {
  const { Icon, className: statusClass } = icons[status];
  return <Icon role="img" aria-label={label} className={cn("size-5 shrink-0", statusClass, className)} />;
}
