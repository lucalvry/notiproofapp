import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const items = [
  { to: "/content", label: "Library" },
  { to: "/content/calendar", label: "Calendar" },
  { to: "/content/channels", label: "Channels" },
  { to: "/content/analytics", label: "Analytics" },
  { to: "/content/review", label: "Bulk review" },
];

export function ContentSubNav() {
  return (
    <div className="flex items-center gap-1 border-b mb-6 overflow-x-auto">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === "/content"}
          className={({ isActive }) =>
            cn(
              "px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap",
              isActive
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )
          }
        >
          {it.label}
        </NavLink>
      ))}
    </div>
  );
}
