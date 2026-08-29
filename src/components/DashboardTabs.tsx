import { Link } from "@tanstack/react-router";

const TABS = [
  { to: "/", label: "Attendance" },
  { to: "/timetable", label: "Time table" },
  { to: "/performance", label: "Marks" },
  { to: "/student-attendance", label: "Stud-Attendance" },
] as const;

export function DashboardTabs() {
  return (
    <nav
      className="flex flex-wrap items-center gap-1 rounded-2xl border border-destructive/40 bg-card p-1.5"
      aria-label="Dashboard sections"
    >
      {TABS.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className="rounded-xl border border-destructive/50 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
          activeProps={{
            className:
              "rounded-xl border border-destructive px-4 py-2 text-sm font-bold text-destructive-foreground bg-destructive",
          }}
          activeOptions={{ exact: true }}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
