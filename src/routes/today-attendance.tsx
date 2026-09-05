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
import { getTodayAttendance } from "@/lib/today.functions";
import { DashboardTabs } from "@/components/DashboardTabs";
import { PageHero } from "@/components/PageHero";
import heroToday from "@/assets/hero-today.jpg";
import { StudentPhoto } from "@/components/StudentPhoto";
import type { TodayRow } from "@/lib/today.types";

export const Route = createFileRoute("/today-attendance")({
  component: TodayAttendance,
  head: () => ({
    meta: [
      { title: "Today's Attendance | Campus Dashboard" },
      {
        name: "description",
        content:
          "Live present and absent counts for today, department-wise charts and full student details by hall ticket search.",
      },
      { property: "og:title", content: "Today's Attendance" },
      {
        property: "og:description",
        content:
          "Department-wise present and absent counts for today with student contact details lookup.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const PRESENT_COLOR = "var(--success)";
const ABSENT_COLOR = "var(--destructive)";

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
      {label}
      {count !== undefined ? <span className="tabular-nums opacity-80">{count}</span> : null}
    </button>
  );
}

function StatusBadge({ status }: { status: "PRESENT" | "ABSENT" }) {
  return (
    <span
      className={
        status === "PRESENT"
          ? "inline-flex rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success"
          : "inline-flex rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive"
      }
    >
      {status}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border/70 px-5 py-3 sm:grid sm:grid-cols-[180px_1fr] sm:gap-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground sm:mt-0">{value || "—"}</p>
    </div>
  );
}

function Photo({ student, size }: { student: TodayRow; size: "sm" | "lg" }) {
  return <StudentPhoto htno={student.htno} photo={student.photo} size={size} />;
}

function StudentCard({ student }: { student: TodayRow }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-primary/40 bg-card"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <Photo student={student} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-foreground">{student.htno}</h3>
          <p className="text-sm text-muted-foreground">{student.dept}</p>
        </div>
        <StatusBadge status={student.status} />
      </div>
      <DetailRow label="Department" value={student.dept} />
      <DetailRow label="Today's status" value={student.status} />
      <DetailRow label="Address" value={student.address} />
      <DetailRow label="Phone number" value={student.phone} />
      <DetailRow label="Alternate phone" value={student.altPhone} />
    </div>
  );
}

function TodayAttendance() {
  const fetchToday = useServerFn(getTodayAttendance);
  const { data, isLoading, error } = useQuery({
    queryKey: ["today-attendance"],
    queryFn: () => fetchToday(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  const [activeDept, setActiveDept] = useState("ALL");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PRESENT" | "ABSENT">("ALL");

  const query = search.trim().toUpperCase();

  const matches = useMemo(
    () => (query ? (data?.students ?? []).filter((s) => s.htno.toUpperCase().includes(query)) : []),
    [data, query],
  );

  const rows = useMemo(() => {
    const list = data?.students ?? [];
    return list.filter(
      (s) =>
        (activeDept === "ALL" || s.dept === activeDept) &&
        (statusFilter === "ALL" || s.status === statusFilter) &&
        (!query || s.htno.toUpperCase().includes(query)),
    );
  }, [data, activeDept, statusFilter, query]);

  const scoped = useMemo(
    () => (data?.students ?? []).filter((s) => activeDept === "ALL" || s.dept === activeDept),
    [data, activeDept],
  );

  const totals = useMemo(() => {
    const present = scoped.filter((s) => s.status === "PRESENT").length;
    return {
      total: scoped.length,
      present,
      absent: scoped.length - present,
      percent: scoped.length ? (present / scoped.length) * 100 : 0,
    };
  }, [scoped]);

  const chartData = useMemo(
    () =>
      (data?.depts ?? []).map((d) => ({
        dept: d.dept,
        Present: d.present,
        Absent: d.absent,
      })),
    [data],
  );

  const pieData = useMemo(
    () => [
      { name: "Present", value: totals.present },
      { name: "Absent", value: totals.absent },
    ],
    [totals],
  );

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-background">
      <PageHero
        image={heroToday}
        priority
        eyebrow={today}
        title="Today's Attendance"
        description="Department-wise present and absent counts, with full student details by hall ticket number."
      />

      <div className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="mb-8">
          <DashboardTabs />
        </div>

        {isLoading ? <p className="text-muted-foreground">Loading today's attendance…</p> : null}
        {error ? (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
            {(error as Error).message}
          </p>
        ) : null}

        {data ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total students" value={totals.total} hint="In current selection" />
              <StatCard label="Present today" value={totals.present} hint="Marked present" />
              <StatCard label="Absent today" value={totals.absent} hint="Marked absent" />
              <StatCard
                label="Present %"
                value={`${totals.percent.toFixed(1)}%`}
                hint="Attendance rate today"
              />
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-bold text-foreground">Department-wise present count</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.depts.map((d) => (
                  <div
                    key={d.dept}
                    className="rounded-2xl border border-border bg-card p-5"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-base font-bold text-foreground">{d.dept}</p>
                      <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                        {d.presentPercent.toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-3 text-3xl font-bold tabular-nums text-success">
                      {d.present}
                      <span className="text-base font-medium text-muted-foreground">
                        {" "}
                        / {d.total} present
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-destructive">{d.absent} absent</p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${d.presentPercent}%`,
                          backgroundColor: PRESENT_COLOR,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <div
                className="rounded-2xl border border-border bg-card p-5"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <h2 className="text-lg font-bold text-foreground">
                  Present vs absent by department
                </h2>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="dept" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Present" fill={PRESENT_COLOR} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Absent" fill={ABSENT_COLOR} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div
                className="rounded-2xl border border-border bg-card p-5"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <h2 className="text-lg font-bold text-foreground">
                  Overall split {activeDept === "ALL" ? "" : `· ${activeDept}`}
                </h2>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} label>
                        <Cell fill={PRESENT_COLOR} />
                        <Cell fill={ABSENT_COLOR} />
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="mt-10 space-y-4">
              <label className="block max-w-sm">
                <span className="block text-sm font-semibold text-foreground">
                  Search student by hall ticket number
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="e.g. CSE012"
                  className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-foreground outline-none focus:border-primary"
                />
              </label>

              {query ? (
                matches.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {matches.slice(0, 8).map((s) => (
                      <StudentCard key={s.htno} student={s} />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">
                    No student found for “{search.trim()}”.
                  </p>
                )
              ) : null}
            </section>

            <section className="mt-10 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Chip
                  label="All departments"
                  count={data.students.length}
                  active={activeDept === "ALL"}
                  onClick={() => setActiveDept("ALL")}
                />
                {data.depts.map((d) => (
                  <Chip
                    key={d.dept}
                    label={d.dept}
                    count={d.total}
                    active={activeDept === d.dept}
                    onClick={() => setActiveDept(d.dept)}
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {(["ALL", "PRESENT", "ABSENT"] as const).map((s) => (
                  <Chip
                    key={s}
                    label={s === "ALL" ? "All statuses" : s}
                    active={statusFilter === s}
                    onClick={() => setStatusFilter(s)}
                  />
                ))}
              </div>

              {data.depts
                .filter((d) => activeDept === "ALL" || d.dept === activeDept)
                .map((d) => {
                  const deptRows = rows.filter((r) => r.dept === d.dept);
                  if (!deptRows.length) return null;
                  return (
                    <div
                      key={d.dept}
                      className="overflow-hidden rounded-2xl border border-border bg-card"
                      style={{ boxShadow: "var(--shadow-card)" }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
                        <h2 className="text-lg font-bold text-foreground">{d.dept}</h2>
                        <p className="text-sm text-muted-foreground">
                          {d.present} present · {d.absent} absent · {d.presentPercent.toFixed(1)}%
                          present
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                          <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                              <th className="px-5 py-3">Photo</th>
                              <th className="px-5 py-3">Hall ticket no.</th>
                              <th className="px-5 py-3">Status</th>
                              <th className="px-5 py-3">Phone</th>
                              <th className="px-5 py-3">Alternate phone</th>
                              <th className="px-5 py-3">Address</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deptRows.map((r) => (
                              <tr key={r.htno} className="border-t border-border/70">
                                <td className="px-5 py-3">
                                  <Photo student={r} size="sm" />
                                </td>
                                <td className="px-5 py-3 font-semibold text-foreground">
                                  {r.htno}
                                </td>
                                <td className="px-5 py-3">
                                  <StatusBadge status={r.status} />
                                </td>
                                <td className="px-5 py-3 tabular-nums text-muted-foreground">
                                  {r.phone || "—"}
                                </td>
                                <td className="px-5 py-3 tabular-nums text-muted-foreground">
                                  {r.altPhone || "—"}
                                </td>
                                <td className="px-5 py-3 text-muted-foreground">
                                  {r.address || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              {rows.length === 0 ? (
                <p className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">
                  No students match the current department, status or hall ticket search.
                </p>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
