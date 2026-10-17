"use client";

import { useState } from "react";
import {
  btnClass,
  elapsed,
  formatDate,
  formatDateTime,
  inputClass,
  todayString,
} from "./helpers";
import type { Group, Task, View } from "./helpers";

const EMPTY_MESSAGES: Record<View, string> = {
  home: "No open tasks here. Add one below.",
  overdue: "Nothing is overdue.",
  completed: "No completed tasks yet.",
};

type TableProps = {
  tasks: Task[];
  view: View;
  groups: Group[];
  groupName: Map<string, string>;
  profileName: Map<string, string>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  now: number;
  defaultGroupId: string; // "" means personal
  onAdd: (title: string, dueDate: string, groupId: string) => Promise<string | null>;
};

export default function TaskTable({
  tasks,
  view,
  groups,
  groupName,
  profileName,
  selected,
  onToggle,
  onToggleAll,
  now,
  defaultGroupId,
  onAdd,
}: TableProps) {
  const today = todayString();
  const completedView = view === "completed";
  const allSelected = tasks.length > 0 && tasks.every((t) => selected.has(t.id));

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#3ddc97]/30 opacity-70">
              <th className="w-10 py-2">
                <input
                  type="checkbox"
                  aria-label="Select all tasks"
                  checked={allSelected}
                  onChange={onToggleAll}
                  className="h-4 w-4 cursor-pointer accent-[#3ddc97]"
                />
              </th>
              <th className="py-2 pr-3 font-normal">Task</th>
              <th className="py-2 pr-3 font-normal">Due date</th>
              <th className="py-2 pr-3 font-normal">
                {completedView ? "Completed" : "Time elapsed"}
              </th>
              <th className="py-2 pr-3 font-normal">Date created</th>
              <th className="py-2 font-normal">Responsible party</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const overdue = !t.is_done && t.due_date !== null && t.due_date < today;
              const dueToday = !t.is_done && t.due_date === today;
              const gName = t.group_id ? groupName.get(t.group_id) : undefined;
              const assignee = t.assigned_to
                ? (profileName.get(t.assigned_to) ?? "Unknown")
                : null;
              const completedBy = t.completed_by
                ? (profileName.get(t.completed_by) ?? "Unknown")
                : null;
              const isSelected = selected.has(t.id);

              return (
                <tr
                  key={t.id}
                  className={`border-b border-[#3ddc97]/10 ${
                    isSelected ? "bg-[#3ddc97]/10" : "hover:bg-[#3ddc97]/5"
                  }`}
                >
                  <td className="py-2">
                    <input
                      type="checkbox"
                      aria-label={`Select ${t.title}`}
                      checked={isSelected}
                      onChange={() => onToggle(t.id)}
                      className="h-4 w-4 cursor-pointer accent-[#3ddc97]"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <span className={t.is_done ? "line-through opacity-60" : ""}>
                      {t.title}
                    </span>
                    {gName && (
                      <span className="ml-2 rounded border border-[#3ddc97]/30 px-1.5 py-0.5 text-[11px] opacity-70">
                        {gName}
                      </span>
                    )}
                  </td>
                  <td
                    className={`py-2 pr-3 ${
                      overdue ? "text-red-400" : dueToday ? "text-yellow-300" : ""
                    }`}
                  >
                    {t.due_date ? (
                      <>
                        {formatDate(t.due_date)}
                        {overdue && (
                          <span className="ml-2 rounded border border-red-400/60 px-1 text-[11px]">
                            Overdue
                          </span>
                        )}
                        {dueToday && (
                          <span className="ml-2 rounded border border-yellow-300/60 px-1 text-[11px]">
                            Today
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="opacity-40">No date</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {completedView ? (
                      t.completed_at ? (
                        <>
                          {formatDateTime(t.completed_at)}
                          {completedBy && (
                            <span className="opacity-60">, by {completedBy}</span>
                          )}
                        </>
                      ) : (
                        <span className="opacity-40">Unknown</span>
                      )
                    ) : (
                      <span className={overdue ? "text-red-400" : ""}>
                        {elapsed(t.created_at, now)}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 opacity-80">{formatDateTime(t.created_at)}</td>
                  <td className="py-2">
                    {t.group_id === null ? (
                      <span className="opacity-40">Personal task</span>
                    ) : assignee ? (
                      assignee
                    ) : (
                      <span className="opacity-40">Unassigned</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tasks.length === 0 && <p className="py-6 opacity-70">{EMPTY_MESSAGES[view]}</p>}

      {view === "home" && (
        <AddRow
          key={defaultGroupId}
          groups={groups}
          defaultGroupId={defaultGroupId}
          onAdd={onAdd}
        />
      )}
    </div>
  );
}

function AddRow({
  groups,
  defaultGroupId,
  onAdd,
}: {
  groups: Group[];
  defaultGroupId: string;
  onAdd: (title: string, dueDate: string, groupId: string) => Promise<string | null>;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [groupId, setGroupId] = useState(defaultGroupId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent){
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    const err = await onAdd(trimmed, dueDate, groupId);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setTitle("");
    setDueDate("");
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-wrap items-center gap-3">
      <span className="h-4 w-4 shrink-0 rounded-sm border border-[#3ddc97]/30" />
      <input
        aria-label="New task"
        className={`${inputClass} min-w-[12rem] flex-1`}
        placeholder="Add task"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        type="date"
        aria-label="Due date"
        className={inputClass}
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />
      <select
        aria-label="Group"
        className={inputClass}
        value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
      >
        <option value="">Personal</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <button type="submit" disabled={busy || !title.trim()} className={btnClass}>
        {busy ? "Adding..." : "Add task"}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
