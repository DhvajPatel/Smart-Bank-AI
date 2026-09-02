import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, Wallet, PieChart, Landmark, Sparkles, Settings,
  Building2, BarChart3, Megaphone, Cpu, TrendingUp, User,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const employeeNav = [
  { to: "/employee", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/employee/customers", label: "Customers", icon: Users },
  { to: "/employee/finance", label: "Finance", icon: Wallet },
  { to: "/employee/spending", label: "Spending Analyzer", icon: PieChart },
  { to: "/employee/loans", label: "Loan AI", icon: Landmark },
  { to: "/employee/recommendations", label: "Recommendations", icon: Sparkles },
];

const adminNav = [
  { to: "/admin", label: "Admin Overview", icon: Building2, end: true },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/loans", label: "Loan Portfolio", icon: TrendingUp },
  { to: "/admin/marketing", label: "Marketing Intelligence", icon: Megaphone },
  { to: "/admin/models", label: "AI Models", icon: Cpu },
];

// Customer only sees their own profile pages
function customerNav(customerId) {
  return [
    { to: "/employee", label: "My Dashboard", icon: LayoutDashboard, end: true },
    { to: `/employee/customers/${customerId}`, label: "My Profile", icon: User },
    { to: "/employee/spending", label: "My Spending", icon: PieChart },
    { to: "/employee/loans", label: "Loan Calculator", icon: Landmark },
    { to: "/employee/recommendations", label: "Recommendations", icon: Sparkles },
  ];
}

export default function Sidebar() {
  const { user } = useAuth();
  const items =
    user?.role === "admin"
      ? adminNav
      : user?.role === "customer"
      ? customerNav(user.customer_id)
      : employeeNav;

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-border bg-surface/60 backdrop-blur-md">
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-border">
        <img
          src="/smart bank ai icon.png"
          alt="SmartBank AI"
          className="h-8 w-8 rounded-lg object-cover shrink-0"
        />
        <div className="min-w-0">
          <span className="font-display font-semibold tracking-tight text-[15px] block truncate">
            SmartBank AI
          </span>
          {user?.role === "customer" && (
            <span className="text-[10px] text-accent font-medium">Customer Portal</span>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200 ${
                isActive
                  ? "bg-primary/15 text-text border border-primary/30"
                  : "text-muted hover:text-text hover:bg-white/5 border border-transparent"
              }`
            }
          >
            <Icon className="h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5">
        <NavLink
          to="settings"
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-muted hover:text-text hover:bg-white/5 transition-colors"
        >
          <Settings className="h-4.5 w-4.5" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
