import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getPerformance } from "@/lib/performance.functions";
import { getTodayAttendance } from "@/lib/today.functions";
import { StudentPhoto } from "@/components/StudentPhoto";
import { DashboardTabs } from "@/components/DashboardTabs";

export const Route = createFileRoute("/performance")({
  component: Performance,
  head: () => ({
    meta: [
      { title: "Student Marks & Faculty Performance | Faculty Dashboard" },
      {
        name: "description",
        content:
          "Department-wise and faculty-wise marks with average, highest, lowest, median and percentage, shown as bar and pie charts.",
      },
      { property: "og:title", content: "Marks & Performance Dashboard" },
      {
        property: "og:description",
        content:
          "Compare department and faculty performance with average, highest, lowest, median marks and percentages.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary-glow)",
  "var(--accent)",
];

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

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
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

function StatsTable({
  rows,
  firstLabel,
}: {
  rows: {
    key: string;
    name: string;
    sub: string;
    average: number;
    highest: number;
    lowest: number;
    median: number;
    percent: number;
    max: number;
  }[];
  firstLabel: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">{firstLabel}</th>
            <th className="px-4 py-3 font-semibold">Average</th>
            <th className="px-4 py-3 font-semibold">Highest</th>
            <th className="px-4 py-3 font-semibold">Lowest</th>
            <th className="px-4 py-3 font-semibold">Median</th>
            <th className="px-4 py-3 font-semibold">Max</th>
            <th className="px-4 py-3 font-semibold">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-border">
              <td className="px-4 py-3">
                <span className="font-semibold text-foreground">{r.name}</span>
                <span className="block text-xs text-muted-foreground">{r.sub}</span>
              </td>
              <td className="px-4 py-3 tabular-nums text-foreground">{r.average.toFixed(2)}</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.highest}</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.lowest}</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.median.toFixed(2)}</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.max.toFixed(0)}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${
                    r.percent >= 75
                      ? "bg-success/12 text-success"
                      : r.percent >= 50
                        ? "bg-primary/10 text-primary"
                        : "bg-warning/15 text-warning-foreground"
                  }`}
                >
                  {r.percent.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

  const fetchToday = useServerFn(getTodayAttendance);
  const { data: today } = useQuery({
    queryKey: ["today-attendance"],
    queryFn: () => fetchToday(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  const photoByHtno = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of today?.students ?? []) {
      if (s.photo) map.set(s.htno.toUpperCase(), s.photo);
    }
    return map;
  }, [today]);

  const [view, setView] = useState<"dept" | "faculty">("dept");
  const [activeDept, setActiveDept] = useState("All");
  const [activeFaculty, setActiveFaculty] = useState("All");
  const [htno, setHtno] = useState("");

  const students = data?.students ?? [];
  const depts = data?.depts ?? [];
  const faculty = data?.faculty ?? [];

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

  const shownFaculty = useMemo(
    () => (activeFaculty === "All" ? faculty : faculty.filter((f) => f.faculty === activeFaculty)),
    [faculty, activeFaculty],
  );

  const deptChart = depts.map((d) => ({
    name: d.dept,
    percent: Number(d.averagePercent.toFixed(1)),
    average: Number(d.average.toFixed(1)),
    highest: d.highest,
    lowest: d.lowest,
  }));

  const facultyChart = faculty.map((f) => ({
    name: f.faculty,
    percent: Number(f.percent.toFixed(1)),
    average: Number(f.average.toFixed(1)),
    highest: f.highest,
    lowest: f.lowest,
  }));

  const chartData = view === "dept" ? deptChart : facultyChart;

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
            Department &amp; Faculty Marks
          </h1>
          <p className="mt-3 max-w-2xl text-base opacity-85">
            Average, highest, lowest, median marks and percentages — department-wise and faculty-wise
            — with bar and pie comparisons.
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
            <section className="flex flex-wrap items-center gap-2" aria-label="View mode">
              <Chip
                label="Department-wise"
                count={depts.length}
                active={view === "dept"}
                onClick={() => setView("dept")}
              />
              <Chip
                label="Faculty-wise"
                count={faculty.length}
                active={view === "faculty"}
                onClick={() => setView("faculty")}
              />
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <Card
                title={`${view === "dept" ? "Department" : "Faculty"} performance (average %)`}
                subtitle="Bar chart — taller bars perform better."
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                        height={56}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <YAxis
                        unit="%"
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v: number, key) => [key === "percent" ? `${v}%` : v, key]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="percent" name="Average %" radius={[6, 6, 0, 0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card
                title={`Share of average marks by ${view === "dept" ? "department" : "faculty"}`}
                subtitle="Pie chart — relative contribution of average marks."
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="average"
                        nameKey="name"
                        outerRadius={100}
                        innerRadius={45}
                        paddingAngle={2}
                        label={(e: { name?: string; percent?: number }) =>
                          `${e.name} ${((e.percent ?? 0) * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </section>

            {view === "dept" ? (
              <>
                <section
                  className="mt-10 flex flex-wrap items-center gap-2"
                  aria-label="Department filter"
                >
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

                <section className="mt-8">
                  <Card
                    title="Department-wise marks summary"
                    subtitle="Average, highest, lowest, median totals and percentage per department."
                  >
                    <StatsTable
                      firstLabel="Department"
                      rows={shownDepts.map((d) => ({
                        key: d.dept,
                        name: d.dept,
                        sub: `${d.count} students · ${d.subjects.length} subjects`,
                        average: d.average,
                        highest: d.highest,
                        lowest: d.lowest,
                        median: d.median,
                        percent: d.averagePercent,
                        max: d.maxTotal,
                      }))}
                    />
                  </Card>
                </section>

                {shownDepts.map((d) => (
                  <section key={d.dept} className="mt-10">
                    <h2 className="text-lg font-semibold text-foreground">{d.dept} class summary</h2>
                    <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                      <StatCard
                        label="Average marks"
                        value={d.average.toFixed(1)}
                        hint={`out of ${d.maxTotal} · ${d.count} students`}
                      />
                      <StatCard
                        label="Average %"
                        value={`${d.averagePercent.toFixed(1)}%`}
                        hint="Class average percentage"
                      />
                      <StatCard
                        label="Highest marks"
                        value={d.highest}
                        hint={`${((d.highest / (d.maxTotal || 1)) * 100).toFixed(1)}% · class topper`}
                      />
                      <StatCard
                        label="Lowest marks"
                        value={d.lowest}
                        hint={`${((d.lowest / (d.maxTotal || 1)) * 100).toFixed(1)}% · lowest total`}
                      />
                      <StatCard
                        label="Median marks"
                        value={d.median.toFixed(1)}
                        hint={`${((d.median / (d.maxTotal || 1)) * 100).toFixed(1)}% · middle of class`}
                      />
                    </div>
                    <div className="mt-5">
                      <Card title={`${d.dept} subjects and faculty`}>
                        <div className="flex flex-wrap gap-2">
                          {d.subjectMeta.map((m) => (
                            <span
                              key={m.subject}
                              className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-secondary-foreground"
                            >
                              {m.subject} · {m.faculty || "—"} (max {m.max})
                            </span>
                          ))}
                        </div>
                      </Card>
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
                                  <th className="px-6 py-3 font-semibold">Photo</th>
                                  <th className="px-4 py-3 font-semibold">HT No</th>
                                  {d.subjectMeta.map((m) => (
                                    <th key={m.subject} className="px-4 py-3 font-semibold">
                                      {m.subject}
                                      <span className="block text-[10px] font-normal normal-case">
                                        {m.faculty || "—"}
                                      </span>
                                    </th>
                                  ))}
                                  <th className="px-4 py-3 font-semibold">Total</th>
                                  <th className="px-4 py-3 font-semibold">%</th>
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
                                    <td className="px-4 py-3 font-medium text-foreground">
                                      {s.htno}
                                    </td>

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
            ) : (
              <>
                <section
                  className="mt-10 flex flex-wrap items-center gap-2"
                  aria-label="Faculty filter"
                >
                  <Chip
                    label="All faculty"
                    count={faculty.length}
                    active={activeFaculty === "All"}
                    onClick={() => setActiveFaculty("All")}
                  />
                  {faculty.map((f) => (
                    <Chip
                      key={f.faculty}
                      label={f.faculty}
                      active={activeFaculty === f.faculty}
                      onClick={() => setActiveFaculty(f.faculty)}
                    />
                  ))}
                </section>

                <section className="mt-8">
                  <Card
                    title="Faculty-wise marks summary"
                    subtitle="Per-faculty average, highest, lowest, median marks and percentage across the subjects they teach."
                  >
                    <StatsTable
                      firstLabel="Faculty"
                      rows={shownFaculty.map((f) => ({
                        key: f.faculty,
                        name: f.faculty,
                        sub: `${f.depts.join(", ")} · ${f.subjects.map((s) => s.subject).join(", ")}`,
                        average: f.average,
                        highest: f.highest,
                        lowest: f.lowest,
                        median: f.median,
                        percent: f.percent,
                        max: f.max,
                      }))}
                    />
                  </Card>
                </section>

                {shownFaculty.map((f) => (
                  <section key={f.faculty} className="mt-10">
                    <h2 className="text-lg font-semibold text-foreground">
                      {f.faculty} — subject wise
                    </h2>
                    <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                      <StatCard
                        label="Average marks"
                        value={f.average.toFixed(2)}
                        hint={`across ${f.count} marks entries`}
                      />
                      <StatCard
                        label="Average %"
                        value={`${f.percent.toFixed(1)}%`}
                        hint="Overall subject percentage"
                      />
                      <StatCard label="Highest mark" value={f.highest} hint="Best student mark" />
                      <StatCard label="Lowest mark" value={f.lowest} hint="Weakest student mark" />
                    </div>
                    <div className="mt-5">
                      <Card title="Subjects taught">
                        <StatsTable
                          firstLabel="Subject"
                          rows={f.subjects.map((s) => ({
                            key: `${s.dept}-${s.subject}`,
                            name: s.subject,
                            sub: `${s.dept} · ${s.count} students`,
                            average: s.average,
                            highest: s.highest,
                            lowest: s.lowest,
                            median: s.median,
                            percent: s.percent,
                            max: s.max,
                          }))}
                        />
                      </Card>
                    </div>
                  </section>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
