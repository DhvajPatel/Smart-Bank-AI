import { useState, useEffect } from "react";
import { Sun, Moon, LogOut } from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import PageHeader from "../../components/layout/PageHeader";
import { useAuth } from "../../context/AuthContext";

function getInitialTheme() {
  return localStorage.getItem("smartbank_theme") || "dark";
}

export default function Settings() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(getInitialTheme);

  // Apply theme to <html> element and persist
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
    localStorage.setItem("smartbank_theme", theme);
  }, [theme]);

  return (
    <AnimatedPage>
      <PageHeader eyebrow="Workspace" title="Settings" description="Session and appearance preferences." />

      <div className="glass rounded-2xl p-6 max-w-lg space-y-6">
        {/* User info */}
        <div>
          <p className="text-xs text-muted mb-1">Signed in as</p>
          <p className="text-sm font-medium">{user?.name}</p>
          {user?.customer_id && (
            <p className="text-xs text-muted mt-0.5">ID: {user.customer_id}</p>
          )}
          <p className="text-xs text-muted capitalize mt-0.5">{user?.role} access</p>
        </div>

        {/* Theme toggle */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            <p className="text-sm font-medium">Appearance</p>
            <p className="text-xs text-muted mt-0.5">
              {theme === "dark" ? "Dark mode active" : "Light mode active"}
            </p>
          </div>
          <div className="flex gap-1.5 p-1 rounded-lg bg-white/5 border border-border">
            <button
              onClick={() => setTheme("light")}
              className={`h-8 w-8 rounded-md flex items-center justify-center transition-all duration-200 ${
                theme === "light"
                  ? "bg-primary/20 text-accent"
                  : "text-muted hover:text-text hover:bg-white/5"
              }`}
              title="Light mode"
            >
              <Sun className="h-4 w-4" />
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`h-8 w-8 rounded-md flex items-center justify-center transition-all duration-200 ${
                theme === "dark"
                  ? "bg-primary/20 text-accent"
                  : "text-muted hover:text-text hover:bg-white/5"
              }`}
              title="Dark mode"
            >
              <Moon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-danger/30 text-danger py-2.5 text-sm font-medium hover:bg-danger/10 hover:border-danger/50 active:scale-[0.99] transition-all duration-200"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </AnimatedPage>
  );
}
