import { createServerFn } from "@tanstack/react-start";

const AI_URL = "https://ai.gateway.lovable.dev/v1/responses";

export type QAItem = { question: string; answer: string; example: string };
export type MCQItem = {
  question: string;
  options: string[];
  answer: string;
  example: string;
};

export type QuestionBankResult = {
  subject: string;
  longQuestions: QAItem[];
  shortQuestions: QAItem[];
  fillInTheBlanks: QAItem[];
  mcqs: MCQItem[];
};

function toQA(list: unknown): QAItem[] {
  return (Array.isArray(list) ? list : []).map((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    return {
      question: String(row["question"] ?? ""),
      answer: String(row["answer"] ?? ""),
      example: String(row["example"] ?? ""),
    };
  });
}

function toMCQ(list: unknown): MCQItem[] {
  return (Array.isArray(list) ? list : []).map((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    const options = Array.isArray(row["options"])
      ? (row["options"] as unknown[]).map((o) => String(o ?? ""))
      : [];
    return {
      question: String(row["question"] ?? ""),
      options,
      answer: String(row["answer"] ?? ""),
      example: String(row["example"] ?? ""),
    };
  });
}

export const generateQuestionBank = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const d = (data ?? {}) as Record<string, unknown>;
    const subject = String(d["subject"] ?? "").trim();
    const topic = String(d["topic"] ?? "").trim();
    if (!subject) throw new Error("Please enter the subject name.");
    return { subject, topic };
  })
  .handler(async ({ data }): Promise<QuestionBankResult> => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `You are an experienced college faculty member preparing an exam question bank.

SUBJECT: ${data.subject}
${data.topic ? `FOCUS TOPICS/UNITS: ${data.topic}` : ""}

Create exactly:
- 10 long answer questions
- 10 short answer questions
- 10 fill in the blanks
- 10 multiple choice questions (4 options each)

Every item must include an answer written in simple, plain language a student can
understand, plus a short real-world / real-time example. For fill in the blanks,
write the question with a "______" blank and give the missing word as the answer.
For MCQs, the answer must be the full text of the correct option.

Return ONLY valid JSON in this exact shape:
{"subject":"...",
 "longQuestions":[{"question":"...","answer":"...","example":"..."}],
 "shortQuestions":[{"question":"...","answer":"...","example":"..."}],
 "fillInTheBlanks":[{"question":"...","answer":"...","example":"..."}],
 "mcqs":[{"question":"...","options":["a","b","c","d"],"answer":"...","example":"..."}]}`;

    const res = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: prompt,
        stream: true,
        reasoning: { effort: "low" },
        text: { format: { type: "json_object" } },
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.text();
      console.error(`Question bank request failed [${res.status}]: ${body}`);
      if (res.status === 429) {
        throw new Error("Too many requests right now. Please wait a moment and try again.");
      }
      if (res.status === 402) {
        throw new Error("AI credits are exhausted. Please top up to keep generating question banks.");
      }
      throw new Error(`Question bank generation failed [${res.status}]`);
    }

    // Read the SSE stream and accumulate the answer text.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        for (const line of part.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload) as { type?: string; delta?: string };
            if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
              text += evt.delta;
            }
          } catch {
            // ignore keep-alive / non-JSON frames
          }
        }
      }
    }

    const cleaned = text
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      throw new Error("The generated question bank couldn't be read. Please try again.");
    }

    return {
      subject: String(parsed["subject"] ?? data.subject),
      longQuestions: toQA(parsed["longQuestions"]),
      shortQuestions: toQA(parsed["shortQuestions"]),
      fillInTheBlanks: toQA(parsed["fillInTheBlanks"]),
      mcqs: toMCQ(parsed["mcqs"]),
    };
  });
