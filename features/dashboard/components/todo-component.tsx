"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckSquare2 } from "lucide-react";
import { useSound } from "@/components/sound-provider";

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

const PLACEHOLDER_TASKS = [
  { id: "t1", title: "Deep Work Block", startHour: 9, startMin: 0, endHour: 11, endMin: 30, type: "DAILY" as TaskType, isCompleted: false },
  { id: "t2", title: "Lunch Break", startHour: 12, startMin: 30, endHour: 13, endMin: 30, type: "DAILY" as TaskType, isCompleted: true },
  { id: "t3", title: "Physics Review", startHour: 14, startMin: 0, endHour: 15, endMin: 30, type: "DEADLINE" as TaskType, isCompleted: false },
  { id: "t4", title: "Mock Test", startHour: 16, startMin: 0, endHour: 17, endMin: 0, type: "YEARLY" as TaskType, isCompleted: false },
];

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

export default function TodoComponent() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowIndicatorRef = useRef<HTMLDivElement>(null);
  const [tasks, setTasks] = useState(PLACEHOLDER_TASKS);
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
        className="w-full h-full border border-black/[0.06] bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] flex items-stretch overflow-hidden"
        style={{
          borderRadius: 16,
          boxShadow: [
            "0 1px 2px rgba(17,24,39,0.05)",
            "0 4px 10px rgba(17,24,39,0.04)",
            "3px 8px 20px rgba(17,24,39,0.06)",
          ].join(","),
        }}
        whileHover={{ y: -1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.6 }}
      >
        {/* Left anchor — date + timezone */}
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

        {/* Timeline scroll area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto relative"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* Total width container */}
          <div
            className="relative h-full"
            style={{ width: `${HOURS.length * HOUR_WIDTH}px` }}
          >
            {/* Hour column guides */}
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

            {/* Task pills */}
            <div className="absolute inset-0 pointer-events-none">
              {tasks.map((task, i) => {
                const left = taskLeftPx(task.startHour, task.startMin);
                const width = taskWidthPx(task.startHour, task.startMin, task.endHour, task.endMin);
                const color = TYPE_COLOR[task.type];
                const isNow = nowHour >= task.startHour + task.startMin / 60 && nowHour <= task.endHour + task.endMin / 60;
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
                      onClick={() => {
                        setTasks((prev) =>
                          prev.map((t) => (t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t)),
                        );
                        play(task.isCompleted ? "toggleOff" : "toggleOn");
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
                        {formatHour(task.startHour)}
                        {task.startMin ? `:${String(task.startMin).padStart(2, "0")}` : ""}
                        {" – "}
                        {formatHour(task.endHour)}
                        {task.endMin ? `:${String(task.endMin).padStart(2, "0")}` : ""}
                      </span>
                      <span className="text-[8.5px] text-muted-foreground/80">
                        {task.type} {isNow && !task.isCompleted ? "• In progress" : task.isCompleted ? "• Done" : "• Upcoming"}
                      </span>
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>

            {/* Current-time indicator */}
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
