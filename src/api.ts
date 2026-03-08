/** API client for scavenger hunt backend */

import type { Clue, Hunt } from "./types";

const API =
  import.meta.env.VITE_API_URL != null && import.meta.env.VITE_API_URL !== ""
    ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
    : "/api";

export async function getHunt(prefix: string): Promise<Hunt> {
  const r = await fetch(`${API}/builder/hunts/${prefix}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function saveHunt(prefix: string, hunt: Hunt): Promise<void> {
  const r = await fetch(`${API}/builder/hunts/${prefix}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(hunt),
  });
  if (!r.ok) throw new Error(await r.text());
}

export async function uploadImage(prefix: string, file: File): Promise<{ key: string; url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${API}/builder/hunts/${prefix}/images`, {
    method: "POST",
    body: fd,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getPlayerHunt(prefix: string): Promise<Hunt> {
  const r = await fetch(`${API}/hunts/${prefix}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getGroupClues(prefix: string, groupId: string): Promise<Clue[]> {
  const r = await fetch(`${API}/hunts/${prefix}/groups/${groupId}/clues`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getCompletedClues(prefix: string, groupId: string): Promise<Clue[]> {
  const r = await fetch(`${API}/hunts/${prefix}/groups/${groupId}/completed`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function submitAnswer(
  prefix: string,
  groupId: string,
  clueId: string,
  answer: string
): Promise<{ correct: boolean; message: string; unlocked_next?: boolean; next_clue_ids?: string[] }> {
  const r = await fetch(`${API}/hunts/${prefix}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group_id: groupId, clue_id: clueId, answer }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getGroupStats(
  prefix: string,
  groupId: string
): Promise<{
  completed: number;
  total_attempts: number;
  clue_times: { clue_id: string; clue_name: string; seconds: number; attempts: number }[];
  attempts_by_clue: Record<string, number>;
}> {
  const r = await fetch(`${API}/hunts/${prefix}/groups/${groupId}/stats`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export function imageUrl(prefix: string, key: string): string {
  return `${API}/hunts/${prefix}/images/${key}`;
}

export function builderImageUrl(prefix: string, key: string): string {
  return `${API}/builder/hunts/${prefix}/images/${key}`;
}

