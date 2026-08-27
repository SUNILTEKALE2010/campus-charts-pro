import { Link } from "@tanstack/react-router";

const TABS = [
  { to: "/", label: "Attendance" },
  { to: "/timetable", label: "Time table" },
] as const;

export function DashboardTabs() {
  return (
    <nav
      className="flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-card p-1.5"
      aria-label="Dashboard sections"
    >
      {TABS.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          activeProps={{
            className:
              "rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary",
          }}
          activeOptions={{ exact: true }}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
