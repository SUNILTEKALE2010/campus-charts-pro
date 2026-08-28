import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getPerformance } from "@/lib/performance.functions";
import { DashboardTabs } from "@/components/DashboardTabs";

export const Route = createFileRoute("/performance")({
  component: Performance,
  head: () => ({
    meta: [
      { title: "Student Performance | Faculty Management Dashboard" },
      {
        name: "description",
        content:
          "Department-wise student marks with average, highest, lowest and median class marks, plus a bar chart comparing department performance.",
      },
      { property: "og:title", content: "Student Performance Dashboard" },
      {
        property: "og:description",
        content:
          "Search student marks by department or hall ticket number and compare department averages, medians and toppers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold tabular-nums text-primary">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
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
          ? "inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          : "inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-secondary"
      }
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
            active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function Performance() {
  const fetchPerformance = useServerFn(getPerformance);
  const { data, isPending, error } = useQuery({
    queryKey: ["performance"],
    queryFn: () => fetchPerformance(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    retryDelay: (attempt) => 2000 * 2 ** attempt,
  });

  const [activeDept, setActiveDept] = useState("All");
  const [htno, setHtno] = useState("");

  const students = data?.students ?? [];
  const depts = data?.depts ?? [];

  const filtered = useMemo(() => {
    const q = htno.trim().toLowerCase();
    return students
      .filter((s) => activeDept === "All" || s.dept === activeDept)
      .filter((s) => !q || s.htno.toLowerCase().includes(q));
  }, [students, activeDept, htno]);

  const shownDepts = useMemo(
    () => (activeDept === "All" ? depts : depts.filter((d) => d.dept === activeDept)),
    [depts, activeDept],
  );

  const maxAvgPercent = Math.max(1, ...depts.map((d) => d.averagePercent));

  return (
    <main className="min-h-screen bg-background">
      <header
        className="px-6 py-14 text-primary-foreground sm:px-10"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-80">
            Academic performance
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Student Marks &amp; Performance
          </h1>
          <p className="mt-3 max-w-2xl text-base opacity-85">
            Department-wise marks with class average, highest, lowest and median scores, plus a
            comparison of which departments are doing well.
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
            <section className="flex flex-wrap items-center gap-2" aria-label="Department filter">
              <Chip
                label="All departments"
                count={students.length}
                active={activeDept === "All"}
                onClick={() => setActiveDept("All")}
              />
              {depts.map((d) => (
                <Chip
                  key={d.dept}
                  label={d.dept}
                  count={d.count}
                  active={activeDept === d.dept}
                  onClick={() => setActiveDept(d.dept)}
                />
              ))}
            </section>

            <div className="mt-5">
              <label
                htmlFor="htno-search"
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Search by hall ticket number
              </label>
              <input
                id="htno-search"
                type="search"
                value={htno}
                onChange={(e) => setHtno(e.target.value)}
                placeholder="e.g. CSE012"
                className="mt-2 w-full max-w-sm rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <section className="mt-8" aria-label="Department comparison chart">
              <div
                className="rounded-2xl border border-border bg-card p-6"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <h2 className="text-lg font-semibold text-foreground">
                  Department performance (average %)
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sorted best to poorest performing department.
                </p>
                <div className="mt-6 space-y-5">
                  {depts.map((d, i) => {
                    const best = i === 0;
                    const worst = i === depts.length - 1 && depts.length > 1;
                    return (
                      <div key={d.dept}>
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="font-semibold text-foreground">
                            {d.dept}
                            {best && (
                              <span className="ml-2 rounded-full bg-success/12 px-2 py-0.5 text-xs font-semibold text-success">
                                Best
                              </span>
                            )}
                            {worst && (
                              <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning-foreground">
                                Needs attention
                              </span>
                            )}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {d.averagePercent.toFixed(1)}% · avg {d.average.toFixed(1)}/
                            {d.maxTotal}
                          </span>
                        </div>
                        <div className="mt-2 h-4 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(d.averagePercent / maxAvgPercent) * 100}%`,
                              background: worst
                                ? "var(--warning)"
                                : "var(--gradient-hero)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {shownDepts.map((d) => (
              <section key={d.dept} className="mt-10">
                <h2 className="text-lg font-semibold text-foreground">{d.dept} class summary</h2>
                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    label="Average marks"
                    value={d.average.toFixed(1)}
                    hint={`out of ${d.maxTotal} · ${d.count} students`}
                  />
                  <StatCard
                    label="Highest marks"
                    value={d.highest}
                    hint="Class topper total"
                  />
                  <StatCard label="Lowest marks" value={d.lowest} hint="Lowest total in class" />
                  <StatCard
                    label="Median marks"
                    value={d.median.toFixed(1)}
                    hint="Middle of the class"
                  />
                </div>
              </section>
            ))}

            <section className="mt-10">
              <h2 className="text-lg font-semibold text-foreground">Student marks</h2>
              {filtered.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                  No students match this department or hall ticket number.
                </p>
              ) : (
                (activeDept === "All" ? depts : shownDepts).map((d) => {
                  const list = filtered.filter((s) => s.dept === d.dept);
                  if (!list.length) return null;
                  return (
                    <div
                      key={d.dept}
                      className="mt-6 overflow-hidden rounded-2xl border border-border bg-card"
                      style={{ boxShadow: "var(--shadow-card)" }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/60 px-6 py-4">
                        <h3 className="text-base font-semibold text-secondary-foreground">
                          {d.dept}
                        </h3>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {list.length} students
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                              <th className="px-6 py-3 font-semibold">HT No</th>
                              {d.subjects.map((s) => (
                                <th key={s} className="px-4 py-3 font-semibold">
                                  {s}
                                </th>
                              ))}
                              <th className="px-4 py-3 font-semibold">Total</th>
                              <th className="px-4 py-3 font-semibold">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((s) => (
                              <tr key={s.htno} className="border-t border-border">
                                <td className="px-6 py-3 font-medium text-foreground">{s.htno}</td>
                                {s.subjects.map((sub) => (
                                  <td
                                    key={sub.subject}
                                    className="px-4 py-3 tabular-nums text-muted-foreground"
                                  >
                                    {sub.mark}
                                  </td>
                                ))}
                                <td className="px-4 py-3 font-semibold tabular-nums text-foreground">
                                  {s.total}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${
                                      s.percent >= 75
                                        ? "bg-success/12 text-success"
                                        : s.percent >= 50
                                          ? "bg-primary/10 text-primary"
                                          : "bg-warning/15 text-warning-foreground"
                                    }`}
                                  >
                                    {s.percent.toFixed(0)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
