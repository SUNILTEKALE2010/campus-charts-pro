import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { getStudentAttendance } from "@/lib/attendance.functions";
import { getTodayAttendance } from "@/lib/today.functions";
import { DashboardTabs } from "@/components/DashboardTabs";
import { StudentPhoto } from "@/components/StudentPhoto";

export const Route = createFileRoute("/student-attendance")({
  component: StudentAttendance,
  head: () => ({
    meta: [
      { title: "Student Attendance & Condonation | Faculty Dashboard" },
      {
        name: "description",
        content:
          "Department-wise student attendance with month-wise days, attendance percentage, hall ticket search and a condonation list with pie charts.",
      },
      { property: "og:title", content: "Student Attendance Dashboard" },
      {
        property: "og:description",
        content:
          "Track student attendance department-wise, search by hall ticket number and see who needs condonation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const YES_COLOR = "var(--warning)";
const NO_COLOR = "var(--chart-1)";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
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

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function CondonationPie({
  title,
  yes,
  no,
}: {
  title: string;
  yes: number;
  no: number;
}) {
  const data = [
    { name: "Condonation YES", value: yes },
    { name: "Condonation NO", value: no },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">
        {yes} need condonation · {no} clear
      </p>
      <div className="mt-2 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={78}
              innerRadius={38}
              paddingAngle={2}
              labelLine={false}
              label={(e: { value?: number; percent?: number }) =>
                `${e.value} · ${((e.percent ?? 0) * 100).toFixed(0)}%`
              }
            >
              <Cell fill={YES_COLOR} />
              <Cell fill={NO_COLOR} />
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StudentAttendance() {
  const fetchAttendance = useServerFn(getStudentAttendance);
  const { data, isPending, error } = useQuery({
    queryKey: ["student-attendance"],
    queryFn: () => fetchAttendance(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    retryDelay: (attempt) => 2000 * 2 ** attempt,
  });

  const [activeDept, setActiveDept] = useState("All");
  const [htno, setHtno] = useState("");

  const fetchToday = useServerFn(getTodayAttendance);
  const { data: today } = useQuery({
    queryKey: ["today-attendance"],
    queryFn: () => fetchToday(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  const photoByHtno = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of today?.students ?? []) {
      if (s.photo) map.set(s.htno.toUpperCase(), s.photo);
    }
    return map;
  }, [today]);

  const students = data?.students ?? [];
  const depts = data?.depts ?? [];
  const monthLabels = data?.monthLabels ?? [];

  const scoped = useMemo(
    () => students.filter((s) => activeDept === "All" || s.dept === activeDept),
    [students, activeDept],
  );

  const filtered = useMemo(() => {
    const q = htno.trim().toLowerCase();
    return scoped.filter((s) => !q || s.htno.toLowerCase().includes(q));
  }, [scoped, htno]);

  const condonationList = useMemo(
    () => scoped.filter((s) => s.condonation).sort((a, b) => a.percent - b.percent),
    [scoped],
  );

  const totals = useMemo(() => {
    const yes = scoped.filter((s) => s.condonation).length;
    return {
      yes,
      no: scoped.length - yes,
      avg: scoped.length ? scoped.reduce((s, x) => s + x.percent, 0) / scoped.length : 0,
    };
  }, [scoped]);

  const shownDepts = useMemo(
    () => (activeDept === "All" ? depts : depts.filter((d) => d.dept === activeDept)),
    [depts, activeDept],
  );

  return (
    <main className="min-h-screen bg-background">
      <header
        className="px-6 py-14 text-primary-foreground sm:px-10"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-80">
            Student attendance
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Student Attendance &amp; Condonation
          </h1>
          <p className="mt-3 max-w-2xl text-base opacity-85">
            Department-wise month attendance, attendance percentage, hall ticket search, and the list
            of students who must apply for condonation.
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
                htmlFor="att-htno"
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Search attendance by hall ticket number
              </label>
              <input
                id="att-htno"
                type="search"
                value={htno}
                onChange={(e) => setHtno(e.target.value)}
                placeholder="e.g. CSE012"
                className="mt-2 w-full max-w-sm rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Students"
                value={scoped.length}
                hint={activeDept === "All" ? `${depts.length} departments` : activeDept}
              />
              <StatCard
                label="Average attendance"
                value={`${totals.avg.toFixed(1)}%`}
                hint="Across selected students"
              />
              <StatCard
                label="Condonation YES"
                value={totals.yes}
                hint="Must apply for condonation"
              />
              <StatCard label="Condonation NO" value={totals.no} hint="Attendance is sufficient" />
            </section>

            <section className="mt-8" aria-label="Condonation pie charts">
              <Card
                title="Condonation split, department-wise"
                subtitle="Pie charts of students with condonation YES vs NO."
              >
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <CondonationPie
                    title={activeDept === "All" ? "All departments" : activeDept}
                    yes={totals.yes}
                    no={totals.no}
                  />
                  {shownDepts.map((d) => (
                    <CondonationPie
                      key={d.dept}
                      title={d.dept}
                      yes={d.condonationYes}
                      no={d.condonationNo}
                    />
                  ))}
                </div>
              </Card>
            </section>

            <section className="mt-10">
              <Card
                title="Students needing condonation (YES)"
                subtitle="Lowest attendance first — these students must go with condonation."
              >
                {condonationList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No student needs condonation in this selection.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 py-3 font-semibold">HT No</th>
                          <th className="px-4 py-3 font-semibold">Dept</th>
                          <th className="px-4 py-3 font-semibold">Total days</th>
                          <th className="px-4 py-3 font-semibold">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {condonationList.map((s) => (
                          <tr key={s.htno} className="border-t border-border">
                            <td className="px-4 py-3 font-medium text-foreground">{s.htno}</td>
                            <td className="px-4 py-3 text-muted-foreground">{s.dept}</td>
                            <td className="px-4 py-3 tabular-nums text-muted-foreground">
                              {s.total}/{s.totalMax}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold tabular-nums text-warning-foreground">
                                {s.percent.toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </section>

            <section className="mt-10">
              <h2 className="text-lg font-semibold text-foreground">
                Department-wise student attendance
              </h2>
              {filtered.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                  No students match this department or hall ticket number.
                </p>
              ) : (
                shownDepts.map((d) => {
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
                        <div className="flex gap-2 text-xs font-semibold">
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                            avg {d.averagePercent.toFixed(1)}%
                          </span>
                          <span className="rounded-full bg-warning/15 px-3 py-1 text-warning-foreground">
                            {d.condonationYes} condonation
                          </span>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                              <th className="px-6 py-3 font-semibold">Photo</th>
                              <th className="px-4 py-3 font-semibold">HT No</th>
                              {monthLabels.map((m) => (
                                <th key={m} className="px-4 py-3 font-semibold">
                                  {m}
                                </th>
                              ))}
                              <th className="px-4 py-3 font-semibold">Total</th>
                              <th className="px-4 py-3 font-semibold">Attendance %</th>
                              <th className="px-4 py-3 font-semibold">Condonation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((s) => (
                              <tr key={s.htno} className="border-t border-border">
                                <td className="px-6 py-3">
                                  <StudentPhoto
                                    htno={s.htno}
                                    photo={photoByHtno.get(s.htno.toUpperCase()) ?? ""}
                                  />
                                </td>
                                <td className="px-4 py-3 font-medium text-foreground">{s.htno}</td>
                                {s.months.map((m) => (
                                  <td
                                    key={m.label}
                                    className="px-4 py-3 tabular-nums text-muted-foreground"
                                  >
                                    {m.value}
                                  </td>
                                ))}
                                <td className="px-4 py-3 font-semibold tabular-nums text-foreground">
                                  {s.total}/{s.totalMax}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${
                                      s.percent >= 75
                                        ? "bg-success/12 text-success"
                                        : s.percent >= 65
                                          ? "bg-primary/10 text-primary"
                                          : "bg-warning/15 text-warning-foreground"
                                    }`}
                                  >
                                    {s.percent.toFixed(0)}%
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                      s.condonation
                                        ? "bg-warning/15 text-warning-foreground"
                                        : "bg-success/12 text-success"
                                    }`}
                                  >
                                    {s.condonation ? "YES" : "NO"}
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
