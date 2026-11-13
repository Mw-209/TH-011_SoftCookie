import { apiFetch } from "./client";
import type { SkillCategory } from "./events";

export interface ParticipantInfo {
  id: string;
  name: string;
  email: string;
}

export interface RosterRegistration {
  id: string;
  registrationNumber: string;
  eventId: string;
  status: string;
  registeredAt: string;
  participant: ParticipantInfo;
}

export interface RosterEventSummary {
  id: string;
  eventCode: string;
  title: string;
  skillCategory: SkillCategory;
  skillHours: number;
  location: string;
  startAt: string;
  endAt: string;
  capacity: number;
  activeRegistrationsCount: number;
  remainingSeats: number;
  organizerId: string;
}

export interface EventRosterData {
  event: RosterEventSummary;
  registrations: RosterRegistration[];
}

export async function fetchEventRoster(
  eventId: string
): Promise<EventRosterData> {
  return apiFetch<EventRosterData>(`/api/events/${eventId}/registrations`);
}
