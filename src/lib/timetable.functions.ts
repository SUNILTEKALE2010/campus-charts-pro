import { createServerFn } from "@tanstack/react-start";

const SPREADSHEET_ID = "1-eV-RVBO4g-pFMhp0xuos7ge-dAleWpjfo1Q4nbQjd0";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

export type Slot = {
  period: string;
  raw: string;
  subject: string;
  faculty: string;
};

export type DayRow = {
  day: string;
  slots: Slot[];
};

export type SectionTimetable = {
  section: string;
  year: string;
  dept: string;
  room: string;
  periods: string[];
  days: DayRow[];
};

export type TimetablePayload = {
  sections: SectionTimetable[];
  updatedAt: string;
};

/** Splits "Java Lab (Ramu)" into subject + faculty. */
function splitCell(raw: string): { subject: string; faculty: string } {
  const text = (raw ?? "").trim();
  const m = text.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (m) return { subject: (m[1] ?? "").trim(), faculty: (m[2] ?? "").trim() };
  return { subject: text, faculty: "" };
}

const ROMAN_BY_NUMBER: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV" };

/** Normalises "Year-2", "2nd year", "II" → "II". */
function normaliseYear(raw: string): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const num = text.match(/(\d+)/);
  if (num) return ROMAN_BY_NUMBER[num[1]!] ?? num[1]!;
  const roman = text.match(/\b(IV|III|II|I)\b/i);
  if (roman) return roman[1]!.toUpperCase();
  return "";
}

/**
 * Reads the year of study and department from a Sheet2 section row.
 * Sheet2 keeps them in their own cells, e.g. ["", "SECTION A", "ROOM-10", "Section-A", "Year-2"].
 */
function parseSectionMeta(cells: string[]): { year: string; dept: string } {
  let year = "";
  let dept = "";
  for (const cell of cells) {
    if (!cell) continue;
    if (!year && /year/i.test(cell)) year = normaliseYear(cell);
    if (!dept && /^(cse|ece|eee|mech|civil|it|csm|aiml|ds)\b/i.test(cell)) dept = cell.toUpperCase();
  }
  return { year: year || "—", dept: dept || "—" };
}

function parseSheet(values: string[][]): SectionTimetable[] {
  const sections: SectionTimetable[] = [];
  let current: SectionTimetable | null = null;

  for (const row of values) {
    const cells = (row ?? []).map((c) => (c ?? "").trim());
    const first = cells.find((c) => c !== "") ?? "";
    if (!first) continue;

    const idx = cells.findIndex((c) => c !== "");
    const label = cells[idx] ?? "";
    const next = cells[idx + 1] ?? "";

    if (/^section\b/i.test(label)) {
      const { year, dept } = parseSectionMeta(cells);
      current = {
        section: label,
        year,
        dept,
        room: next || "—",
        periods: [],
        days: [],
      };
      sections.push(current);
      continue;
    }

    if (/^day$/i.test(label)) {
      if (current) current.periods = cells.slice(idx + 1).filter((c) => c !== "");
      continue;
    }

    if (current && current.periods.length) {
      const slotCells = cells.slice(idx + 1);
      const slots: Slot[] = current.periods.map((period, i) => {
        const raw = slotCells[i] ?? "";
        const { subject, faculty } = splitCell(raw);
        return { period, raw, subject, faculty };
      });
      current.days.push({ day: label, slots });
    }
  }

  return sections;
}

const CACHE_TTL_MS = 60_000;
let cache: { data: TimetablePayload; at: number } | null = null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const getTimetable = createServerFn({ method: "GET" }).handler(
  async (): Promise<TimetablePayload> => {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];
    if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
    if (!sheetsKey) throw new Error("GOOGLE_SHEETS_API_KEY is not configured");

    let res: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(
        `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/Sheet2!A1:Z200`,
        {
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": sheetsKey,
          },
        },
      );
      if (res.ok) break;
      if ((res.status === 429 || res.status >= 500) && attempt < 2) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      break;
    }

    if (!res || !res.ok) {
      const body = res ? await res.text() : "no response";
      console.error(`Sheets request failed [${res?.status}]: ${body}`);
      if (cache) return cache.data;
      if (res?.status === 429) {
        throw new Error(
          "Google Sheets is rate limiting requests right now. Please wait a minute and refresh.",
        );
      }
      throw new Error(`Sheets request failed [${res?.status}]: ${body}`);
    }

    const data = (await res.json()) as { values?: string[][] };
    const payload: TimetablePayload = {
      sections: parseSheet(data.values ?? []),
      updatedAt: new Date().toISOString(),
    };
    cache = { data: payload, at: Date.now() };
    return payload;
  },
);
