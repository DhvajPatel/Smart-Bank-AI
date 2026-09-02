import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, PieChart, Landmark, Sparkles } from "lucide-react";

const items = [
  { to: "/employee", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/employee/customers", label: "Customers", icon: Users },
  { to: "/employee/spending", label: "Spending", icon: PieChart },
  { to: "/employee/loans", label: "Loans", icon: Landmark },
  { to: "/employee/recommendations", label: "AI", icon: Sparkles },
];

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface/90 backdrop-blur-md border-t border-border flex justify-around py-2">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] rounded-lg ${
              isActive ? "text-accent" : "text-muted"
            }`
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
