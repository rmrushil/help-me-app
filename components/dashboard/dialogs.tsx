"use client";

import { useState } from "react";
import { btnClass, inputClass } from "./helpers";
import type { Task } from "./helpers";

// Runs an action, shows its error if it fails, and closes the dialog if it works.
// Every action returns an error message, or null when it succeeded.
function useAction(onClose: () => void) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<string | null>) {
    setBusy(true);
    setError("");
    const err = await fn();
    setBusy(false);
    if (err) setError(err);
    else onClose();
  }

  return { error, busy, run };
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={title}
        className="w-full max-w-md rounded-xl border border-[#3ddc97]/50 bg-[#050c0a] p-6 text-[#6dffc4] shadow-[0_0_30px_rgba(61,220,151,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="tracking-widest">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded px-2 opacity-60 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6dffc4]"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// One text box and one button. Used for "Create group" and "Join group".
export function PromptDialog({
  title,
  label,
  placeholder,
  submitLabel,
  onSubmit,
  onClose,
}: {
  title: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  onSubmit: (value: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const { error, busy, run } = useAction(onClose);
  const [value, setValue] = useState("");

  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) run(() => onSubmit(value.trim()));
        }}
        className="flex flex-col gap-4"
      >
        <label className="text-sm opacity-80">{label}</label>
        <input
          autoFocus
          className={inputClass}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={busy || !value.trim()} className={btnClass}>
          {busy ? "Working..." : submitLabel}
        </button>
      </form>
    </Modal>
  );
}

export function EditDialog({
  task,
  onSave,
  onClose,
}: {
  task: Task;
  onSave: (title: string, dueDate: string | null) => Promise<string | null>;
  onClose: () => void;
}) {
  const { error, busy, run } = useAction(onClose);
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.due_date ?? "");

  return (
    <Modal title="Edit task" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) run(() => onSave(title.trim(), dueDate || null));
        }}
        className="flex flex-col gap-4"
      >
        <label className="text-sm opacity-80">Task</label>
        <input
          autoFocus
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label className="text-sm opacity-80">Due date</label>
        <input
          type="date"
          className={inputClass}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={busy || !title.trim()} className={btnClass}>
          {busy ? "Saving..." : "Save changes"}
        </button>
      </form>
    </Modal>
  );
}

const EXTEND_PRESETS = [
  { label: "+1 day", days: 1 },
  { label: "+3 days", days: 3 },
  { label: "+1 week", days: 7 },
];

export function ExtendDialog({
  count,
  onExtendBy,
  onSetDate,
  onClose,
}: {
  count: number;
  onExtendBy: (days: number) => Promise<string | null>;
  onSetDate: (date: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const { error, busy, run } = useAction(onClose);
  const [date, setDate] = useState("");

  return (
    <Modal title={`Extend ${count} task${count === 1 ? "" : "s"}`} onClose={onClose}>
      <p className="mb-4 text-sm opacity-70">
        Presets push each deadline back from its current due date, or from today if it is
        already past or empty.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {EXTEND_PRESETS.map((p) => (
          <button
            key={p.days}
            disabled={busy}
            onClick={() => run(() => onExtendBy(p.days))}
            className={btnClass}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mb-2 text-sm opacity-70">Or pick an exact date</p>
      <div className="flex gap-2">
        <input
          type="date"
          className={`${inputClass} flex-1`}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button
          disabled={busy || !date}
          onClick={() => run(() => onSetDate(date))}
          className={btnClass}
        >
          Set date
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </Modal>
  );
}

export function AssignDialog({
  options,
  onAssign,
  onClose,
}: {
  options: { id: string; name: string }[];
  onAssign: (userId: string | null) => Promise<string | null>;
  onClose: () => void;
}) {
  const { error, busy, run } = useAction(onClose);

  return (
    <Modal title="Assign to" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            disabled={busy}
            onClick={() => run(() => onAssign(o.id))}
            className={`${btnClass} text-left`}
          >
            {o.name}
          </button>
        ))}
        <button
          disabled={busy}
          onClick={() => run(() => onAssign(null))}
          className={`${btnClass} text-left opacity-70`}
        >
          Unassigned
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </Modal>
  );
}
