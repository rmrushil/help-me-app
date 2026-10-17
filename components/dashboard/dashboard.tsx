"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AssignDialog, EditDialog, ExtendDialog, PromptDialog } from "./dialogs";
import TaskTable from "./task-table";
import { TASK_COLUMNS, addDays, asRows, btnClass, todayString } from "./helpers";
import type { Group, Member, Profile, Scope, Task, View } from "./helpers";

type DialogName = "create" | "join" | "edit" | "extend" | "assign" | null;

const VIEW_LABELS: Record<View, string> = {
  home: "Home",
  overdue: "Overdue",
  completed: "Completed",
};

export default function Dashboard({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  // Data from Supabase
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // What the user is looking at
  const [view, setView] = useState<View>("home");
  const [scope, setScope] = useState<Scope>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<DialogName>(null);

  // Small interface switches
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [groupsOpen, setGroupsOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const today = todayString();

  // Phones start with the sidebar closed so it doesn't cover the task list
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setSidebarOpen(false);
  }, []);

  // Keep "time elapsed" fresh
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadAll = useCallback(async () => {
    const [g, m, p, t] = await Promise.all([
      supabase.from("groups").select("id, name, invite_code").order("name"),
      supabase.from("group_members").select("group_id, user_id, role"),
      supabase.from("profiles").select("id, display_name"),
      supabase.from("tasks").select(TASK_COLUMNS),
    ]);
    const firstError = g.error ?? m.error ?? p.error ?? t.error;
    if (firstError) setError(firstError.message);
    setGroups(asRows<Group>(g.data));
    setMembers(asRows<Member>(m.data));
    setProfiles(asRows<Profile>(p.data));
    setTasks(asRows<Task>(t.data));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ---------- Derived data ----------
  const profileName = useMemo(
    () => new Map(profiles.map((p) => [p.id, p.display_name] as const)),
    [profiles]
  );
  const groupName = useMemo(
    () => new Map(groups.map((g) => [g.id, g.name] as const)),
    [groups]
  );

  // Tasks inside the chosen group (or all / personal)
  const scoped = useMemo(
    () =>
      tasks.filter((t) => {
        if (scope === "all") return true;
        if (scope === "personal") return t.group_id === null;
        return t.group_id === scope;
      }),
    [tasks, scope]
  );

  const counts = useMemo(() => {
    const open = scoped.filter((t) => !t.is_done);
    return {
      open: open.length,
      overdue: open.filter((t) => t.due_date !== null && t.due_date < today).length,
      done: scoped.length - open.length,
    };
  }, [scoped, today]);

  // Tasks for the chosen view (Home / Overdue / Completed), sorted
  const visible = useMemo(() => {
    const list = scoped.filter((t) => {
      if (view === "completed") return t.is_done;
      if (t.is_done) return false;
      if (view === "overdue") return t.due_date !== null && t.due_date < today;
      return true;
    });
    return list.sort((a, b) => {
      if (view === "completed") {
        return (b.completed_at ?? "").localeCompare(a.completed_at ?? "");
      }
      if (a.due_date && b.due_date && a.due_date !== b.due_date) {
        return a.due_date.localeCompare(b.due_date);
      }
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [scoped, view, today]);

  const selectedTasks = visible.filter((t) => selected.has(t.id));

  // Assigning only works when every selected task is in the same group
  const selectedGroupIds = new Set(selectedTasks.map((t) => t.group_id));
  const assignGroupId = selectedGroupIds.size === 1 ? [...selectedGroupIds][0] : null;
  const assignOptions = assignGroupId
    ? members
        .filter((m) => m.group_id === assignGroupId)
        .map((m) => ({
          id: m.user_id,
          name:
            (profileName.get(m.user_id) ?? "Unknown") +
            (m.user_id === userId ? " (you)" : ""),
        }))
    : [];

  const currentGroup = groups.find((g) => g.id === scope);
  const memberCount = members.filter((m) => m.group_id === scope).length;
  const scopeLabel =
    scope === "all" ? "All tasks" : scope === "personal" ? "Personal" : (currentGroup?.name ?? "Group");

  // ---------- Selection and navigation ----------
  function closeSidebarOnPhone() {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  function chooseView(v: View) {
    setView(v);
    setSelected(new Set());
    closeSidebarOnPhone();
  }

  function chooseScope(s: Scope) {
    setScope(s);
    setSelected(new Set());
    closeSidebarOnPhone();
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(
      selectedTasks.length === visible.length ? new Set() : new Set(visible.map((t) => t.id))
    );
  }

  // ---------- Task actions ----------
  function patchTasks(rows: Task[]) {
    const byId = new Map(rows.map((r) => [r.id, r] as const));
    setTasks((prev) => prev.map((t) => byId.get(t.id) ?? t));
  }

  // Updates each task with its own values. Returns an error message, or null if all worked.
  async function updateEach(
    updates: { id: string; values: Record<string, unknown> }[]
  ): Promise<string | null> {
    const results = await Promise.all(
      updates.map((u) =>
        supabase.from("tasks").update(u.values).eq("id", u.id).select(TASK_COLUMNS)
      )
    );
    patchTasks(results.flatMap((r) => asRows<Task>(r.data)));
    const failed = results.find((r) => r.error);
    if (failed?.error) return failed.error.message;
    if (results.some((r) => asRows<Task>(r.data).length === 0)) {
      return "Some tasks could not be updated. You may no longer have access to them.";
    }
    return null;
  }

  // Runs a dialog action, and clears the selection if it worked
  async function finish(action: Promise<string | null>) {
    const err = await action;
    if (!err) setSelected(new Set());
    return err;
  }

  async function completeSelected() {
    setError("");
    const err = await updateEach(
      selectedTasks.map((t) => ({ id: t.id, values: { is_done: view !== "completed" } }))
    );
    if (err) setError(err);
    setSelected(new Set());
  }

  async function deleteSelected() {
    const ids = selectedTasks.map((t) => t.id);
    if (ids.length === 0) return;
    const word = ids.length === 1 ? "this task" : `these ${ids.length} tasks`;
    if (!window.confirm(`Delete ${word}? This cannot be undone.`)) return;
    setError("");
    const { data, error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .in("id", ids)
      .select("id");
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    const removed = new Set(asRows<{ id: string }>(data).map((r) => r.id));
    setTasks((prev) => prev.filter((t) => !removed.has(t.id)));
    setSelected(new Set());
    if (removed.size < ids.length) {
      setError(
        `Deleted ${removed.size} of ${ids.length}. You can only delete tasks you created. Group admins can delete any task in their group.`
      );
    }
  }

  function extendBy(days: number) {
    return finish(
      updateEach(
        selectedTasks.map((t) => {
          const from = t.due_date && t.due_date > today ? t.due_date : today;
          return { id: t.id, values: { due_date: addDays(from, days) } };
        })
      )
    );
  }

  function setDueDateForSelected(date: string) {
    return finish(
      updateEach(selectedTasks.map((t) => ({ id: t.id, values: { due_date: date } })))
    );
  }

  function assignSelected(assignee: string | null) {
    return finish(
      updateEach(selectedTasks.map((t) => ({ id: t.id, values: { assigned_to: assignee } })))
    );
  }

  function saveEdit(title: string, dueDate: string | null) {
    const task = selectedTasks[0];
    if (!task) return Promise.resolve("Select a task first.");
    return finish(updateEach([{ id: task.id, values: { title, due_date: dueDate } }]));
  }

  async function addTask(title: string, dueDate: string, groupId: string) {
    const { data, error: insertError } = await supabase
      .from("tasks")
      .insert({ title, due_date: dueDate || null, group_id: groupId || null })
      .select(TASK_COLUMNS)
      .single();
    if (insertError) return insertError.message;
    setTasks((prev) => [...prev, data as unknown as Task]);
    return null;
  }

  // ---------- Group actions ----------
  async function createGroup(name: string) {
    const { data, error: rpcError } = await supabase.rpc("create_group", { group_name: name });
    if (rpcError) return rpcError.message;
    await loadAll();
    setScope(data as unknown as string);
    setView("home");
    setSelected(new Set());
    return null;
  }

  async function joinGroup(code: string) {
    const { data, error: rpcError } = await supabase.rpc("join_group", { code });
    if (rpcError) return rpcError.message;
    await loadAll();
    setScope(data as unknown as string);
    setView("home");
    setSelected(new Set());
    return null;
  }

  async function copyCode() {
    if (!currentGroup) return;
    await navigator.clipboard.writeText(currentGroup.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  const count = selectedTasks.length;

  return (
    <div className="hud-bg flex h-screen flex-col text-[#6dffc4]">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#3ddc97]/30 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            className="rounded-md border border-[#3ddc97]/40 px-2 py-1 hover:bg-[#3ddc97]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6dffc4]"
          >
            ☰
          </button>
          <span className="jarvis-text">HelpME</span>
          <span className="truncate text-sm opacity-60">
            / {scopeLabel} / {VIEW_LABELS[view]}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Account menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3ddc97]/60 hover:bg-[#3ddc97]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6dffc4]"
          >
            {email.charAt(0).toUpperCase()}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-40 mt-2 w-60 rounded-md border border-[#3ddc97]/40 bg-[#050c0a] p-3 text-sm shadow-lg">
                <p className="mb-3 break-all opacity-70">{email}</p>
                <button onClick={logout} className={`${btnClass} w-full`}>
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside
          className={`absolute left-0 top-0 z-20 h-full shrink-0 overflow-hidden border-[#3ddc97]/30 bg-[#07110d] transition-[width] duration-300 motion-reduce:transition-none md:static ${
            sidebarOpen ? "w-60 border-r" : "w-0"
          }`}
        >
          <nav className="flex w-60 flex-col gap-1 p-3">
            <NavItem
              label="Home"
              active={view === "home"}
              badge={counts.open}
              onClick={() => chooseView("home")}
            />

            <button
              onClick={() => setGroupsOpen((o) => !o)}
              aria-expanded={groupsOpen}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm opacity-80 hover:bg-[#3ddc97]/10 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6dffc4]"
            >
              <span>Groups</span>
              <span className="text-xs">{groupsOpen ? "▾" : "▸"}</span>
            </button>
            {groupsOpen && (
              <div className="ml-3 flex flex-col gap-1 border-l border-[#3ddc97]/20 pl-2">
                <NavItem
                  label="All tasks"
                  active={scope === "all"}
                  onClick={() => chooseScope("all")}
                />
                <NavItem
                  label="Personal"
                  active={scope === "personal"}
                  onClick={() => chooseScope("personal")}
                />
                {groups.map((g) => (
                  <NavItem
                    key={g.id}
                    label={g.name}
                    active={scope === g.id}
                    onClick={() => chooseScope(g.id)}
                  />
                ))}
                <div className="mt-1 flex gap-2">
                  <button
                    onClick={() => setDialog("create")}
                    className={`${btnClass} flex-1 !px-2 !py-1 text-xs`}
                  >
                    + Create
                  </button>
                  <button
                    onClick={() => setDialog("join")}
                    className={`${btnClass} flex-1 !px-2 !py-1 text-xs`}
                  >
                    Join
                  </button>
                </div>
              </div>
            )}

            <NavItem
              label="Overdue"
              active={view === "overdue"}
              badge={counts.overdue}
              danger
              onClick={() => chooseView("overdue")}
            />
            <NavItem
              label="Completed"
              active={view === "completed"}
              badge={counts.done}
              onClick={() => chooseView("completed")}
            />
          </nav>
        </aside>

        {/* Main area */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          {currentGroup && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-[#3ddc97]/30 px-3 py-2 text-sm">
              <span className="opacity-70">Invite code</span>
              <code className="tracking-widest">{currentGroup.invite_code}</code>
              <button
                onClick={copyCode}
                className="rounded text-xs underline opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6dffc4]"
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <span className="ml-auto opacity-70">
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </span>
            </div>
          )}

          {/* Action bar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDialog("edit")}
              disabled={count !== 1}
              title={count === 1 ? "" : "Select one task to edit"}
              className={btnClass}
            >
              Edit
            </button>
            <button onClick={deleteSelected} disabled={count === 0} className={btnClass}>
              Delete
            </button>
            <button onClick={completeSelected} disabled={count === 0} className={btnClass}>
              {view === "completed" ? "Reopen" : "Complete"}
            </button>
            <button
              onClick={() => setDialog("extend")}
              disabled={count === 0}
              className={btnClass}
            >
              Extend
            </button>
            <button
              onClick={() => setDialog("assign")}
              disabled={assignGroupId === null}
              title={
                assignGroupId === null
                  ? "Select tasks from one group to assign them"
                  : ""
              }
              className={btnClass}
            >
              Assign
            </button>
            <span className="ml-auto text-sm opacity-70">
              {count > 0 ? `${count} selected` : "Select tasks to use these actions"}
            </span>
          </div>

          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

          {loading ? (
            <p className="opacity-70">Loading tasks...</p>
          ) : (
            <TaskTable
              tasks={visible}
              view={view}
              groups={groups}
              groupName={groupName}
              profileName={profileName}
              selected={selected}
              onToggle={toggleOne}
              onToggleAll={toggleAll}
              now={now}
              defaultGroupId={currentGroup ? currentGroup.id : ""}
              onAdd={addTask}
            />
          )}
        </main>
      </div>

      {/* Dialogs */}
      {dialog === "create" && (
        <PromptDialog
          title="Create group"
          label="Group name"
          placeholder="For example: Apartment 4B"
          submitLabel="Create group"
          onSubmit={createGroup}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "join" && (
        <PromptDialog
          title="Join group"
          label="Invite code"
          placeholder="Paste the code you were given"
          submitLabel="Join group"
          onSubmit={joinGroup}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "edit" && selectedTasks.length === 1 && (
        <EditDialog
          task={selectedTasks[0]}
          onSave={saveEdit}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "extend" && count > 0 && (
        <ExtendDialog
          count={count}
          onExtendBy={extendBy}
          onSetDate={setDueDateForSelected}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "assign" && assignGroupId !== null && (
        <AssignDialog
          options={assignOptions}
          onAssign={assignSelected}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function NavItem({
  label,
  active,
  badge,
  danger,
  onClick,
}: {
  label: string;
  active: boolean;
  badge?: number;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6dffc4] motion-reduce:transition-none ${
        active
          ? "bg-[#3ddc97]/15 text-[#6dffc4]"
          : "opacity-80 hover:bg-[#3ddc97]/10 hover:opacity-100"
      }`}
    >
      <span className="truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={`ml-2 rounded-full px-2 text-xs ${
            danger ? "bg-red-500/20 text-red-400" : "bg-[#3ddc97]/20"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
