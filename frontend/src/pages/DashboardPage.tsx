import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "../components/Navbar";
import { api } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import type { Project, Team } from "../types";

export default function DashboardPage() {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<Project[]>("/projects/"),
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: () => api.get<Team[]>("/teams/"),
  });

  const createProject = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      api.post<Project>("/projects/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      closeModals();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Помилка"),
  });

  const createTeam = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      api.post<Team>("/teams/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      closeModals();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Помилка"),
  });

  const closeModals = () => {
    setShowProjectModal(false);
    setShowTeamModal(false);
    setName("");
    setDescription("");
    setError("");
  };

  const canManage = user?.role === "admin" || user?.role === "team_lead";
  const canCreateTeam = canManage;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {/* Projects */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Мої проекти</h1>
              <p className="text-slate-400 text-sm">{projects.length} проект{projects.length !== 1 ? "и" : ""}</p>
            </div>
            {canManage && (
              <button
                onClick={() => setShowProjectModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm"
              >
                + Новий проект
              </button>
            )}
          </div>

          {projectsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-14 text-slate-400">
              <div className="text-4xl mb-3">📋</div>
              <p>Проектів поки немає</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:shadow-md hover:border-indigo-200 transition-all group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                      {p.name}
                    </h3>
                    <span className="text-slate-300 group-hover:text-indigo-400 transition-colors ml-2">→</span>
                  </div>
                  {p.description ? (
                    <p className="text-sm text-slate-500 line-clamp-2">{p.description}</p>
                  ) : (
                    <p className="text-sm text-slate-300 italic">Без опису</p>
                  )}
                  <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                    {new Date(p.created_at).toLocaleDateString("uk-UA", { day: "numeric", month: "long" })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Teams */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Мої команди</h2>
              <p className="text-slate-400 text-sm">{teams.length} команд{teams.length !== 1 ? "и" : "а"}</p>
            </div>
            {canCreateTeam && (
              <button
                onClick={() => setShowTeamModal(true)}
                className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors cursor-pointer shadow-sm"
              >
                + Нова команда
              </button>
            )}
          </div>

          {teamsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-sm">Команд немає{canCreateTeam ? " — створи першу" : ""}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigate(`/teams/${t.id}`)}
                  className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:shadow-md hover:border-amber-200 transition-all group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900 group-hover:text-amber-600 transition-colors">
                      {t.name}
                    </h3>
                    <span className="text-lg">👥</span>
                  </div>
                  {t.description && (
                    <p className="text-sm text-slate-500 line-clamp-2">{t.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                    {new Date(t.created_at).toLocaleDateString("uk-UA", { day: "numeric", month: "long" })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {(showProjectModal || showTeamModal) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {showProjectModal ? "Новий проект" : "Нова команда"}
            </h2>
            <div className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={showProjectModal ? "Назва проекту" : "Назва команди"}
                autoFocus
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder-slate-400"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Опис (необов'язково)"
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder-slate-400 resize-none"
              />
              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    if (!name.trim()) return;
                    setError("");
                    if (showProjectModal) createProject.mutate({ name, description });
                    else createTeam.mutate({ name, description });
                  }}
                  disabled={createProject.isPending || createTeam.isPending || !name.trim()}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  Створити
                </button>
                <button
                  onClick={closeModals}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-medium hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Скасувати
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
