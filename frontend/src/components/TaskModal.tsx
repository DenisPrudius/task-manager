import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import type { ChecklistItem, Task, TaskStatus, TaskPriority, Team, User } from "../types";

interface TaskModalProps {
  projectId: number;
  task?: Task;
  defaultStatus?: TaskStatus;
  canEdit: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To Do", in_progress: "In Progress", done: "Done",
};
const STATUS_BADGE: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-600",
  in_progress: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};
const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Низький", medium: "Середній", high: "Високий",
};
const PRIORITY_BADGE: Record<TaskPriority, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

export default function TaskModal({ projectId, task, defaultStatus = "todo", canEdit, onClose, onDelete }: TaskModalProps) {
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const isEdit = !!task;
  const [error, setError] = useState("");
  const [newItemText, setNewItemText] = useState("");

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(task?.status ?? defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.split("T")[0] : "");
  const [assigneeId, setAssigneeId] = useState<string>(task?.assignee_id?.toString() ?? "");
  const [teamId, setTeamId] = useState<string>(task?.team_id?.toString() ?? "");

  const { data: allUsers = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api.get<User[]>("/admin/users"),
    enabled: canEdit,
  });

  const { data: allTeams = [] } = useQuery({
    queryKey: ["admin", "teams"],
    queryFn: () => api.get<Team[]>("/admin/teams"),
    enabled: canEdit,
  });

  // For team_lead: only show their own teams in dropdown
  const isTeamLead = me?.role === "team_lead";
  const teamsForDropdown = isTeamLead
    ? allTeams.filter((t) => t.leader_id === me?.id)
    : allTeams;

  const { data: checklist = [], refetch: refetchChecklist } = useQuery({
    queryKey: ["checklist", task?.id],
    queryFn: () => api.get<ChecklistItem[]>(`/tasks/${task!.id}/checklist`),
    enabled: !!task,
  });

  const invalidateTasks = () => queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });

  const createTask = useMutation({
    mutationFn: (data: object) => api.post<Task>("/tasks/", data),
    onSuccess: () => { invalidateTasks(); onClose(); },
    onError: (err) => setError(err instanceof Error ? err.message : "Помилка"),
  });

  const updateTask = useMutation({
    mutationFn: (data: object) => api.patch<Task>(`/tasks/${task!.id}`, data),
    onSuccess: () => { invalidateTasks(); onClose(); },
    onError: (err) => setError(err instanceof Error ? err.message : "Помилка"),
  });

  const joinTask = useMutation({
    mutationFn: () => api.post<Task>(`/tasks/${task!.id}/join`, {}),
    onSuccess: () => { invalidateTasks(); onClose(); },
    onError: (err) => setError(err instanceof Error ? err.message : "Помилка"),
  });

  const addItem = useMutation({
    mutationFn: (text: string) => api.post<ChecklistItem>(`/tasks/${task!.id}/checklist`, { text }),
    onSuccess: () => { refetchChecklist(); setNewItemText(""); },
    onError: (err) => setError(err instanceof Error ? err.message : "Помилка"),
  });

  const toggleItem = useMutation({
    mutationFn: ({ itemId, is_done }: { itemId: number; is_done: boolean }) =>
      api.patch<ChecklistItem>(`/tasks/${task!.id}/checklist/${itemId}`, { is_done }),
    onSuccess: () => refetchChecklist(),
  });

  const deleteItem = useMutation({
    mutationFn: (itemId: number) => api.delete(`/tasks/${task!.id}/checklist/${itemId}`),
    onSuccess: () => refetchChecklist(),
  });

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError("");
    const payload = {
      title,
      description: description || null,
      status: taskStatus,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      assignee_id: assigneeId ? Number(assigneeId) : null,
      team_id: teamId ? Number(teamId) : null,
      ...(isEdit ? {} : { project_id: projectId }),
    };
    isEdit ? updateTask.mutate(payload) : createTask.mutate(payload);
  };

  const doneCount = checklist.filter((i) => i.is_done).length;

  // ── Checklist component (shared between views) ────────────────────────────
  const ChecklistSection = () => (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500">
          Чеклист {checklist.length > 0 && `(${doneCount}/${checklist.length})`}
        </span>
        {checklist.length > 0 && (
          <div className="flex-1 mx-3 bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all"
              style={{ width: `${(doneCount / checklist.length) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="space-y-1.5 mb-2">
        {checklist.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={item.is_done}
              onChange={(e) => toggleItem.mutate({ itemId: item.id, is_done: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
            />
            <span className={`flex-1 text-sm ${item.is_done ? "line-through text-slate-400" : "text-slate-700"}`}>
              {item.text}
            </span>
            {canEdit && (
              <button
                onClick={() => deleteItem.mutate(item.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all text-lg leading-none cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="flex gap-2">
          <input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newItemText.trim()) addItem.mutate(newItemText); } }}
            placeholder="Новий пункт..."
            className="flex-1 text-sm px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800 placeholder-slate-400"
          />
          <button
            onClick={() => { if (newItemText.trim()) addItem.mutate(newItemText); }}
            disabled={!newItemText.trim()}
            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            +
          </button>
        </div>
      )}
    </div>
  );

  // ── Read-only view for members ────────────────────────────────────────────
  if (!canEdit && task) {
    const isMine = task.assignee_id === me?.id;
    const isTaken = task.assignee_id !== null && !isMine;
    const assigneeName = allUsers.find((u) => u.id === task.assignee_id)?.username;

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">{task.title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xl leading-none">×</button>
          </div>

          {task.description && <p className="text-sm text-slate-600 mb-4">{task.description}</p>}

          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[task.status]}`}>{STATUS_LABEL[task.status]}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PRIORITY_BADGE[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
          </div>

          {task.due_date && (
            <p className="text-sm text-slate-500 mb-4">
              📅 {new Date(task.due_date).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}

          {task.assignee_id ? (
            <div className={`rounded-lg px-3 py-2 text-sm mb-2 ${isMine ? "bg-indigo-50 text-indigo-700" : "bg-slate-50 text-slate-600"}`}>
              {isMine ? "✓ Ви виконавець цієї задачі" : `Виконавець: @${assigneeName ?? task.assignee_id}`}
            </div>
          ) : (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 mb-2">Виконавця ще немає — задача вільна</div>
          )}

          <ChecklistSection />

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg mt-3">{error}</p>}

          <div className="flex gap-2 mt-4">
            {!isTaken && !isMine && (
              <button
                onClick={() => joinTask.mutate()}
                disabled={joinTask.isPending}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {joinTask.isPending ? "..." : "Приєднатись до задачі"}
              </button>
            )}
            <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-medium hover:bg-slate-200 transition-colors cursor-pointer">
              Закрити
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Edit / Create view for admin & team_lead ──────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">{isEdit ? "Редагувати задачу" : "Нова задача"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Назва задачі"
            required
            autoFocus
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder-slate-400"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опис (необов'язково)"
            rows={2}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder-slate-400 resize-none"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Статус</label>
              <select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value as TaskStatus)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm">
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Пріоритет</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm">
                <option value="low">Низький</option>
                <option value="medium">Середній</option>
                <option value="high">Високий</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Дедлайн</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 text-sm" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Команда{isTeamLead && " (тільки ваша)"}</label>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm">
              <option value="">Без команди</option>
              {teamsForDropdown.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Виконавець</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm">
              <option value="">Не призначено</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>@{u.username}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={createTask.isPending || updateTask.isPending} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors cursor-pointer">
              {createTask.isPending || updateTask.isPending ? "..." : isEdit ? "Зберегти" : "Створити"}
            </button>
            {onDelete && (
              <button type="button" onClick={onDelete} className="px-4 bg-red-50 text-red-500 py-2.5 rounded-lg font-medium hover:bg-red-100 transition-colors cursor-pointer border border-red-200">
                🗑
              </button>
            )}
            <button type="button" onClick={onClose} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-medium hover:bg-slate-200 transition-colors cursor-pointer">
              Скасувати
            </button>
          </div>
        </form>

        {isEdit && <ChecklistSection />}
      </div>
    </div>
  );
}
