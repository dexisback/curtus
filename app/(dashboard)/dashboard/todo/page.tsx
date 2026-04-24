import { requireSession } from "@/lib/session";
import { CheckSquare } from "lucide-react";

type TaskType = "DAILY" | "YEARLY" | "DEADLINE";

const PLACEHOLDER_TASKS: {
  id: string;
  title: string;
  type: TaskType;
  deadline?: string;
  isCompleted: boolean;
}[] = [
  { id: "1", title: "Complete 2-hour focus session", type: "DAILY", isCompleted: true },
  { id: "2", title: "Review chapter notes", type: "DAILY", isCompleted: false },
  { id: "3", title: "Read 30 pages", type: "DAILY", isCompleted: false },
  { id: "4", title: "Finish project proposal", type: "DEADLINE", deadline: "2026-04-28", isCompleted: false },
  { id: "5", title: "Submit assignment", type: "DEADLINE", deadline: "2026-04-30", isCompleted: false },
  { id: "6", title: "Read 24 books", type: "YEARLY", isCompleted: false },
  { id: "7", title: "Build a side project", type: "YEARLY", isCompleted: false },
  { id: "8", title: "Morning walk", type: "DAILY", isCompleted: false },
];

const TYPE_META: Record<TaskType, { label: string; color: string; bg: string }> = {
  DAILY: {
    label: "Daily",
    color: "oklch(0.52 0.12 250)",
    bg: "oklch(0.52 0.12 250 / 0.09)",
  },
  DEADLINE: {
    label: "Deadline",
    color: "oklch(0.60 0.14 25)",
    bg: "oklch(0.60 0.14 25 / 0.09)",
  },
  YEARLY: {
    label: "Yearly",
    color: "oklch(0.56 0.10 155)",
    bg: "oklch(0.56 0.10 155 / 0.09)",
  },
};

function formatDeadline(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function daysUntil(iso: string) {
  const now = new Date();
  const then = new Date(iso + "T12:00:00Z");
  return Math.ceil((then.getTime() - now.getTime()) / 86_400_000);
}

function TaskCard({
  title,
  type,
  deadline,
  isCompleted,
}: {
  title: string;
  type: TaskType;
  deadline?: string;
  isCompleted: boolean;
}) {
  const meta = TYPE_META[type];
  const due = deadline ? daysUntil(deadline) : null;
  const urgent = due !== null && due <= 3 && !isCompleted;

  return (
    <div
      className={
        "panel-texture group flex items-start gap-3 rounded-xl border p-4 " +
        "shadow-[0_1px_2px_rgba(17,24,39,0.04),0_4px_12px_rgba(17,24,39,0.05)] " +
        "transition-[box-shadow,opacity] duration-200 " +
        (isCompleted
          ? "border-border/30 opacity-50"
          : urgent
            ? "border-border/60 shadow-[0_1px_2px_rgba(17,24,39,0.05),0_4px_14px_rgba(17,24,39,0.08)]"
            : "border-border/50")
      }
    >
      {/* Checkbox placeholder */}
      <div
        className={
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border " +
          (isCompleted
            ? "border-transparent bg-cta/80"
            : "border-border/70 bg-background")
        }
      >
        {isCompleted && (
          <svg
            viewBox="0 0 10 10"
            className="h-2.5 w-2.5 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="1.5,5 4,7.5 8.5,2.5" />
          </svg>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={
            "text-[12.5px] font-medium leading-snug " +
            (isCompleted ? "line-through text-muted-foreground" : "text-foreground")
          }
        >
          {title}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {/* Type pill */}
          <span
            className="rounded-full px-2 py-0.5 text-[9.5px] font-medium"
            style={{ color: meta.color, background: meta.bg }}
          >
            {meta.label}
          </span>

          {/* Deadline */}
          {deadline && (
            <span
              className={
                "rounded-full px-2 py-0.5 text-[9.5px] tabular-nums " +
                (urgent
                  ? "bg-destructive/10 font-medium text-destructive"
                  : "bg-muted/60 text-muted-foreground")
              }
            >
              {formatDeadline(deadline)}
              {due !== null && !isCompleted && (
                <span className="ml-1 opacity-70">
                  ({due === 0 ? "today" : due < 0 ? `${Math.abs(due)}d overdue` : `${due}d`})
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function TodoPage() {
  await requireSession();

  const grouped = {
    DEADLINE: PLACEHOLDER_TASKS.filter((t) => t.type === "DEADLINE"),
    DAILY: PLACEHOLDER_TASKS.filter((t) => t.type === "DAILY"),
    YEARLY: PLACEHOLDER_TASKS.filter((t) => t.type === "YEARLY"),
  } as const;

  const completedCount = PLACEHOLDER_TASKS.filter((t) => t.isCompleted).length;
  const totalCount = PLACEHOLDER_TASKS.length;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto px-4 pb-8 pt-2 sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-6 pt-2">
        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <CheckSquare size={14} strokeWidth={1.6} className="text-muted-foreground opacity-70" />
            <h1 className="text-[14px] font-semibold tracking-tight text-foreground">Todo</h1>
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {completedCount} / {totalCount} done
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full rounded-full bg-cta/80 transition-[width] duration-500"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>

        {/* Deadlines */}
        {grouped.DEADLINE.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: TYPE_META.DEADLINE.color }}
              />
              <h2 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                Deadlines
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {grouped.DEADLINE.map((t) => (
                <TaskCard key={t.id} {...t} />
              ))}
            </div>
          </section>
        )}

        {/* Daily */}
        {grouped.DAILY.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: TYPE_META.DAILY.color }}
              />
              <h2 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                Daily
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {grouped.DAILY.map((t) => (
                <TaskCard key={t.id} {...t} />
              ))}
            </div>
          </section>
        )}

        {/* Yearly */}
        {grouped.YEARLY.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: TYPE_META.YEARLY.color }}
              />
              <h2 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                Yearly Goals
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {grouped.YEARLY.map((t) => (
                <TaskCard key={t.id} {...t} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
