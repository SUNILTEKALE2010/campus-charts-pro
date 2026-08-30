import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getTodayAttendance } from "@/lib/today.functions";
import { DashboardTabs } from "@/components/DashboardTabs";

export const Route = createFileRoute("/today-attendance")({
  component: TodayAttendance,
  head: () => ({
    meta: [
      { title: "Today's Attendance | Campus Dashboard" },
      {
        name: "description",
        content:
          "Live present and absent status for today, shown department-wise with hall ticket search.",
      },
      { property: "og:title", content: "Today's Attendance" },
      {
        property: "og:description",
        content: "Current day present/absent status of students department-wise.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

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

  const rows = useMemo(() => {
    const list = data?.students ?? [];
    const q = search.trim().toUpperCase();
    return list.filter(
      (s) =>
        (activeDept === "ALL" || s.dept === activeDept) &&
        (statusFilter === "ALL" || s.status === statusFilter) &&
        (!q || s.htno.toUpperCase().includes(q)),
    );
  }, [data, activeDept, statusFilter, search]);

  const totals = useMemo(() => {
    const list = (data?.students ?? []).filter(
      (s) => activeDept === "ALL" || s.dept === activeDept,
    );
    const present = list.filter((s) => s.status === "PRESENT").length;
    return {
      total: list.length,
      present,
      absent: list.length - present,
      percent: list.length ? (present / list.length) * 100 : 0,
    };
  }, [data, activeDept]);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {today}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Today's Attendance</h1>
        <p className="mt-2 text-muted-foreground">
          Current present and absent status of students, department-wise.
        </p>
      </header>

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
            <StatCard label="Present" value={totals.present} hint="Marked present today" />
            <StatCard label="Absent" value={totals.absent} hint="Marked absent today" />
            <StatCard
              label="Present %"
              value={`${totals.percent.toFixed(1)}%`}
              hint="Attendance rate today"
            />
          </section>

          <section className="mt-8 space-y-4">
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

            <label className="block max-w-sm">
              <span className="block text-sm font-semibold text-foreground">
                Search hall ticket number
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. CSE012"
                className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-foreground outline-none focus:border-primary"
              />
            </label>
          </section>

          <section className="mt-6 space-y-4">
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
                        {d.present} present · {d.absent} absent ·{" "}
                        {d.presentPercent.toFixed(1)}% present
                      </p>
                    </div>
                    <table className="w-full text-left text-sm">
                      <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-5 py-3">Hall ticket no.</th>
                          <th className="px-5 py-3">Department</th>
                          <th className="px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptRows.map((r) => (
                          <tr key={r.htno} className="border-t border-border/70">
                            <td className="px-5 py-3 font-semibold text-foreground">{r.htno}</td>
                            <td className="px-5 py-3 text-muted-foreground">{r.dept}</td>
                            <td className="px-5 py-3">
                              <StatusBadge status={r.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
    </main>
  );
}
