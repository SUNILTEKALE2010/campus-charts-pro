import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getTimetable } from "@/lib/timetable.functions";
import { DashboardTabs } from "@/components/DashboardTabs";

export const Route = createFileRoute("/timetable")({
  component: TimetablePage,
  head: () => ({
    meta: [
      { title: "Time Table | Faculty Management Dashboard" },
      {
        name: "description",
        content:
          "Section-wise class time table showing which faculty is teaching which subject in which room, with a faculty search that locates a teacher's room and period.",
      },
      { property: "og:title", content: "Time Table | Faculty Management Dashboard" },
      {
        property: "og:description",
        content:
          "Find which faculty is in which room, section, and period across the weekly class time table.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Hit = {
  section: string;
  room: string;
  day: string;
  period: string;
  subject: string;
  faculty: string;
};

function TimetablePage() {
  const fetchTimetable = useServerFn(getTimetable);
  const { data, isPending, error } = useQuery({
    queryKey: ["timetable"],
    queryFn: () => fetchTimetable(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    retryDelay: (attempt) => 2000 * 2 ** attempt,
  });

  const sections = data?.sections ?? [];
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<string>("All");
  const [activeDay, setActiveDay] = useState<string>("All");

  const days = useMemo(() => {
    const set = new Set<string>();
    for (const s of sections) for (const d of s.days) set.add(d.day);
    return [...set];
  }, [sections]);

  const hits = useMemo<Hit[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const out: Hit[] = [];
    for (const s of sections) {
      if (activeSection !== "All" && s.section !== activeSection) continue;
      for (const d of s.days) {
        if (activeDay !== "All" && d.day !== activeDay) continue;
        for (const slot of d.slots) {
          if (slot.faculty && slot.faculty.toLowerCase().includes(q)) {
            out.push({
              section: s.section,
              room: s.room,
              day: d.day,
              period: slot.period,
              subject: slot.subject || slot.raw,
              faculty: slot.faculty,
            });
          }
        }
      }
    }
    return out;
  }, [sections, search, activeSection, activeDay]);

  const visible = useMemo(
    () =>
      sections
        .filter((s) => activeSection === "All" || s.section === activeSection)
        .map((s) => ({
          ...s,
          days: s.days.filter((d) => activeDay === "All" || d.day === activeDay),
        })),
    [sections, activeSection, activeDay],
  );

  const facultyCount = useMemo(() => {
    const set = new Set<string>();
    for (const s of sections)
      for (const d of s.days) for (const slot of d.slots) if (slot.faculty) set.add(slot.faculty);
    return set.size;
  }, [sections]);

  return (
    <main className="min-h-screen bg-background">
      <header
        className="px-6 py-14 text-primary-foreground sm:px-10"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-80">
            Class scheduling
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Time Table</h1>
          <p className="mt-3 max-w-2xl text-base opacity-85">
            Section-wise weekly schedule with subject, faculty and room number. Search a faculty
            name to see exactly where they are.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        <DashboardTabs />

        {error ? (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            Couldn't load the time table: {(error as Error).message}
          </div>
        ) : isPending ? (
          <div className="mt-6 space-y-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <section className="mt-6">
              <label
                htmlFor="tt-search"
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Find a faculty
              </label>
              <input
                id="tt-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type a faculty name, e.g. Ramu…"
                className="mt-2 w-full max-w-sm rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="mt-2 text-sm text-muted-foreground">
                {sections.length} sections · {facultyCount} faculty in the schedule
              </p>

              {search.trim() && (
                <div
                  className="mt-4 overflow-hidden rounded-2xl border border-border bg-card"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="border-b border-border bg-secondary/60 px-6 py-4">
                    <h2 className="text-base font-semibold text-secondary-foreground">
                      Where is “{search.trim()}”?
                    </h2>
                    {(activeSection !== "All" || activeDay !== "All") && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Filtered to {activeSection === "All" ? "all sections" : activeSection} ·{" "}
                        {activeDay === "All" ? "all days" : activeDay}
                      </p>
                    )}
                  </div>
                  {hits.length === 0 ? (
                    <p className="px-6 py-5 text-sm text-muted-foreground">
                      No class found for that faculty name
                      {activeSection !== "All" ? ` in ${activeSection}` : ""}
                      {activeDay !== "All" ? ` on ${activeDay}` : ""}. Try another section or day
                      filter below.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                            <th className="px-6 py-3 font-semibold">Faculty</th>
                            <th className="px-6 py-3 font-semibold">Day</th>
                            <th className="px-6 py-3 font-semibold">Period</th>
                            <th className="px-6 py-3 font-semibold">Subject</th>
                            <th className="px-6 py-3 font-semibold">Section</th>
                            <th className="px-6 py-3 font-semibold">Room</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hits.map((h, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="px-6 py-3 font-medium text-foreground">{h.faculty}</td>
                              <td className="px-6 py-3 text-muted-foreground">{h.day}</td>
                              <td className="px-6 py-3 tabular-nums text-muted-foreground">
                                {h.period}
                              </td>
                              <td className="px-6 py-3 text-foreground">{h.subject}</td>
                              <td className="px-6 py-3 text-muted-foreground">{h.section}</td>
                              <td className="px-6 py-3">
                                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                  {h.room}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="mt-8 flex flex-wrap items-center gap-2" aria-label="Filters">
              {["All", ...sections.map((s) => s.section)].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setActiveSection(s)}
                  aria-pressed={activeSection === s}
                  className={
                    activeSection === s
                      ? "rounded-full border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                      : "rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-secondary"
                  }
                >
                  {s === "All" ? "All sections" : s}
                </button>
              ))}
              <span className="mx-2 h-6 w-px bg-border" />
              {["All", ...days].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActiveDay(d)}
                  aria-pressed={activeDay === d}
                  className={
                    activeDay === d
                      ? "rounded-lg border border-primary bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
                      : "rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-secondary"
                  }
                >
                  {d === "All" ? "All days" : d}
                </button>
              ))}
            </section>

            <section className="mt-8 space-y-8">
              {visible.map((s) => (
                <div
                  key={s.section}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/60 px-6 py-4">
                    <h2 className="text-base font-semibold text-secondary-foreground">
                      {s.section}
                    </h2>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {s.room}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 py-3 font-semibold">Day</th>
                          {s.periods.map((p) => (
                            <th key={p} className="px-4 py-3 font-semibold">
                              {p}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {s.days.map((d) => (
                          <tr key={d.day} className="border-t border-border align-top">
                            <td className="px-4 py-3 font-semibold text-foreground">{d.day}</td>
                            {d.slots.map((slot, i) => (
                              <td key={i} className="px-4 py-3">
                                <span className="block font-medium text-foreground">
                                  {slot.subject || "—"}
                                </span>
                                {slot.faculty && (
                                  <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                                    {slot.faculty}
                                  </span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
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
