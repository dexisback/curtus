"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckSquare2 } from "lucide-react";
import { useSound } from "@/components/sound-provider";
import { SPRING_DRAG_RELEASE, SPRING_HOVER } from "@/lib/ui-motion";

const HOUR_WIDTH = 96;
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM – 11 PM

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatHour(h: number) {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

type TaskType = "DAILY" | "YEARLY" | "DEADLINE";
type TaskItem = {
  id: string;
  title: string;
  type: TaskType;
  isCompleted: boolean;
};

const TYPE_COLOR: Record<TaskType, string> = {
  DAILY: "oklch(0.56 0.10 250)",
  DEADLINE: "oklch(0.58 0.11 45)",
  YEARLY: "oklch(0.55 0.12 320)",
};

function taskLeftPx(startHour: number, startMin: number) {
  return (startHour - 6) * HOUR_WIDTH + (startMin / 60) * HOUR_WIDTH;
}

function taskWidthPx(startHour: number, startMin: number, endHour: number, endMin: number) {
  const durationMins = (endHour - startHour) * 60 + (endMin - startMin);
  return (durationMins / 60) * HOUR_WIDTH;
}

export default function TodoComponent({ initialTasks }: { initialTasks: TaskItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowIndicatorRef = useRef<HTMLDivElement>(null);
  const [tasks, setTasks] = useState(initialTasks);
  const opSeqRef = useRef<Map<string, number>>(new Map());
  const { play } = useSound();

  const now = new Date();
  const dayName = DAY_NAMES[now.getDay()];
  const dayNum = now.getDate();
  const monthName = MONTH_NAMES[now.getMonth()];

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzLabel = tz.replace(/_/g, " ");

  const nowHour = now.getHours() + now.getMinutes() / 60;
  const nowLeftPx = (nowHour - 6) * HOUR_WIDTH;

  useEffect(() => {
    if (nowIndicatorRef.current && scrollRef.current) {
      const offset = Math.max(0, nowLeftPx - 60);
      scrollRef.current.scrollLeft = offset;
    }
  }, [nowLeftPx]);

  return (
    <div className="h-full min-h-0 w-full min-w-0 pt-0.5 pb-2.5">
      <motion.div
        className="app-cursor-drag flex h-full w-full items-stretch overflow-hidden border border-black/[0.06] bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px]"
        style={{
          borderRadius: 16,
          boxShadow: [
            "0 1px 2px rgba(17,24,39,0.05)",
            "0 4px 10px rgba(17,24,39,0.04)",
            "3px 8px 20px rgba(17,24,39,0.06)",
          ].join(","),
        }}
        whileHover={{ y: -1 }}
        drag
        dragConstraints={{ top: -4, left: -4, right: 4, bottom: 4 }}
        dragElastic={0.08}
        dragTransition={SPRING_DRAG_RELEASE}
        transition={SPRING_HOVER}
      >
        <div
          className="shrink-0 w-[88px] flex flex-col items-center justify-center gap-0.5 border-r border-border/60 px-3"
          style={{ background: "oklch(0.945 0.005 75)" }}
        >
          <span className="text-[10px] font-semibold text-muted-foreground tracking-widest">
            {dayName}
          </span>
          <span
            className="text-2xl font-bold text-foreground tabular-nums leading-none"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {dayNum}
          </span>
          <span className="text-[9px] text-muted-foreground mt-0.5">
            {monthName}
          </span>
          <div className="mt-2 px-1.5 py-0.5 rounded bg-border/50">
            <span className="text-[8.5px] text-muted-foreground font-medium tracking-tight">
              {tzLabel}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[9px] text-muted-foreground">
            <CheckSquare2 size={10} />
            <span className="tabular-nums">
              {tasks.filter((t) => t.isCompleted).length}/{tasks.length}
            </span>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto relative"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <div
            className="relative h-full"
            style={{ width: `${HOURS.length * HOUR_WIDTH}px` }}
          >
            <div className="absolute inset-0 flex pointer-events-none">
              {HOURS.map((h) => {
                const isCurrentHour = Math.floor(nowHour) === h;
                return (
                  <div
                    key={h}
                    className="shrink-0 flex flex-col justify-between"
                    style={{
                      width: HOUR_WIDTH,
                      background: isCurrentHour ? "oklch(0.58 0.11 45 / 0.05)" : "transparent",
                    }}
                  >
                    <div className="flex items-center h-full pt-1 px-2 border-r border-border/40">
                      <span className="text-[9px] text-muted-foreground/70 tabular-nums self-start pt-1">
                        {formatHour(h)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="absolute inset-0 pointer-events-none">
              {tasks.map((task, i) => {
                const startHour = 8 + (i % 10);
                const startMin = i % 2 === 0 ? 0 : 30;
                const endHour = Math.min(23, startHour + 1);
                const endMin = startMin;
                const left = taskLeftPx(startHour, startMin);
                const width = taskWidthPx(startHour, startMin, endHour, endMin);
                const color = TYPE_COLOR[task.type];
                const isNow =
                  nowHour >= startHour + startMin / 60 &&
                  nowHour <= endHour + endMin / 60;
                return (
                  <motion.div
                    key={task.id}
                    className="absolute top-1/2 -translate-y-1/2 pointer-events-auto"
                    style={{
                      left,
                      width: width - 6,
                      marginLeft: 3,
                      height: "52%",
                    }}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.22, ease: [0, 0, 0.58, 1] }}
                  >
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={async () => {
                        const previousCompleted = task.isCompleted;
                        const nextCompleted = !previousCompleted;
                        setTasks((prev) =>
                          prev.map((t) =>
                            t.id === task.id ? { ...t, isCompleted: nextCompleted } : t,
                          ),
                        );
                        play(previousCompleted ? "toggleOff" : "toggleOn");

                        const nextSeq = (opSeqRef.current.get(task.id) ?? 0) + 1;
                        opSeqRef.current.set(task.id, nextSeq);

                        try {
                          const res = await fetch(`/api/tasks/${task.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ isCompleted: nextCompleted }),
                          });
                          if (!res.ok) {
                            if (opSeqRef.current.get(task.id) !== nextSeq) return;
                            setTasks((prev) =>
                              prev.map((t) =>
                                t.id === task.id
                                  ? { ...t, isCompleted: previousCompleted }
                                  : t,
                              ),
                            );
                            play("error");
                          }
                        } catch {
                          if (opSeqRef.current.get(task.id) !== nextSeq) return;
                          setTasks((prev) =>
                            prev.map((t) =>
                              t.id === task.id
                                ? { ...t, isCompleted: previousCompleted }
                                : t,
                            ),
                          );
                          play("error");
                        }
                      }}
                      className="w-full h-full rounded-lg px-2 flex flex-col justify-center gap-0.5 cursor-pointer select-none text-left"
                      style={{
                        background: task.isCompleted ? "oklch(0.75 0.01 75 / 0.18)" : `${color}18`,
                        borderLeft: `2.5px solid ${color}`,
                        outline: `1px solid ${color}22`,
                        opacity: task.isCompleted ? 0.65 : 1,
                      }}
                    >
                      <span
                        className={"text-[10px] font-medium truncate " + (task.isCompleted ? "line-through" : "")}
                        style={{ color }}
                      >
                        {task.title}
                      </span>
                      <span className="text-[9px] tabular-nums text-muted-foreground">
                        {formatHour(startHour)}
                        {startMin ? `:${String(startMin).padStart(2, "0")}` : ""}
                        {" – "}
                        {formatHour(endHour)}
                        {endMin ? `:${String(endMin).padStart(2, "0")}` : ""}
                      </span>
                      <span className="text-[8.5px] text-muted-foreground/80">
                        {task.type} {isNow && !task.isCompleted ? "• In progress" : task.isCompleted ? "• Done" : "• Upcoming"}
                      </span>
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>

            {nowHour >= 6 && nowHour <= 23 && (
              <div
                ref={nowIndicatorRef}
                className="absolute top-0 bottom-0 pointer-events-none z-10"
                style={{ left: nowLeftPx }}
              >
                <div className="w-px h-full bg-red-400/70" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -left-[3px] w-1.5 h-1.5 rounded-full bg-red-400"
                  style={{ boxShadow: "0 0 0 2px rgba(248,113,113,0.25)" }}
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// — Dashboard todo summary / quick list widget.
