import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "../components/Navbar";
import TaskModal from "../components/TaskModal";
import { api } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import type { Task, TeamDetail, User } from "../types";

const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};
const STATUS_BADGE: Record<string, string> = {
  todo: "bg-slate-100 text-slate-600",
  in_progress: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};
const STATUS_LABEL: Record<string, string> = { todo: "To Do", in_progress: "In Progress", done: "Done" };

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const teamId = Number(id);
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const queryClient = useQueryClient();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addUserId, setAddUserId] = useState("");
  const [addError, setAddError] = useState("");

  const { data: team } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => api.get<TeamDetail>(`/teams/${teamId}`),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["team-tasks", teamId],
    queryFn: () => api.get<Task[]>(`/teams/${teamId}/tasks`),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api.get<User[]>("/admin/users"),
    enabled: me?.role === "admin" || team?.leader_id === me?.id,
  });

  const addMember = useMutation({
    mutationFn: (userId: number) =>
      api.post(`/teams/${teamId}/members`, { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      setAddUserId("");
      setAddError("");
    },
    onError: (err) => setAddError(err instanceof Error ? err.message : "Помилка"),
  });

  const removeMember = useMutation({
    mutationFn: (userId: number) => api.delete(`/teams/${teamId}/members/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team", teamId] }),
  });

  const isLeaderOrAdmin =
    me?.role === "admin" || (team && team.leader_id === me?.id);

  const memberUsers = allUsers.filter((u) => team?.member_ids.includes(u.id));
  const nonMembers = allUsers.filter((u) => !team?.member_ids.includes(u.id));

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/")} className="text-slate-400 hover:text-indigo-600 text-sm cursor-pointer transition-colors">
            ← Назад
          </button>
          <span className="text-slate-300">/</span>
          <h1 className="text-2xl font-bold text-slate-900">{team?.name ?? "Команда"}</h1>
          {team?.description && (
            <p className="text-slate-500 text-sm hidden md:block">{team.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Members panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-800 mb-3 text-sm">
                Учасники ({team?.member_ids.length ?? 0})
              </h2>
              <div className="space-y-2">
                {memberUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-700">@{u.username}</span>
                      {u.id === team?.leader_id && (
                        <span className="ml-1 text-xs text-amber-600">⭐</span>
                      )}
                    </div>
                    {isLeaderOrAdmin && u.id !== team?.leader_id && (
                      <button
                        onClick={() => removeMember.mutate(u.id)}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {isLeaderOrAdmin && nonMembers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-medium text-slate-500 mb-2">Додати учасника</h3>
                  <div className="flex gap-2">
                    <select
                      value={addUserId}
                      onChange={(e) => setAddUserId(e.target.value)}
                      className="flex-1 text-xs border border-slate-300 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="">Вибрати...</option>
                      {nonMembers.map((u) => (
                        <option key={u.id} value={u.id}>@{u.username}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => addUserId && addMember.mutate(Number(addUserId))}
                      disabled={!addUserId}
                      className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  {addError && <p className="text-red-500 text-xs mt-1">{addError}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Tasks panel */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 text-sm">
                Задачі команди ({tasks.length})
              </h2>
            </div>
            {tasks.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
                <p>Задач ще немає</p>
                <p className="text-sm mt-1">Призначай задачі цій команді через проект</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-slate-800">{task.title}</p>
                      <div className="flex gap-1.5 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[task.status]}`}>
                          {STATUS_LABEL[task.status]}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{task.description}</p>
                    )}
                    {task.due_date && (
                      <p className="text-xs text-slate-400 mt-2">
                        📅 {new Date(task.due_date).toLocaleDateString("uk-UA")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedTask && (
        <TaskModal
          projectId={selectedTask.project_id}
          task={selectedTask}
          canEdit={isLeaderOrAdmin ?? false}
          onClose={() => setSelectedTask(null)}
          onDelete={isLeaderOrAdmin ? () => setSelectedTask(null) : undefined}
        />
      )}
    </div>
  );
}
