import { apiFetch } from "./client";
import type { SkillCategory } from "./events";

export type RegistrationStatus = "REGISTERED" | "CANCELLED" | "ATTENDED";

export interface RegistrationEvent {
  id: string;
  eventCode: string;
  title: string;
  skillCategory: SkillCategory;
  skillHours: number;
  location: string;
  startAt: string;
  endAt: string;
}

export interface Registration {
  id: string;
  registrationNumber: string;
  eventId: string;
  participantId: string;
  status: RegistrationStatus;
  registeredAt: string;
  event: RegistrationEvent;
}

/** The POST response carries the fresh seat count alongside the new row. */
export interface RegistrationResult {
  registration: Omit<Registration, "event">;
  remainingSeats: number;
}

export async function fetchMyRegistrations(): Promise<Registration[]> {
  const data = await apiFetch<{ registrations: Registration[] }>(
    "/api/registrations/my"
  );
  return data.registrations;
}

export async function registerForEvent(
  eventId: string
): Promise<RegistrationResult> {
  // The body is empty on purpose: the server derives the participant from the
  // session and ignores anything sent here (BR-04).
  return apiFetch<RegistrationResult>(`/api/events/${eventId}/registrations`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
