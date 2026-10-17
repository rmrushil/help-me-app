export type Group = { id: string; name: string; invite_code: string };
export type Member = { group_id: string; user_id: string; role: "admin" | "member" };
export type Profile = { id: string; display_name: string };

export type Task = {
  id: string;
  group_id: string | null; // null = personal task
  created_by: string;
  assigned_to: string | null;
  title: string;
  due_date: string | null; // "YYYY-MM-DD"
  is_done: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
};

export type View = "home" | "overdue" | "completed";

// "all", "personal", or the id of a group
export type Scope = string;

export const TASK_COLUMNS =
  "id, group_id, created_by, assigned_to, title, due_date, is_done, completed_at, completed_by, created_at";

// Turns whatever Supabase returned into a typed list (empty if nothing came back)
export function asRows<T>(data: unknown): T[] {
  return (data ?? []) as T[];
}

// Today's date as YYYY-MM-DD in the user's own time zone
export function todayString() {
  return new Date().toLocaleDateString("en-CA");
}

export function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d + days).toLocaleDateString("en-CA");
}

export function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// How long ago something happened, e.g. "5h 12m" or "3d 4h"
export function elapsed(iso: string, now: number) {
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export const inputClass =
  "rounded-md border border-[#3ddc97]/40 bg-black/40 px-3 py-2 text-sm text-[#6dffc4] placeholder:text-[#3ddc97]/50 focus:border-[#6dffc4] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#6dffc4] [color-scheme:dark]";

export const btnClass =
  "rounded-md border border-[#3ddc97] px-4 py-2 text-sm transition-colors hover:bg-[#3ddc97]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6dffc4] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent motion-reduce:transition-none";