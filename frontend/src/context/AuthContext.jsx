import { createContext, useContext, useState, useCallback } from "react";
import { client } from "../services/api";

const AuthContext = createContext(null);
const STORAGE_KEY = "smartbank_session";

function readSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSession);

  /**
   * login(role, username, password)
   *
   * Admin:    username="Admin"        password="admin123"
   * Customer: username=<customer name> password=<customer_id e.g. C100042>
   *
   * Returns { ok: true, session } or { ok: false, message }
   */
  const login = useCallback(async (role, username, password) => {
    // ── Admin ──────────────────────────────────────────────
    if (role === "admin") {
      if (username === "Admin" && password === "admin123") {
        const session = { role: "admin", name: "Admin", username: "Admin" };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        setUser(session);
        return { ok: true, session };
      }
      return { ok: false, message: "Invalid admin credentials." };
    }

    // ── Customer ───────────────────────────────────────────
    // password is the customer_id; fetch customer list filtered by name
    const customerId = password.trim();
    const nameQuery  = username.trim();

    try {
      const res = await client.get("/customers", {
        params: { search: nameQuery, limit: 5 },
      });
      const match = res.data.items?.find(
        (c) =>
          c.customer_id.toLowerCase() === customerId.toLowerCase() &&
          c.name.toLowerCase() === nameQuery.toLowerCase()
      );

      if (!match) {
        return { ok: false, message: "Customer name or ID not found." };
      }

      const session = {
        role: "customer",
        name: match.name,
        username: match.name,
        customer_id: match.customer_id,
        city: match.city,
        credit_score: match.credit_score,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setUser(session);
      return { ok: true, session };
    } catch {
      return { ok: false, message: "Unable to reach the server. Try again." };
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
