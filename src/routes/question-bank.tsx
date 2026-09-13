import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  generateQuestionBank,
  type QAItem,
  type QuestionBankResult,
} from "@/lib/question-bank.functions";
import { DashboardTabs } from "@/components/DashboardTabs";
import { PageHero } from "@/components/PageHero";
import heroQuestionBank from "@/assets/hero-question-bank.jpg";

export const Route = createFileRoute("/question-bank")({
  component: QuestionBankPage,
  head: () => ({
    meta: [
      { title: "Question Bank | Subject-wise Exam Questions" },
      {
        name: "description",
        content:
          "Enter a subject and get 10 long, 10 short, 10 fill in the blanks and 10 MCQ questions with simple answers and real-world examples.",
      },
      { property: "og:title", content: "Question Bank" },
      {
        property: "og:description",
        content:
          "Generate long, short, fill in the blanks and MCQ questions with simple answers and real-time examples.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function QASection({
  title,
  items,
  blanks = false,
}: {
  title: string;
  items: QAItem[];
  blanks?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-8">
      <div
        className="overflow-hidden rounded-2xl border border-border bg-card"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="border-b border-border bg-secondary/60 px-6 py-4">
          <h2 className="text-base font-semibold text-secondary-foreground">
            {title} <span className="text-muted-foreground">({items.length})</span>
          </h2>
        </div>
        <ol className="divide-y divide-border">
          {items.map((item, i) => (
            <li key={i} className="px-6 py-5">
              <p className="font-medium text-foreground">
                <span className="mr-2 tabular-nums text-primary">{i + 1}.</span>
                {item.question}
              </p>
              <p className="mt-2 text-sm text-foreground">
                <span className="font-semibold text-primary">
                  {blanks ? "Missing word: " : "Answer: "}
                </span>
                {item.answer || "—"}
              </p>
              {item.example && (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  <span className="font-semibold text-accent">Real-life example: </span>
                  {item.example}
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function QuestionBankPage() {
  const run = useServerFn(generateQuestionBank);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");

  const { mutate, data, isPending, error } = useMutation<QuestionBankResult, Error>({
    mutationFn: () => run({ data: { subject, topic } }),
  });

  return (
    <main className="min-h-screen bg-background">
      <PageHero
        image={heroQuestionBank}
        priority
        eyebrow="Exam preparation"
        title="QUESTION BANK"
        description="Type a subject name and get 10 long questions, 10 short questions, 10 fill in the blanks and 10 MCQs — each with a simple answer and a real-life example."
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
          <h2 className="text-lg font-semibold text-foreground">Create a question bank</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <div>
              <label
                htmlFor="qb-subject"
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Subject name
              </label>
              <input
                id="qb-subject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Data Structures"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label
                htmlFor="qb-topic"
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Units / topics (optional)
              </label>
              <input
                id="qb-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Trees, Graphs, Sorting"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
                style={{ background: "var(--gradient-hero)" }}
              >
                {isPending ? "Preparing questions…" : "Generate question bank"}
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
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        {data && !isPending && (
          <>
            <section className="mt-10 grid gap-5 sm:grid-cols-4">
              {[
                { label: "Long questions", value: data.longQuestions.length },
                { label: "Short questions", value: data.shortQuestions.length },
                { label: "Fill in the blanks", value: data.fillInTheBlanks.length },
                { label: "MCQs", value: data.mcqs.length },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-border bg-card p-6"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-3 text-4xl font-bold tabular-nums text-primary">{card.value}</p>
                </div>
              ))}
            </section>

            <p className="mt-6 text-sm text-muted-foreground">
              Question bank for <span className="font-semibold text-foreground">{data.subject}</span>
            </p>

            <QASection title="Long answer questions" items={data.longQuestions} />
            <QASection title="Short answer questions" items={data.shortQuestions} />
            <QASection title="Fill in the blanks" items={data.fillInTheBlanks} blanks />

            {data.mcqs.length > 0 && (
              <section className="mt-8">
                <div
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="border-b border-border bg-secondary/60 px-6 py-4">
                    <h2 className="text-base font-semibold text-secondary-foreground">
                      Multiple choice questions{" "}
                      <span className="text-muted-foreground">({data.mcqs.length})</span>
                    </h2>
                  </div>
                  <ol className="divide-y divide-border">
                    {data.mcqs.map((item, i) => (
                      <li key={i} className="px-6 py-5">
                        <p className="font-medium text-foreground">
                          <span className="mr-2 tabular-nums text-primary">{i + 1}.</span>
                          {item.question}
                        </p>
                        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                          {item.options.map((opt, oi) => (
                            <li
                              key={oi}
                              className={
                                opt === item.answer
                                  ? "rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-foreground"
                                  : "rounded-lg px-3 py-1.5 text-sm text-muted-foreground"
                              }
                            >
                              {String.fromCharCode(65 + oi)}. {opt}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-sm text-foreground">
                          <span className="font-semibold text-primary">Answer: </span>
                          {item.answer || "—"}
                        </p>
                        {item.example && (
                          <p className="mt-1.5 text-sm text-muted-foreground">
                            <span className="font-semibold text-accent">Real-life example: </span>
                            {item.example}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
