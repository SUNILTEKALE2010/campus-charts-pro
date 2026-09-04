import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getFaculty, type FacultyRow } from "@/lib/faculty.functions";
import { getTimetable } from "@/lib/timetable.functions";
import { buildFacultyYears, yearsForFaculty } from "@/lib/timetable-years";
import { FacultyPhoto } from "@/components/FacultyPhoto";
import { DashboardTabs } from "@/components/DashboardTabs";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Faculty Management Dashboard | Department Hours Overview" },
      {
        name: "description",
        content:
          "Live faculty dashboard showing department-wise faculty names, total faculty count, and how many completed 8 hours versus less than 8 hours.",
      },
      { property: "og:title", content: "Faculty Management Dashboard" },
      {
        property: "og:description",
        content:
          "Department-wise faculty names with total faculty and 8-hour duty completion breakdown.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const FULL_DAY = 8;

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone: "primary" | "success" | "warning" | "accent";
}) {
  const toneRing = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    accent: "text-accent",
  }[tone];

  return (
    <div
      className="rounded-2xl border border-border bg-card p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-3 text-4xl font-bold tabular-nums ${toneRing}`}>{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors"
          : "inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-secondary"
      }
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
          active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function MonthTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors"
          : "rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      }
      style={active ? { background: "var(--gradient-hero)" } : undefined}
    >
      {label}
    </button>
  );
}

function DayPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "min-w-10 rounded-lg border border-primary bg-primary px-3 py-1.5 text-sm font-semibold tabular-nums text-primary-foreground"
          : "min-w-10 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium tabular-nums text-foreground transition-colors hover:border-primary/60 hover:bg-secondary"
      }
    >
      {label}
    </button>
  );
}

function Dashboard() {
  const fetchFaculty = useServerFn(getFaculty);
  const { data, isPending, error } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => fetchFaculty(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    retryDelay: (attempt) => 2000 * 2 ** attempt,
  });

  const [activeDept, setActiveDept] = useState<string>("All");
  const [activeMonth, setActiveMonth] = useState<string>("All");
  const [activeDay, setActiveDay] = useState<string>("All");
  const [search, setSearch] = useState("");

  const rows = data?.faculty ?? [];

  const months = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of rows) if (f.monthKey) m.set(f.monthKey, f.monthLabel);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  // Month scope drives which days and departments are offered.
  const monthRows = useMemo(
    () => (activeMonth === "All" ? rows : rows.filter((f) => f.monthKey === activeMonth)),
    [rows, activeMonth],
  );

  const days = useMemo(() => {
    const set = new Set<number>();
    for (const f of monthRows) if (f.day) set.add(f.day);
    return [...set].sort((a, b) => a - b);
  }, [monthRows]);

  const allFaculty = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monthRows
      .filter((f) => activeDay === "All" || String(f.day) === activeDay)
      .filter((f) => !q || f.name.toLowerCase().includes(q));
  }, [monthRows, activeDay, search]);

  const allDepts = useMemo(() => {
    const depts = new Map<string, FacultyRow[]>();
    for (const f of allFaculty) {
      const list = depts.get(f.dept) ?? [];
      list.push(f);
      depts.set(f.dept, list);
    }
    return [...depts.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [allFaculty]);

  const faculty = useMemo(
    () =>
      activeDept === "All"
        ? allFaculty
        : allFaculty.filter((f) => f.dept === activeDept),
    [allFaculty, activeDept],
  );

  const stats = useMemo(() => {
    const full = faculty.filter((f) => f.hours >= FULL_DAY);
    const partial = faculty.filter((f) => f.hours < FULL_DAY);
    const depts = new Map<string, FacultyRow[]>();
    for (const f of faculty) {
      const list = depts.get(f.dept) ?? [];
      list.push(f);
      depts.set(f.dept, list);
    }
    const totalHours = faculty.reduce((s, f) => s + f.hours, 0);
    return {
      full,
      partial,
      depts: [...depts.entries()].sort((a, b) => b[1].length - a[1].length),
      avgHours: faculty.length ? totalHours / faculty.length : 0,
    };
  }, [faculty]);

  const maxDept = Math.max(1, ...stats.depts.map(([, list]) => list.length));

  return (
    <main className="min-h-screen bg-background">
      <header
        className="px-6 py-14 text-primary-foreground sm:px-10"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-80">
            Attendance intelligence
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Faculty Management Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-base opacity-85">
            Department-wise faculty roster with total strength and an 8-hour duty completion
            breakdown, synced live from your attendance sheet.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        <div className="mb-6">
          <DashboardTabs />
        </div>
        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            Couldn't load the sheet: {(error as Error).message}
          </div>
        ) : isPending ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <section className="mb-6" aria-label="Month tabs">
              <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-card p-1.5">
                <MonthTab
                  label="All months"
                  active={activeMonth === "All"}
                  onClick={() => {
                    setActiveMonth("All");
                    setActiveDay("All");
                  }}
                />
                {months.map(([key, label]) => (
                  <MonthTab
                    key={key}
                    label={label}
                    active={activeMonth === key}
                    onClick={() => {
                      setActiveMonth(key);
                      setActiveDay("All");
                    }}
                  />
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Day
                </span>
                <DayPill
                  label="All"
                  active={activeDay === "All"}
                  onClick={() => setActiveDay("All")}
                />
                {days.map((d) => (
                  <DayPill
                    key={d}
                    label={String(d).padStart(2, "0")}
                    active={activeDay === String(d)}
                    onClick={() => setActiveDay(String(d))}
                  />
                ))}
                {days.length === 0 && (
                  <span className="text-sm text-muted-foreground">No dated entries</span>
                )}
              </div>

              <div className="mt-4">
                <label
                  htmlFor="faculty-search"
                  className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Search faculty
                </label>
                <input
                  id="faculty-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type a faculty name…"
                  className="mt-2 w-full max-w-sm rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </section>

            <section
              className="flex flex-wrap items-center gap-2"
              aria-label="Department filters"
            >
              <FilterChip
                label="All departments"
                count={allFaculty.length}
                active={activeDept === "All"}
                onClick={() => setActiveDept("All")}
              />
              {allDepts.map(([dept, list]) => (
                <FilterChip
                  key={dept}
                  label={dept}
                  count={list.length}
                  active={activeDept === dept}
                  onClick={() => setActiveDept(dept)}
                />
              ))}
            </section>

            <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total faculty"
                value={faculty.length}
                hint={`${stats.depts.length} departments`}
                tone="primary"
              />
              <StatCard
                label="Worked 8 hours"
                value={stats.full.length}
                hint="Full duty completed"
                tone="success"
              />
              <StatCard
                label="Less than 8 hours"
                value={stats.partial.length}
                hint="Short of full duty"
                tone="warning"
              />
              <StatCard
                label="Average hours"
                value={stats.avgHours.toFixed(1)}
                hint="Across all faculty"
                tone="accent"
              />
            </section>

            <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              <div
                className="rounded-2xl border border-border bg-card p-6"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <h2 className="text-lg font-semibold text-foreground">Faculty per department</h2>
                <div className="mt-6 space-y-5">
                  {stats.depts.map(([dept, list]) => (
                    <div key={dept}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-semibold text-foreground">{dept}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {list.length} faculty
                        </span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(list.length / maxDept) * 100}%`,
                            background: "var(--gradient-hero)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-2xl border border-border bg-card p-6"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <h2 className="text-lg font-semibold text-foreground">Duty completion</h2>
                <div className="mt-6 space-y-6">
                  {[
                    {
                      label: "Completed 8 hours",
                      count: stats.full.length,
                      color: "var(--success)",
                    },
                    {
                      label: "Less than 8 hours",
                      count: stats.partial.length,
                      color: "var(--warning)",
                    },
                  ].map((row) => {
                    const pct = faculty.length ? (row.count / faculty.length) * 100 : 0;
                    return (
                      <div key={row.label}>
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="font-medium text-foreground">{row.label}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {row.count} · {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: row.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-6 text-sm text-muted-foreground">
                  A faculty member is counted as full duty at {FULL_DAY} hours or more.
                </p>
              </div>
            </section>

            <section className="mt-10 space-y-8">
              <h2 className="text-lg font-semibold text-foreground">
                Department-wise faculty names
              </h2>
              {stats.depts.length === 0 && (
                <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                  No faculty match the current month, day, department, or name search.
                </p>
              )}
              {stats.depts.map(([dept, list]) => (
                <div
                  key={dept}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/60 px-6 py-4">
                    <h3 className="text-base font-semibold text-secondary-foreground">{dept}</h3>
                    <div className="flex gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                        {list.length} total
                      </span>
                      <span className="rounded-full bg-success/12 px-3 py-1 text-success">
                        {list.filter((f) => f.hours >= FULL_DAY).length} full 8 hrs
                      </span>
                      <span className="rounded-full bg-warning/15 px-3 py-1 text-warning-foreground">
                        {list.filter((f) => f.hours < FULL_DAY).length} under 8 hrs
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                           <th className="px-6 py-3 font-semibold">Photo</th>
                           <th className="px-6 py-3 font-semibold">Faculty</th>
                           <th className="px-6 py-3 font-semibold">Date</th>
                           <th className="px-6 py-3 font-semibold">Log in</th>
                          <th className="px-6 py-3 font-semibold">Log out</th>
                          <th className="px-6 py-3 font-semibold">Hours</th>
                          <th className="px-6 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((f, i) => {
                          const fullDay = f.hours >= FULL_DAY;
                          return (
                            <tr key={`${f.sno}-${i}`} className="border-t border-border">
                              <td className="px-6 py-3">
                                <FacultyPhoto name={f.name} photo={f.photo} />
                              </td>
                              <td className="px-6 py-3 font-medium text-foreground">{f.name}</td>
                              <td className="px-6 py-3 tabular-nums text-muted-foreground">
                                {f.date || "—"}
                              </td>
                              <td className="px-6 py-3 tabular-nums text-muted-foreground">
                                {f.loginTime}
                              </td>
                              <td className="px-6 py-3 tabular-nums text-muted-foreground">
                                {f.logoutTime}
                              </td>
                              <td className="px-6 py-3 font-semibold tabular-nums text-foreground">
                                {f.hours.toFixed(2)}
                              </td>
                              <td className="px-6 py-3">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    fullDay
                                      ? "bg-success/12 text-success"
                                      : "bg-warning/15 text-warning-foreground"
                                  }`}
                                >
                                  {fullDay ? "8 hrs" : "< 8 hrs"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
