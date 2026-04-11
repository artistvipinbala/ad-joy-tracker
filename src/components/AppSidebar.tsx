import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Table,
  CalendarRange,
  Receipt,
  Calculator,
  BrainCircuit,
  Settings,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/daily", icon: Table, label: "Daily Data" },
  { to: "/monthly", icon: CalendarRange, label: "Monthly" },
  { to: "/expenses", icon: Receipt, label: "Expenses & Sales" },
  { to: "/profit", icon: Calculator, label: "Profit" },
  { to: "/advisor", icon: BrainCircuit, label: "AI Advisor" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6 border-b border-sidebar-border flex items-center gap-3">
        <img src={logo} alt="Logo" className="h-10 w-10 rounded-lg" />
        <div>
          <h1 className="text-lg font-bold text-sidebar-primary-foreground">
            Artist Vipin Bala
          </h1>
          <p className="text-xs text-sidebar-foreground/60">
            Facebook Ads + TagMango
          </p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/50">Currency: ₹ INR</p>
      </div>
    </aside>
  );
}
