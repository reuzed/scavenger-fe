/** API client for scavenger hunt backend */

import type { Clue, Hunt } from "./types";

const API =
  import.meta.env.VITE_API_URL != null && import.meta.env.VITE_API_URL !== ""
    ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
    : "/api";

const FETCH_TIMEOUT_MS = 20000;
const FETCH_RETRIES = 2;

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = FETCH_RETRIES
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const r = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!r.ok && r.status >= 500 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      return r;
    } catch (e) {
      clearTimeout(timeoutId);
      lastError = e;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastError;
}

export async function getHunt(prefix: string): Promise<Hunt> {
  const r = await fetchWithRetry(`${API}/builder/hunts/${prefix}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function saveHunt(prefix: string, hunt: Hunt): Promise<void> {
  const r = await fetchWithRetry(`${API}/builder/hunts/${prefix}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(hunt),
  });
  if (!r.ok) throw new Error(await r.text());
}

export async function uploadImage(prefix: string, file: File): Promise<{ key: string; url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetchWithRetry(`${API}/builder/hunts/${prefix}/images`, {
    method: "POST",
    body: fd,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getPlayerHunt(prefix: string): Promise<Hunt> {
  const r = await fetchWithRetry(`${API}/hunts/${prefix}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getGroupClues(prefix: string, groupId: string): Promise<Clue[]> {
  const r = await fetchWithRetry(`${API}/hunts/${prefix}/groups/${groupId}/clues`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getCompletedClues(prefix: string, groupId: string): Promise<Clue[]> {
  const r = await fetchWithRetry(`${API}/hunts/${prefix}/groups/${groupId}/completed`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function submitAnswer(
  prefix: string,
  groupId: string,
  clueId: string,
  answer: string
): Promise<{ correct: boolean; message: string; unlocked_next?: boolean; next_clue_ids?: string[] }> {
  const r = await fetchWithRetry(`${API}/hunts/${prefix}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group_id: groupId, clue_id: clueId, answer }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function setRoomNext(prefix: string, groupId: string): Promise<{ room_id: string; room_name: string }> {
  const r = await fetchWithRetry(`${API}/hunts/${prefix}/groups/${groupId}/room/next`, { method: "POST" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function setRoomPrev(prefix: string, groupId: string): Promise<{ room_id: string; room_name: string }> {
  const r = await fetchWithRetry(`${API}/hunts/${prefix}/groups/${groupId}/room/prev`, { method: "POST" });
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
  const r = await fetchWithRetry(`${API}/hunts/${prefix}/groups/${groupId}/stats`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export function imageUrl(prefix: string, key: string): string {
  return `${API}/hunts/${prefix}/images/${key}`;
}

export function builderImageUrl(prefix: string, key: string): string {
  return `${API}/builder/hunts/${prefix}/images/${key}`;
}

