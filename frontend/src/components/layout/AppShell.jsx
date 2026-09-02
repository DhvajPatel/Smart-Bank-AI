import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileNav from "./MobileNav";

const TITLES = {
  "/employee": ["Employee Dashboard", "Your daily workspace"],
  "/employee/customers": ["Customers", "Directory & search"],
  "/employee/finance": ["Finance", "Financial health"],
  "/employee/spending": ["Spending Analyzer", "Category insights"],
  "/employee/loans": ["Loan AI", "Risk engine"],
  "/employee/recommendations": ["Recommendations", "Product matching"],
  "/admin": ["Admin Overview", "Bank-wide statistics"],
  "/admin/customers": ["Customers", "Directory & search"],
  "/admin/analytics": ["Analytics", "Customer distributions"],
  "/admin/loans": ["Loan Portfolio", "Risk & performance"],
  "/admin/marketing": ["Marketing Intelligence", "Segments & targeting"],
  "/admin/models": ["AI Models", "System status"],
};

export default function AppShell() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean); // e.g. ["employee","customers","C100000"]
  const twoLevel = "/" + segments.slice(0, 2).join("/");
  const oneLevel = "/" + segments.slice(0, 1).join("/");
  const [title, subtitle] =
    TITLES[location.pathname] ?? TITLES[twoLevel] ?? TITLES[oneLevel] ?? ["SmartBank AI", ""];

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 p-6 pb-24 md:pb-6">
          <AnimatePresence mode="wait">
            <div key={location.pathname}>
              <Outlet />
            </div>
          </AnimatePresence>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
