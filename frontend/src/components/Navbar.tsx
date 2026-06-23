import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    queryClient.clear(); // очищаємо кеш при виході
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <Link to="/" className="text-lg font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
        ✓ Task Manager
      </Link>
      {user && (
        <div className="flex items-center gap-4">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
            {user.role === "admin" ? "👑 Admin" : user.role === "team_lead" ? "⭐ Team Lead" : "Member"}
          </span>
          <span className="text-sm text-slate-500 hidden sm:block">@{user.username}</span>
          {user.role === "admin" && (
            <Link to="/admin" className="text-sm text-indigo-500 hover:text-indigo-700 transition-colors">
              Адмін
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
          >
            Вийти
          </button>
        </div>
      )}
    </nav>
  );
}
