import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type LessonPlanDay = {
  day: number;
  unit: string;
  topic: string;
  objective: string;
  activity: string;
  resources: string;
};

export type LessonPlanResult = {
  subject: string;
  days: LessonPlanDay[];
  syllabusPreview: string[];
};

/** Accepts a full Google Sheets URL or a bare spreadsheet ID. */
function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/\/spreadsheets\/d\/([\w-]+)/)?.[1];
  return (fromUrl ?? trimmed).trim();
}

export const generateLessonPlan = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const d = (data ?? {}) as Record<string, unknown>;
    const sheet = extractSpreadsheetId(String(d["sheet"] ?? ""));
    const tab = String(d["tab"] ?? "Sheet1").trim() || "Sheet1";
    const days = Number(d["days"] ?? 0);
    const subject = String(d["subject"] ?? "").trim();
    if (!sheet) throw new Error("Please paste the Google Sheet link or its ID.");
    if (!Number.isFinite(days) || days < 1 || days > 90) {
      throw new Error("Number of days must be between 1 and 90.");
    }
    return { sheet, tab, days: Math.round(days), subject };
  })
  .handler(async ({ data }): Promise<LessonPlanResult> => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];
    if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
    if (!sheetsKey) throw new Error("GOOGLE_SHEETS_API_KEY is not configured");

    const range = `${data.tab}!A1:Z500`;
    const sheetRes = await fetch(
      `${GATEWAY_URL}/spreadsheets/${data.sheet}/values/${range}`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": sheetsKey,
        },
      },
    );
    if (!sheetRes.ok) {
      const body = await sheetRes.text();
      console.error(`Sheets request failed [${sheetRes.status}]: ${body}`);
      throw new Error(
        sheetRes.status === 400 || sheetRes.status === 404
          ? `Couldn't read "${data.tab}" in that sheet. Check the tab name and that the sheet is shared with the connected Google account.`
          : `Sheets request failed [${sheetRes.status}]: ${body}`,
      );
    }

    const sheetJson = (await sheetRes.json()) as { values?: string[][] };
    const lines = (sheetJson.values ?? [])
      .map((row) => (row ?? []).map((c) => (c ?? "").trim()).filter(Boolean).join(" | "))
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      throw new Error("That sheet tab looks empty — add the syllabus content and try again.");
    }

    const prompt = `You are an experienced college faculty member preparing an official lesson plan.

SUBJECT: ${data.subject || "(infer from the syllabus)"}
NUMBER OF TEACHING DAYS: ${data.days}

SYLLABUS (rows from a Google Sheet):
${lines.join("\n")}

Split the whole syllabus evenly across exactly ${data.days} teaching days (one row per day, day 1..${data.days}).
Return ONLY valid JSON, no markdown fences, in this shape:
{"subject":"...","days":[{"day":1,"unit":"...","topic":"...","objective":"...","activity":"...","resources":"..."}]}
Keep each field to one short sentence.`;

    const aiRes = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text();
      console.error(`AI request failed [${aiRes.status}]: ${body}`);
      if (aiRes.status === 429) {
        throw new Error("Too many requests right now. Please wait a moment and try again.");
      }
      if (aiRes.status === 402) {
        throw new Error("AI credits are exhausted. Please top up to keep generating plans.");
      }
      throw new Error(`Lesson plan generation failed [${aiRes.status}]: ${body}`);
    }

    const aiJson = (await aiRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = aiJson.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let parsed: { subject?: string; days?: unknown[] };
    try {
      parsed = JSON.parse(cleaned) as { subject?: string; days?: unknown[] };
    } catch {
      throw new Error("The generated plan couldn't be read. Please try again.");
    }

    const days: LessonPlanDay[] = (parsed.days ?? []).map((d, i) => {
      const row = (d ?? {}) as Record<string, unknown>;
      return {
        day: Number(row["day"]) || i + 1,
        unit: String(row["unit"] ?? ""),
        topic: String(row["topic"] ?? ""),
        objective: String(row["objective"] ?? ""),
        activity: String(row["activity"] ?? ""),
        resources: String(row["resources"] ?? ""),
      };
    });

    return {
      subject: parsed.subject || data.subject || "Lesson plan",
      days,
      syllabusPreview: lines.slice(0, 12),
    };
  });
