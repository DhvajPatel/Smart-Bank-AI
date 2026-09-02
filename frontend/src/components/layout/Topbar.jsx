import { useState, useRef, useEffect, useCallback } from "react";
import { Bell, LogOut, Search, X, CheckCircle, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { listCustomers } from "../../services/api";

const DEMO_NOTIFICATIONS = [
  { id: 1, title: "Loan application reviewed", body: "Application #L300042 has been processed.", time: "2m ago", read: false },
  { id: 2, title: "New customer registered", body: "Aarav Sharma joined via mobile banking.", time: "18m ago", read: false },
  { id: 3, title: "Model retrained", body: "Loan Risk V2 deployed — AUC improved.", time: "1h ago", read: true },
  { id: 4, title: "Anomaly detected", body: "Unusual transaction pattern on C100892.", time: "3h ago", read: true },
];

const riskStyle = {
  Low: "bg-success/10 text-success",
  Medium: "bg-warning/10 text-warning",
  Elevated: "bg-warning/10 text-warning",
  High: "bg-danger/10 text-danger",
  Unknown: "bg-white/10 text-muted",
};

export default function Topbar({ title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── Notifications ────────────────────────────────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS);
  const bellRef = useRef(null);
  const panelRef = useRef(null);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClick(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        bellRef.current && !bellRef.current.contains(e.target)
      ) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const dismiss = (id) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  // ── Global search ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const searchPanelRef = useRef(null);
  const debounceRef = useRef(null);

  const base = user?.role === "admin" ? "/admin" : "/employee";

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (
        searchPanelRef.current && !searchPanelRef.current.contains(e.target) &&
        searchRef.current && !searchRef.current.contains(e.target)
      ) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search
  const doSearch = useCallback(
    (term) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!term.trim()) {
        setSearchResults([]);
        setSearchOpen(false);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setSearchLoading(true);
        try {
          const res = await listCustomers({ search: term, limit: 6 });
          setSearchResults(res.items ?? []);
          setSearchOpen(true);
        } catch {
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, 280);
    },
    []
  );

  const handleSearchChange = (e) => {
    const v = e.target.value;
    setSearchQuery(v);
    doSearch(v);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchResults.length === 1) {
      goToCustomer(searchResults[0].customer_id);
    } else if (searchQuery.trim()) {
      // Navigate to customers page with search pre-filled
      navigate(`${base}/customers`, { state: { search: searchQuery.trim() } });
      clearSearch();
    }
  };

  const goToCustomer = (id) => {
    navigate(`${base}/customers/${id}`);
    clearSearch();
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") clearSearch(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="h-16 border-b border-border bg-surface/40 backdrop-blur-md flex items-center justify-between px-6 gap-4 sticky top-0 z-20">
      <div className="min-w-0">
        <h1 className="font-display font-semibold text-[15px] leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2.5">

        {/* ── Global customer search (admin only) ───────────────────────── */}
        {user?.role === "admin" && <div className="relative hidden lg:block" ref={searchRef}>
          <form onSubmit={handleSearchSubmit}>
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 w-64 transition-all duration-200
              ${searchOpen || searchQuery
                ? "border-primary/50 bg-white/8 shadow-lg shadow-primary/5"
                : "border-border bg-white/5 hover:border-primary/40 hover:bg-white/8"
              }`}>
              <Search className="h-4 w-4 text-muted shrink-0" />
              <input
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchQuery && setSearchOpen(true)}
                placeholder="Search customer ID or name…"
                className="bg-transparent outline-none text-xs text-text placeholder:text-muted/60 w-full"
              />
              {searchQuery && (
                <button type="button" onClick={clearSearch} className="text-muted/50 hover:text-danger transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>

          <AnimatePresence>
            {searchOpen && (
              <motion.div
                ref={searchPanelRef}
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute left-0 top-11 w-80 glass rounded-2xl shadow-2xl border border-border overflow-hidden z-50"
              >
                {searchLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted">
                    <div className="h-4 w-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                    <span className="text-xs">Searching…</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted">
                    No customers found for "<span className="text-text">{searchQuery}</span>"
                  </div>
                ) : (
                  <div>
                    <div className="px-4 py-2 border-b border-border/50">
                      <p className="text-[10px] text-muted uppercase tracking-wider font-medium">
                        {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {searchResults.map((c) => (
                      <button
                        key={c.customer_id}
                        onClick={() => goToCustomer(c.customer_id)}
                        className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0 hover:bg-white/[0.04] transition-colors text-left"
                      >
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold shrink-0">
                          {(c.name ?? c.customer_id)[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.name ?? c.customer_id}</p>
                          <p className="text-xs text-muted truncate">{c.customer_id} · {c.city ?? "—"} · Score {c.credit_score}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${riskStyle[c.risk_band] ?? riskStyle.Unknown}`}>
                            {c.risk_band}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted" />
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        navigate(`${base}/customers`, { state: { search: searchQuery } });
                        clearSearch();
                      }}
                      className="w-full px-4 py-2.5 text-xs text-primary hover:bg-primary/5 transition-colors text-center border-t border-border/50"
                    >
                      View all results in Customers →
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>}

        {/* ── Notification bell ─────────────────────────────────────────── */}
        <div className="relative">
          <button
            ref={bellRef}
            onClick={() => setNotifOpen((v) => !v)}
            className="relative h-9 w-9 rounded-lg border border-border bg-white/5 flex items-center justify-center hover:bg-white/10 hover:border-primary/30 active:scale-95 transition-all duration-200"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-danger flex items-center justify-center text-[10px] font-bold">
                {unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                ref={panelRef}
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute right-0 top-11 w-80 glass rounded-2xl shadow-2xl border border-border overflow-hidden z-50"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">Notifications</p>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-primary hover:text-accent transition-colors">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-muted">
                      <CheckCircle className="h-6 w-6 text-success" />
                      <p className="text-xs">You're all caught up!</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors hover:bg-white/[0.03] ${!n.read ? "bg-primary/5" : ""}`}
                      >
                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.read ? "bg-muted/30" : "bg-primary"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{n.title}</p>
                          <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-muted/60 mt-1">{n.time}</p>
                        </div>
                        <button onClick={() => dismiss(n.id)} className="text-muted/50 hover:text-danger transition-colors mt-0.5">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── User info ─────────────────────────────────────────────────── */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold shrink-0">
            {user?.name?.[0] ?? "U"}
          </div>
          <div className="text-xs leading-tight">
            <p className="font-medium truncate max-w-[100px]">{user?.name}</p>
            <p className="text-muted capitalize">{user?.role}</p>
          </div>
        </div>

        {/* ── Sign out ─────────────────────────────────────────────────── */}
        <button
          onClick={logout}
          className="h-9 w-9 rounded-lg border border-border bg-white/5 flex items-center justify-center hover:bg-danger/10 hover:text-danger hover:border-danger/30 active:scale-95 transition-all duration-200"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
