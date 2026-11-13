import { apiFetch } from "./client";

export type SkillCategory =
  | "TECHNICAL"
  | "DATA_AI"
  | "COMMUNICATION"
  | "CAREER";

export const SKILL_CATEGORIES: SkillCategory[] = [
  "TECHNICAL",
  "DATA_AI",
  "COMMUNICATION",
  "CAREER",
];

/** Human-facing labels for the schema's enum values. */
export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  TECHNICAL: "Technical",
  DATA_AI: "Data & AI",
  COMMUNICATION: "Communication",
  CAREER: "Career",
};

export interface EventSummary {
  id: string;
  eventCode: string;
  title: string;
  description: string;
  skillCategory: SkillCategory;
  skillHours: number;
  location: string;
  startAt: string;
  endAt: string;
  registrationDeadline: string;
  capacity: number;
  activeRegistrationsCount: number;
  remainingSeats: number;
  organizerId: string;
  organizerName: string;
}

export interface CreateEventPayload {
  title: string;
  description: string;
  skillCategory: SkillCategory;
  skillHours: number;
  location: string;
  startAt: string;
  endAt: string;
  registrationDeadline: string;
  capacity: number;
}

export async function fetchEvents(): Promise<EventSummary[]> {
  const data = await apiFetch<{ events: EventSummary[] }>("/api/events");
  return data.events;
}

export async function fetchEvent(id: string): Promise<EventSummary> {
  const data = await apiFetch<{ event: EventSummary }>(`/api/events/${id}`);
  return data.event;
}

export async function createEvent(
  payload: CreateEventPayload
): Promise<EventSummary> {
  const data = await apiFetch<{ event: EventSummary }>("/api/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.event;
}
