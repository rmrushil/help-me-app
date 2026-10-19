"use client";

import { useState } from "react";
import { Modal } from "./dialogs";
import { btnClass, inputClass } from "./helpers";
import type { Group } from "./helpers";

export type MemberRow = { userId: string; name: string; role: "admin" | "member" };

type Props = {
  group: Group;
  members: MemberRow[];
  currentUserId: string;
  isAdmin: boolean;
  onRename: (name: string) => Promise<string | null>;
  onSetRole: (userId: string, role: "admin" | "member") => Promise<string | null>;
  onRemove: (userId: string) => Promise<string | null>;
  onResetCode: () => Promise<string | null>;
  onLeave: () => Promise<string | null>;
  onDelete: () => Promise<string | null>;
  onClose: () => void;
};

const smallBtn = `${btnClass} !px-2 !py-1 text-xs`;

export default function GroupPanel({
  group,
  members,
  currentUserId,
  isAdmin,
  onRename,
  onSetRole,
  onRemove,
  onResetCode,
  onLeave,
  onDelete,
  onClose,
}: Props) {
  const [name, setName] = useState(group.name);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const adminCount = members.filter((m) => m.role === "admin").length;
  const sorted = [...members].sort((a, b) => {
    if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  // Runs an action and shows its error, if any. Leaving or deleting also closes the panel.
  async function run(fn: () => Promise<string | null>, closeAfter = false) {
    setBusy(true);
    setError("");
    const err = await fn();
    setBusy(false);
    if (err) setError(err);
    else if (closeAfter) onClose();
  }

  async function copyCode() {
    await navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal title="Manage group" onClose={onClose}>
      <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto pr-1 text-sm">
        {/* Name */}
        <section className="flex flex-col gap-2">
          <h3 className="opacity-70">Group name</h3>
          {isAdmin ? (
            <div className="flex gap-2">
              <input
                className={`${inputClass} flex-1`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                disabled={busy || !name.trim() || name.trim() === group.name}
                onClick={() => run(() => onRename(name.trim()))}
                className={btnClass}
              >
                Save name
              </button>
            </div>
          ) : (
            <p>{group.name}</p>
          )}
        </section>

        {/* Members */}
        <section className="flex flex-col gap-2">
          <h3 className="opacity-70">
            Members ({members.length})
          </h3>
          <p className="text-xs opacity-60">
            Every member can add, edit, complete, and assign tasks. Admins can also manage
            members, reset the invite code, and delete any task in the group. A group can
            have as many admins as you like.
          </p>
          <ul>
            {sorted.map((m) => {
              const isYou = m.userId === currentUserId;
              const lastAdmin = m.role === "admin" && adminCount <= 1;
              return (
                <li
                  key={m.userId}
                  className="flex flex-wrap items-center gap-2 border-b border-[#3ddc97]/15 py-2"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {m.name}
                    {isYou ? " (you)" : ""}
                  </span>
                  <span
                    className={`rounded border px-1.5 text-[11px] ${
                      m.role === "admin"
                        ? "border-[#6dffc4]"
                        : "border-[#3ddc97]/30 opacity-70"
                    }`}
                  >
                    {m.role === "admin" ? "Admin" : "Member"}
                  </span>
                  {isAdmin && (
                    <>
                      <button
                        disabled={busy || lastAdmin}
                        title={lastAdmin ? "A group needs at least one admin" : ""}
                        onClick={() =>
                          run(() =>
                            onSetRole(m.userId, m.role === "admin" ? "member" : "admin")
                          )
                        }
                        className={smallBtn}
                      >
                        {m.role === "admin" ? "Make member" : "Make admin"}
                      </button>
                      {!isYou && (
                        <button
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(`Remove ${m.name} from ${group.name}?`)) {
                              run(() => onRemove(m.userId));
                            }
                          }}
                          className={smallBtn}
                        >
                          Remove
                        </button>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Invite code */}
        <section className="flex flex-col gap-2">
          <h3 className="opacity-70">Invite code</h3>
          <div className="flex flex-wrap items-center gap-2">
            <code className="tracking-widest">{group.invite_code}</code>
            <button onClick={copyCode} className={smallBtn}>
              {copied ? "Copied" : "Copy"}
            </button>
            {isAdmin && (
              <button
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Reset the invite code? The old code will stop working. People already in the group stay."
                    )
                  ) {
                    run(onResetCode);
                  }
                }}
                className={smallBtn}
              >
                Reset code
              </button>
            )}
          </div>
        </section>

        {/* Leave and delete */}
        <section className="flex flex-wrap gap-2 border-t border-[#3ddc97]/20 pt-4">
          <button
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Leave ${group.name}?`)) run(onLeave, true);
            }}
            className={btnClass}
          >
            Leave group
          </button>
          {isAdmin && (
            <button
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${group.name} and all of its tasks? This cannot be undone.`
                  )
                ) {
                  run(onDelete, true);
                }
              }}
              className={`${btnClass} border-red-400 text-red-400 hover:bg-red-500/15`}
            >
              Delete group
            </button>
          )}
        </section>

        {error && <p className="text-red-400">{error}</p>}
      </div>
    </Modal>
  );
}
