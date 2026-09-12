import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { generateLessonPlan, type LessonPlanResult } from "@/lib/lesson-plan.functions";
import { DashboardTabs } from "@/components/DashboardTabs";
import { PageHero } from "@/components/PageHero";
import heroLessonPlan from "@/assets/hero-lesson-plan.jpg";

export const Route = createFileRoute("/lesson-plan")({
  component: LessonPlanPage,
  head: () => ({
    meta: [
      { title: "Quick Work-Smart Work | Syllabus to Lesson Plan" },
      {
        name: "description",
        content:
          "Turn a syllabus stored in a Google Sheet into a day-by-day lesson plan. Choose the number of teaching days and get topics, objectives, activities and resources.",
      },
      { property: "og:title", content: "Quick Work-Smart Work" },
      {
        property: "og:description",
        content:
          "Paste a syllabus sheet, pick the number of days, and get a ready day-wise lesson plan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function LessonPlanPage() {
  const run = useServerFn(generateLessonPlan);
  const [sheet, setSheet] = useState("");
  const [tab, setTab] = useState("Sheet1");
  const [subject, setSubject] = useState("");
  const [days, setDays] = useState(30);

  const { mutate, data, isPending, error } = useMutation<LessonPlanResult, Error>({
    mutationFn: () => run({ data: { sheet, tab, subject, days } }),
  });

  return (
    <main className="min-h-screen bg-background">
      <PageHero
        image={heroLessonPlan}
        priority
        eyebrow="Syllabus to plan"
        title="QUICK WORK-SMART WORK"
        description="Share the syllabus sheet, tell us how many teaching days you have, and get a complete day-wise lesson plan in seconds."
      />

      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        <div className="mb-6">
          <DashboardTabs />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutate();
          }}
          className="rounded-2xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="text-lg font-semibold text-foreground">Create a lesson plan</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="lp-sheet"
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Google Sheet link with the syllabus
              </label>
              <input
                id="lp-sheet"
                required
                value={sheet}
                onChange={(e) => setSheet(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/…"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Share the sheet with the connected Google account so it can be read.
              </p>
            </div>

            <div>
              <label
                htmlFor="lp-tab"
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Sheet tab name
              </label>
              <input
                id="lp-tab"
                value={tab}
                onChange={(e) => setTab(e.target.value)}
                placeholder="Sheet1"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label
                htmlFor="lp-subject"
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Subject name (optional)
              </label>
              <input
                id="lp-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Data Structures"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label
                htmlFor="lp-days"
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Number of days
              </label>
              <input
                id="lp-days"
                type="number"
                min={1}
                max={90}
                required
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm tabular-nums text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
                style={{ background: "var(--gradient-hero)" }}
              >
                {isPending ? "Preparing plan…" : "Generate lesson plan"}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {error.message}
          </div>
        )}

        {isPending && (
          <div className="mt-6 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        {data && !isPending && (
          <>
            <section className="mt-10 grid gap-5 sm:grid-cols-3">
              <div
                className="rounded-2xl border border-border bg-card p-6"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Subject
                </p>
                <p className="mt-3 text-xl font-bold text-foreground">{data.subject}</p>
              </div>
              <div
                className="rounded-2xl border border-border bg-card p-6"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Days planned
                </p>
                <p className="mt-3 text-4xl font-bold tabular-nums text-primary">
                  {data.days.length}
                </p>
              </div>
              <div
                className="rounded-2xl border border-border bg-card p-6"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Syllabus rows read
                </p>
                <p className="mt-3 text-4xl font-bold tabular-nums text-accent">
                  {data.syllabusPreview.length}+
                </p>
              </div>
            </section>

            <section className="mt-8">
              <div
                className="overflow-hidden rounded-2xl border border-border bg-card"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="border-b border-border bg-secondary/60 px-6 py-4">
                  <h2 className="text-base font-semibold text-secondary-foreground">
                    Day-wise lesson plan
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-5 py-3 font-semibold">Day</th>
                        <th className="px-5 py-3 font-semibold">Unit</th>
                        <th className="px-5 py-3 font-semibold">Topic</th>
                        <th className="px-5 py-3 font-semibold">Learning objective</th>
                        <th className="px-5 py-3 font-semibold">Activity</th>
                        <th className="px-5 py-3 font-semibold">Resources</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.days.map((d) => (
                        <tr key={d.day} className="border-t border-border align-top">
                          <td className="px-5 py-3 font-semibold tabular-nums text-foreground">
                            {d.day}
                          </td>
                          <td className="px-5 py-3 text-foreground">{d.unit || "—"}</td>
                          <td className="px-5 py-3 font-medium text-foreground">
                            {d.topic || "—"}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">
                            {d.objective || "—"}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">{d.activity || "—"}</td>
                          <td className="px-5 py-3 text-muted-foreground">{d.resources || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-lg font-semibold text-foreground">Syllabus we used</h2>
              <ul className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                {data.syllabusPreview.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
