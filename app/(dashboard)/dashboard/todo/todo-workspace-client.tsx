"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarDays, CheckSquare, Goal, Scissors } from "lucide-react";
import { useSound } from "@/components/sound-provider";
import type { TaskType } from "./page";

type TodoTask = {
  id: string;
  title: string;
  type: TaskType;
  deadline?: string;
  isCompleted: boolean;
};

const TYPE_META: Record<TaskType, { label: string; color: string; bg: string }> = {
  DAILY: { label: "Daily", color: "oklch(0.52 0.12 250)", bg: "oklch(0.52 0.12 250 / 0.09)" },
  DEADLINE: { label: "Deadline", color: "oklch(0.60 0.14 25)", bg: "oklch(0.60 0.14 25 / 0.09)" },
  YEARLY: { label: "Yearly", color: "oklch(0.56 0.10 155)", bg: "oklch(0.56 0.10 155 / 0.09)" },
};

function dateDiff(target: Date) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.ceil((end - start) / 86_400_000);
}

export default function TodoWorkspaceClient({ initialTasks }: { initialTasks: TodoTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [slicedId, setSlicedId] = useState<string | null>(null);
  const [dDay, setDDay] = useState("2026-06-01");
  const [weeklyGoal, setWeeklyGoal] = useState(12);
  const [monthlyGoal, setMonthlyGoal] = useState(42);
  const reduceMotion = useReducedMotion();
  const { play } = useSound();

  const grouped = useMemo(
    () => ({
      DEADLINE: tasks.filter((t) => t.type === "DEADLINE"),
      DAILY: tasks.filter((t) => t.type === "DAILY"),
      YEARLY: tasks.filter((t) => t.type === "YEARLY"),
    }),
    [tasks],
  );

  const done = tasks.filter((t) => t.isCompleted).length;
  const dValue = dateDiff(new Date(dDay + "T12:00:00"));

  function markWithSlice(id: string) {
    setSlicedId(id);
    const target = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)));
    play(target?.isCompleted ? "toggleOff" : "success");
    if (!reduceMotion) setTimeout(() => setSlicedId(null), 420);
    else setSlicedId(null);
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto px-4 pb-8 pt-2 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6 pt-2">
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <CheckSquare size={14} strokeWidth={1.6} className="text-muted-foreground opacity-70" />
            <h1 className="text-[14px] font-semibold tracking-tight text-foreground">Todo</h1>
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {done} / {tasks.length} done
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="panel-texture rounded-2xl border border-border/50 p-4">
            <p className="mb-3 text-[11px] font-medium text-muted-foreground">Task slicing mode</p>
            <div className="space-y-2">
              {tasks.map((task) => (
                <motion.button
                  key={task.id}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => markWithSlice(task.id)}
                  className="relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-border/50 bg-background/85 px-3 py-3 text-left"
                >
                  <span className={"mt-0.5 h-4 w-4 rounded-[4px] border " + (task.isCompleted ? "border-transparent bg-cta/80" : "border-border/70")} />
                  <div className="min-w-0 flex-1">
                    <p className={"text-[12.5px] font-medium " + (task.isCompleted ? "line-through text-muted-foreground" : "text-foreground")}>
                      {task.title}
                    </p>
                    <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[9.5px]" style={{ color: TYPE_META[task.type].color, background: TYPE_META[task.type].bg }}>
                      {TYPE_META[task.type].label}
                    </span>
                  </div>
                  <AnimatePresence>
                    {slicedId === task.id && (
                      <motion.span
                        initial={{ opacity: 0, x: -40 }}
                        animate={{ opacity: 0.9, x: 150 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0, 0, 0.58, 1] }}
                        className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white/5 via-white/70 to-white/5"
                      />
                    )}
                  </AnimatePresence>
                  <Scissors size={13} className="shrink-0 text-muted-foreground/60" />
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="panel-texture rounded-2xl border border-border/50 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <CalendarDays size={12} />
                D-Day setup
              </p>
              <input
                type="date"
                value={dDay}
                onChange={(e) => setDDay(e.target.value)}
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-[12px]"
              />
              <p className="mt-3 text-[18px] font-semibold tabular-nums text-foreground">
                D{dValue >= 0 ? `-${dValue}` : `+${Math.abs(dValue)}`}
              </p>
              <p className="text-[10.5px] text-muted-foreground">Auto-calculated on app start</p>
            </div>

            <div className="panel-texture rounded-2xl border border-border/50 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Goal size={12} />
                Goal configuration
              </p>
              <label className="mb-3 block text-[10.5px] text-muted-foreground">
                Weekly focus goals
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={weeklyGoal}
                  onChange={(e) => {
                    setWeeklyGoal(Number(e.target.value));
                    play("tap");
                  }}
                  className="mt-1 w-full"
                />
                <span className="tabular-nums text-[12px] text-foreground">{weeklyGoal} tasks/week</span>
              </label>
              <label className="block text-[10.5px] text-muted-foreground">
                Monthly focus goals
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={monthlyGoal}
                  onChange={(e) => {
                    setMonthlyGoal(Number(e.target.value));
                    play("tap");
                  }}
                  className="mt-1 w-full"
                />
                <span className="tabular-nums text-[12px] text-foreground">{monthlyGoal} tasks/month</span>
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(["DEADLINE", "DAILY", "YEARLY"] as TaskType[]).map((type) => (
            <div key={type} className="panel-texture rounded-xl border border-border/50 p-4">
              <p className="text-[11px] text-muted-foreground">{TYPE_META[type].label} tasks</p>
              <p className="mt-1 text-[20px] font-semibold tabular-nums">{grouped[type].length}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
