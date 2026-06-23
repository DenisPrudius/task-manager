import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import type { User, UserRole, TeamDetail } from "../types";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "👑 Admin",
  team_lead: "⭐ Team Lead",
  member: "Member",
};
const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  team_lead: "bg-amber-100 text-amber-700",
  member: "bg-slate-100 text-slate-600",
};

export default function AdminPage() {
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [newTeamLeaderId, setNewTeamLeaderId] = useState("");
  const [teamError, setTeamError] = useState("");
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);
  const [addMemberUserId, setAddMemberUserId] = useState<Record<number, string>>({});
  const [memberError, setMemberError] = useState<Record<number, string>>({});

  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api.get<User[]>("/admin/users"),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["admin", "teams"],
    queryFn: () => api.get<TeamDetail[]>("/admin/teams"),
  });

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: UserRole }) =>
      api.patch<User>(`/admin/users/${userId}/role`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const createTeam = useMutation({
    mutationFn: (data: { name: string; description: string; leader_id?: number }) =>
      api.post<TeamDetail>("/teams/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "teams"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setNewTeamName("");
      setNewTeamDesc("");
      setNewTeamLeaderId("");
      setTeamError("");
    },
    onError: (err) => setTeamError(err instanceof Error ? err.message : "Помилка"),
  });

  const addMember = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) =>
      api.post(`/teams/${teamId}/members`, { user_id: userId }),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "teams"] });
      setAddMemberUserId((prev) => ({ ...prev, [teamId]: "" }));
      setMemberError((prev) => ({ ...prev, [teamId]: "" }));
    },
    onError: (err, { teamId }) =>
      setMemberError((prev) => ({ ...prev, [teamId]: err instanceof Error ? err.message : "Помилка" })),
  });

  const removeMember = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) =>
      api.delete(`/teams/${teamId}/members/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "teams"] }),
  });

  const nonAdminUsers = users.filter((u) => u.role !== "admin");

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-slate-400 hover:text-indigo-600 transition-colors text-sm cursor-pointer">← Назад</button>
          <h1 className="text-2xl font-bold text-slate-900">Адмін панель</h1>
        </div>

        {/* Users */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Користувачі</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {users.map((u, i) => (
              <div key={u.id} className={`flex items-center justify-between px-5 py-3 ${i !== users.length - 1 ? "border-b border-slate-100" : ""}`}>
                <div>
                  <span className="font-medium text-slate-800">@{u.username}</span>
                  <span className="text-slate-400 text-sm ml-2">{u.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                  {u.id !== me?.id && (
                    <select
                      value={u.role}
                      onChange={(e) => updateRole.mutate({ userId: u.id, role: e.target.value as UserRole })}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                    >
                      <option value="member">Member</option>
                      <option value="team_lead">Team Lead</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Teams */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Команди</h2>

          <div className="space-y-3 mb-6">
            {teams.map((t) => {
              const leader = users.find((u) => u.id === t.leader_id);
              const memberUsers = users.filter((u) => t.member_ids.includes(u.id));
              const nonMembers = users.filter((u) => !t.member_ids.includes(u.id));
              const isExpanded = expandedTeamId === t.id;

              return (
                <div key={t.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedTeamId(isExpanded ? null : t.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{t.name}</p>
                      {t.description && <p className="text-sm text-slate-500">{t.description}</p>}
                      <p className="text-xs text-slate-400 mt-0.5">
                        Лідер: @{leader?.username ?? t.leader_id} · {t.member_ids.length} учасник{t.member_ids.length !== 1 ? "ів" : ""}
                      </p>
                    </div>
                    <span className="text-slate-400 text-sm">{isExpanded ? "▲" : "▼"}</span>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 border-t border-slate-100">
                      <h3 className="text-xs font-medium text-slate-500 mt-3 mb-2">Учасники</h3>
                      <div className="space-y-1.5 mb-3">
                        {memberUsers.map((u) => (
                          <div key={u.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-700">@{u.username}</span>
                              {u.id === t.leader_id && <span className="text-xs text-amber-600">⭐ лідер</span>}
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                            </div>
                            {u.id !== t.leader_id && (
                              <button
                                onClick={() => removeMember.mutate({ teamId: t.id, userId: u.id })}
                                className="text-xs text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                              >
                                Видалити
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {nonMembers.length > 0 && (
                        <div>
                          <h3 className="text-xs font-medium text-slate-500 mb-2">Додати учасника</h3>
                          <div className="flex gap-2">
                            <select
                              value={addMemberUserId[t.id] ?? ""}
                              onChange={(e) => setAddMemberUserId((prev) => ({ ...prev, [t.id]: e.target.value }))}
                              className="flex-1 text-sm border border-slate-300 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                              <option value="">Вибрати...</option>
                              {nonMembers.map((u) => (
                                <option key={u.id} value={u.id}>@{u.username} ({ROLE_LABELS[u.role]})</option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                const uid = addMemberUserId[t.id];
                                if (uid) addMember.mutate({ teamId: t.id, userId: Number(uid) });
                              }}
                              disabled={!addMemberUserId[t.id]}
                              className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                          {memberError[t.id] && <p className="text-red-500 text-xs mt-1">{memberError[t.id]}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {teams.length === 0 && <p className="text-slate-400 text-sm">Команд ще немає</p>}
          </div>

          {/* Create team form */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-md">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Нова команда</h3>
            <div className="space-y-2">
              <input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Назва команди"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                value={newTeamDesc}
                onChange={(e) => setNewTeamDesc(e.target.value)}
                placeholder="Опис (необов'язково)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Тімлід команди</label>
                <select
                  value={newTeamLeaderId}
                  onChange={(e) => setNewTeamLeaderId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Я (адмін)</option>
                  {nonAdminUsers.map((u) => (
                    <option key={u.id} value={u.id}>@{u.username} ({ROLE_LABELS[u.role]})</option>
                  ))}
                </select>
              </div>
              {teamError && <p className="text-red-500 text-xs">{teamError}</p>}
              <button
                onClick={() => {
                  if (!newTeamName.trim()) return;
                  createTeam.mutate({
                    name: newTeamName,
                    description: newTeamDesc,
                    ...(newTeamLeaderId ? { leader_id: Number(newTeamLeaderId) } : {}),
                  });
                }}
                disabled={createTeam.isPending || !newTeamName.trim()}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {createTeam.isPending ? "..." : "Створити команду"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
