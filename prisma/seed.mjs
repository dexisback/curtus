import { PrismaClient } from "../generated/prisma/index.js";
import { PrismaNeon } from "@prisma/adapter-neon";

const DAY_MS = 86_400_000;
const RESET_HOUR_UTC = 5;

function createRng(seed = 123456789) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

function getStudyDayStart(date) {
  const shifted = new Date(date.getTime() - RESET_HOUR_UTC * 60 * 60 * 1000);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
      RESET_HOUR_UTC,
      0,
      0,
      0,
    ),
  );
}

function isoDay(date) {
  return getStudyDayStart(date).toISOString().slice(0, 10);
}

function computeStreak(days) {
  if (!days.length) return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  const sorted = [...days].sort();
  let longest = 1;
  let currentRun = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00Z`);
    const next = new Date(`${sorted[i]}T00:00:00Z`);
    const diffDays = Math.round((next.getTime() - prev.getTime()) / DAY_MS);
    if (diffDays === 1) {
      currentRun += 1;
      if (currentRun > longest) longest = currentRun;
    } else {
      currentRun = 1;
    }
  }

  const today = isoDay(new Date());
  let currentStreak = 0;
  let cursor = new Date(`${today}T00:00:00Z`);
  const set = new Set(sorted);
  while (set.has(cursor.toISOString().slice(0, 10))) {
    currentStreak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  return {
    currentStreak,
    longestStreak: longest,
    lastActiveDate: new Date(`${sorted[sorted.length - 1]}T05:00:00Z`),
  };
}

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const rng = createRng(424242);
  const now = new Date();

  try {
    console.log("Seed started");
    await prisma.ping.deleteMany();
    await prisma.message.deleteMany();
    await prisma.focusSession.deleteMany();
    await prisma.dailyStats.deleteMany();
    await prisma.streak.deleteMany();
    await prisma.task.deleteMany();
    await prisma.roomMember.deleteMany();
    await prisma.room.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.verification.deleteMany();
    await prisma.user.deleteMany();
    console.log("Cleared existing data");

    const users = [];
    for (let i = 1; i <= 14; i++) {
      const user = await prisma.user.create({
        data: {
          email: `seed.user${i}@studywithme.local`,
          name: `Seed User ${i}`,
          image: null,
          bio: `Focused learner ${i}`,
        },
      });
      users.push(user);
    }
    console.log("Created users");

    const rooms = [];
    for (let i = 0; i < 6; i++) {
      const host = users[i];
      const room = await prisma.room.create({
        data: {
          code: `SEED${100 + i}`,
          name: `Seed Room ${i + 1}`,
          isPublic: i % 2 === 0,
          hostId: host.id,
        },
      });
      rooms.push(room);
    }
    console.log("Created rooms");

    for (const [index, room] of rooms.entries()) {
      const shuffled = [...users].sort(() => rng() - 0.5).slice(0, 6 + (index % 4));
      const hostInList = shuffled.some((u) => u.id === room.hostId);
      const members = hostInList
        ? shuffled
        : [users.find((u) => u.id === room.hostId), ...shuffled].filter(Boolean);
      for (const [i, user] of members.entries()) {
        await prisma.roomMember.create({
          data: {
            roomId: room.id,
            userId: user.id,
            role: user.id === room.hostId ? "HOST" : i === 1 ? "COHOST" : "MEMBER",
          },
        });
      }
    }
    console.log("Created room members");

    const taskTypes = ["DAILY", "DEADLINE", "YEARLY"];
    for (const user of users) {
      await prisma.task.createMany({
        data: Array.from({ length: 6 }, (_, i) => {
          const type = pick(rng, taskTypes);
          return {
            userId: user.id,
            title: `Task ${i + 1} for ${user.name}`,
            type,
            isCompleted: rng() > 0.45,
            deadline:
              type === "DEADLINE"
                ? new Date(now.getTime() + Math.floor(rng() * 12) * DAY_MS)
                : null,
          };
        }),
      });
    }
    console.log("Created tasks");

    for (const room of rooms) {
      const members = await prisma.roomMember.findMany({
        where: { roomId: room.id },
        select: { userId: true },
      });
      await prisma.message.createMany({
        data: Array.from({ length: 8 }, (_, i) => ({
          roomId: room.id,
          userId: pick(rng, members).userId,
          content: `Seed message ${i + 1} in ${room.name}`,
          createdAt: new Date(now.getTime() - (8 - i) * 30 * 60 * 1000),
        })),
      });
    }
    console.log("Created messages");

    const perUserMinutes = new Map();
    const perUserByDay = new Map();
    for (const user of users) {
      let total = 0;
      const byDay = new Map();
      const sessionCount = 10 + Math.floor(rng() * 8);
      const sessionRows = [];
      for (let i = 0; i < sessionCount; i++) {
        const daysAgo = Math.floor(rng() * 40);
        const started = new Date(
          now.getTime() -
            daysAgo * DAY_MS -
            Math.floor(rng() * 20) * 60 * 60 * 1000 -
            Math.floor(rng() * 50) * 60 * 1000,
        );
        const durationMin = 20 + Math.floor(rng() * 80);
        const completedAt = new Date(started.getTime() + durationMin * 60 * 1000);
        const room = rng() > 0.35 ? pick(rng, rooms) : null;

        sessionRows.push({
          userId: user.id,
          roomId: room?.id ?? null,
          durationMin,
          completedAt,
        });

        const day = isoDay(completedAt);
        byDay.set(day, (byDay.get(day) ?? 0) + durationMin);
        total += durationMin;
      }
      await prisma.focusSession.createMany({ data: sessionRows });
      perUserMinutes.set(user.id, total);
      perUserByDay.set(user.id, byDay);
    }
    console.log("Created focus sessions");

    for (const user of users) {
      const byDay = perUserByDay.get(user.id);
      for (const [day, minutes] of byDay.entries()) {
        await prisma.dailyStats.create({
          data: {
            userId: user.id,
            date: new Date(`${day}T05:00:00Z`),
            totalMinutes: minutes,
          },
        });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { lifetimeFocusMinutes: perUserMinutes.get(user.id) ?? 0 },
      });

      const streak = computeStreak([...byDay.keys()]);
      await prisma.streak.create({
        data: {
          userId: user.id,
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastActiveDate: streak.lastActiveDate,
        },
      });
    }

    console.log(`Seed complete: ${users.length} users, ${rooms.length} rooms.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
