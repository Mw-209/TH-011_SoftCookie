import dotenv from "dotenv";
import path from "node:path";
import { PrismaClient, Role, SkillCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

const prisma = new PrismaClient();

export async function main() {
  if (process.env.SEED_DEMO_DATA !== "true") {
    console.log("SEED_DEMO_DATA is not set to 'true'. Skipping demo seed.");
    return;
  }

  const demoPassword = process.env.DEMO_USER_PASSWORD;
  if (!demoPassword || demoPassword === "change-me") {
    throw new Error(
      "DEMO_USER_PASSWORD must be configured via environment variables before seeding demo accounts."
    );
  }

  console.log("Seeding database...");
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  // 1. Seed Users (2 Organizers, 3 Active Participants, 1 Inactive Participant)
  const users = [
    {
      email: "organizer1@university.edu",
      name: "Dr. Somchai Wattana",
      passwordHash,
      role: Role.ORGANIZER,
      isActive: true,
    },
    {
      email: "organizer2@university.edu",
      name: "Prof. Nida Srisuk",
      passwordHash,
      role: Role.ORGANIZER,
      isActive: true,
    },
    {
      email: "student1@university.edu",
      name: "Kittipong Jaidee",
      passwordHash,
      role: Role.PARTICIPANT,
      isActive: true,
    },
    {
      email: "student2@university.edu",
      name: "Pimchanok Lert",
      passwordHash,
      role: Role.PARTICIPANT,
      isActive: true,
    },
    {
      email: "student3@university.edu",
      name: "Thanawat Suk",
      passwordHash,
      role: Role.PARTICIPANT,
      isActive: true,
    },
    {
      email: "inactive@university.edu",
      name: "Former Student",
      passwordHash,
      role: Role.PARTICIPANT,
      isActive: false,
    },
  ];

  const seededUsers = new Map<string, string>();

  for (const user of users) {
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive,
      },
      create: user,
    });
    seededUsers.set(record.email, record.id);
  }

  const organizer1Id = seededUsers.get("organizer1@university.edu")!;
  const organizer2Id = seededUsers.get("organizer2@university.edu")!;

  // 2. Seed Skill-Building Events
  //
  // Schedules are built from whole hours rather than offsets from "now", so the
  // catalog shows real session times (09:00 - 12:00) instead of whatever minute
  // the seed happened to run at. One event deliberately spans two days so the
  // cross-day rendering path has sample data.
  const atHour = (daysFromToday: number, hour: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);
    date.setHours(hour, 0, 0, 0);
    return date;
  };

  // EVT-0001: single day, 09:00 - 12:00
  const event1Start = atHour(7, 9);
  const event1End = atHour(7, 12);

  // EVT-0002: single day, 13:00 - 17:00
  const event2Start = atHour(10, 13);
  const event2End = atHour(10, 17);

  // EVT-0003: two-day seminar, 10:00 on day one through 12:00 the next day.
  const event3Start = atHour(14, 10);
  const event3End = atHour(15, 12);
  // The only event with an early cutoff, so the detail view exercises both the
  // "closes early" and the "open until it starts" cases.
  const event3Deadline = atHour(12, 17);

  const events = [
    {
      eventCode: "EVT-2026-0001",
      title: "Full-Stack TypeScript & Testing Workshop",
      description:
        "Hands-on engineering workshop on spec-driven development, Next.js, and Vitest.",
      skillCategory: SkillCategory.TECHNICAL,
      skillHours: 3,
      location: "Engineering Bldg 4, Room 402",
      startAt: event1Start,
      endAt: event1End,
      // Registration stays open until the session begins.
      registrationDeadline: event1Start,
      capacity: 20,
      organizerId: organizer1Id,
    },
    {
      eventCode: "EVT-2026-0002",
      title: "AI Agent Engineering Hands-On Lab",
      description:
        "Rigorous prompt engineering, tool integration, and agentic workflows. Limited capacity 1-seat event.",
      skillCategory: SkillCategory.DATA_AI,
      skillHours: 4,
      location: "Innovation Center Lab 2",
      startAt: event2Start,
      endAt: event2End,
      registrationDeadline: event2Start,
      capacity: 1,
      organizerId: organizer1Id,
    },
    {
      eventCode: "EVT-2026-0003",
      title: "Academic Leadership & Communication Seminar",
      description:
        "Professional communication, stakeholder alignment, and technical project leadership.",
      skillCategory: SkillCategory.COMMUNICATION,
      skillHours: 2,
      location: "Auditorium B",
      startAt: event3Start,
      endAt: event3End,
      registrationDeadline: event3Deadline,
      capacity: 15,
      organizerId: organizer2Id,
    },
  ];

  for (const evt of events) {
    await prisma.event.upsert({
      where: { eventCode: evt.eventCode },
      update: {
        title: evt.title,
        description: evt.description,
        skillCategory: evt.skillCategory,
        skillHours: evt.skillHours,
        location: evt.location,
        startAt: evt.startAt,
        endAt: evt.endAt,
        registrationDeadline: evt.registrationDeadline,
        capacity: evt.capacity,
        organizerId: evt.organizerId,
      },
      create: evt,
    });
  }

  console.log("Seeding completed successfully.");
}

if (process.env.NODE_ENV !== "test") {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
