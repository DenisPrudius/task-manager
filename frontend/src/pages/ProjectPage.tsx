import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "../components/Navbar";
import TaskModal from "../components/TaskModal";
import { api } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import type { Task, TaskStatus, Project, Team } from "../types";

const COLUMNS: { status: TaskStatus; label: string; bg: string; dot: string }[] = [
  { status: "todo", label: "To Do", bg: "bg-slate-50", dot: "bg-slate-400" },
  { status: "in_progress", label: "In Progress", bg: "bg-amber-50", dot: "bg-amber-400" },
  { status: "done", label: "Done", bg: "bg-emerald-50", dot: "bg-emerald-400" },
];

const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};
const PRIORITY_LABEL: Record<string, string> = {
  low: "Низький", medium: "Середній", high: "Високий",
};

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canEdit = user?.role === "admin" || user?.role === "team_lead";
  const isMember = user?.role === "member";

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const draggingTaskRef = useRef<Task | null>(null);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.get<Project>(`/projects/${projectId}`),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => api.get<Task[]>(`/tasks/project/${projectId}`),
  });

  // Member needs their teams to know which team-tasks they can drag
  const { data: myTeams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: () => api.get<Team[]>("/teams/"),
    enabled: isMember,
  });

  const deleteTask = useMutation({
    mutationFn: (taskId: number) => api.delete(`/tasks/${taskId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      api.patch<Task>(`/tasks/${taskId}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const myTeamIds = myTeams.map((t) => t.id);

  const canDragTask = (task: Task) => {
    if (canEdit) return true;
    if (task.assignee_id === user?.id) return true;
    if (task.team_id && myTeamIds.includes(task.team_id)) return true;
    return false;
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    draggingTaskRef.current = task;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const task = draggingTaskRef.current;
    if (!task || task.status === targetStatus) return;
    draggingTaskRef.current = null;
    updateStatus.mutate({ taskId: task.id, status: targetStatus });
  };

  const byStatus = (s: TaskStatus) => tasks.filter((t) => t.status === s);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/")} className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer text-sm font-medium">
            ← Назад
          </button>
          <span className="text-slate-300">/</span>
          <h1 className="text-2xl font-bold text-slate-900">{project?.name ?? "Проект"}</h1>
          {project?.description && (
            <p className="text-slate-500 text-sm hidden md:block truncate max-w-xs">{project.description}</p>
          )}
        </div>

        {isMember && (
          <p className="text-sm text-slate-400 mb-4">
            Перетягуй свої задачі між колонками щоб оновити статус
          </p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {COLUMNS.map(({ status, label, bg, dot }) => {
              const columnTasks = byStatus(status);
              const isOver = dragOverCol === status;
              return (
                <div
                  key={status}
                  className={`${bg} rounded-xl p-4 min-h-64 transition-all ${isOver ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverCol(status); }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${dot}`} />
                      <span className="font-semibold text-slate-700 text-sm">{label}</span>
                      <span className="text-xs text-slate-400 bg-white px-1.5 py-0.5 rounded-full border border-slate-200">
                        {columnTasks.length}
                      </span>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => setCreateStatus(status)}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-indigo-600 hover:bg-white transition-all cursor-pointer text-lg leading-none"
                        title="Додати задачу"
                      >
                        +
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {columnTasks.map((task) => {
                      const draggable = canDragTask(task);
                      return (
                        <div
                          key={task.id}
                          draggable={draggable}
                          onDragStart={draggable ? (e) => handleDragStart(e, task) : undefined}
                          onDragEnd={() => { draggingTaskRef.current = null; setDragOverCol(null); }}
                          onClick={() => setSelectedTask(task)}
                          className={`bg-white rounded-lg p-3 shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition-all group
                            ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                        >
                          <p className="text-sm font-medium text-slate-800 group-hover:text-indigo-700 transition-colors">
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center justify-between mt-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority]}`}>
                              {PRIORITY_LABEL[task.priority]}
                            </span>
                            {task.due_date && (
                              <span className="text-xs text-slate-400">
                                📅 {new Date(task.due_date).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}
                              </span>
                            )}
                          </div>
                          {isMember && !task.assignee_id && !task.team_id && (
                            <p className="text-xs text-indigo-500 mt-2 font-medium">Вільна — можна приєднатись</p>
                          )}
                        </div>
                      );
                    })}

                    {columnTasks.length === 0 && canEdit && (
                      <button
                        onClick={() => setCreateStatus(status)}
                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-300 text-sm hover:border-indigo-300 hover:text-indigo-400 transition-colors cursor-pointer"
                      >
                        + Додати задачу
                      </button>
                    )}
                    {columnTasks.length === 0 && isMember && (
                      <div className="w-full py-4 text-center text-slate-300 text-sm">Немає задач</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {canEdit && createStatus !== null && (
        <TaskModal
          projectId={projectId}
          defaultStatus={createStatus}
          canEdit={true}
          onClose={() => setCreateStatus(null)}
        />
      )}

      {selectedTask && (
        <TaskModal
          projectId={projectId}
          task={selectedTask}
          canEdit={canEdit}
          onClose={() => setSelectedTask(null)}
          onDelete={canEdit ? () => { deleteTask.mutate(selectedTask.id); setSelectedTask(null); } : undefined}
        />
      )}
    </div>
  );
}
