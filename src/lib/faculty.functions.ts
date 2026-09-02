import { createServerFn } from "@tanstack/react-start";

const SPREADSHEET_ID = "1-eV-RVBO4g-pFMhp0xuos7ge-dAleWpjfo1Q4nbQjd0";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

export type FacultyRow = {
  sno: string;
  name: string;
  loginTime: string;
  logoutTime: string;
  hours: number;
  dept: string;
  /** Raw date text from the sheet, e.g. "01-Jul-2026" */
  date: string;
  /** Sortable month key, e.g. "2026-07" ("" when unparseable) */
  monthKey: string;
  /** Human month label, e.g. "Jul 2026" */
  monthLabel: string;
  /** Day of month 1-31, or 0 when unparseable */
  day: number;
  /** Sortable ISO date, e.g. "2026-07-01" ("" when unparseable) */
  isoDate: string;
  /** Direct image URL for the faculty photo ("" when missing) */
  photo: string;
};

/** Accepts a plain URL, an =IMAGE("url") formula or a Google Drive share link. */
function normalizePhoto(value: string): string {
  if (!value) return "";
  const fromFormula = value.match(/^=?\s*IMAGE\(\s*"([^"]+)"/i)?.[1];
  const url = (fromFormula ?? value).trim();
  const driveId =
    url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)?.[1] ?? url.match(/[?&]id=([\w-]+)/)?.[1];
  if (driveId) return `https://lh3.googleusercontent.com/d/${driveId}=w400`;
  return /^https?:\/\//i.test(url) ? url : "";
}

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Parses "01-Jul-2026", "1/7/2026" or "2026-07-01" into parts. */
function parseDate(raw: string) {
  const text = (raw ?? "").trim();
  if (!text) return { monthKey: "", monthLabel: "—", day: 0, isoDate: "" };

  let day = 0;
  let monthIdx = -1;
  let year = 0;

  const named = text.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{2,4})$/);
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const numeric = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);

  if (named) {
    day = Number(named[1]);
    monthIdx = MONTHS.indexOf(named[2]!.slice(0, 3).toLowerCase());
    year = Number(named[3]);
  } else if (iso) {
    year = Number(iso[1]);
    monthIdx = Number(iso[2]) - 1;
    day = Number(iso[3]);
  } else if (numeric) {
    day = Number(numeric[1]);
    monthIdx = Number(numeric[2]) - 1;
    year = Number(numeric[3]);
  }

  if (monthIdx < 0 || monthIdx > 11 || !year)
    return { monthKey: "", monthLabel: "—", day: 0, isoDate: "" };
  if (year < 100) year += 2000;

  const mm = String(monthIdx + 1).padStart(2, "0");
  return {
    monthKey: `${year}-${mm}`,
    monthLabel: `${MONTH_LABELS[monthIdx]} ${year}`,
    day,
    isoDate: `${year}-${mm}-${String(day).padStart(2, "0")}`,
  };
}

/** Parses "8 hrs 50 mins", "8.5" or "8" into decimal hours. */
function parseHours(raw: string): number {
  const text = (raw ?? "").trim();
  if (!text) return 0;
  const composite = text.match(/(\d+(?:\.\d+)?)\s*h\w*(?:\s*(\d+)\s*m)?/i);
  if (composite) {
    return Number(composite[1]) + (composite[2] ? Number(composite[2]) / 60 : 0);
  }
  return Number.parseFloat(text) || 0;
}

type Payload = { faculty: FacultyRow[]; updatedAt: string };

// Simple in-memory cache so repeated dashboard loads don't hammer the Sheets API.
const CACHE_TTL_MS = 60_000;
let cache: { data: Payload; at: number } | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const getFaculty = createServerFn({ method: "GET" }).handler(async (): Promise<Payload> => {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  const lovableKey = process.env["LOVABLE_API_KEY"];
  const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!sheetsKey) throw new Error("GOOGLE_SHEETS_API_KEY is not configured");

  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(
      `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A1:Z1000`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": sheetsKey,
        },
      },
    );
    if (res.ok) break;
    // Rate limited / transient: back off and retry.
    if (res.status === 429 || res.status >= 500) {
      if (attempt < 2) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
    }
    break;
  }

  if (!res || !res.ok) {
    const body = res ? await res.text() : "no response";
    console.error(`Sheets request failed [${res?.status}]: ${body}`);
    // Serve last known good data rather than blanking the dashboard.
    if (cache) return cache.data;
    if (res?.status === 429) {
      throw new Error(
        "Google Sheets is rate limiting requests right now. Please wait a minute and refresh.",
      );
    }
    throw new Error(`Sheets request failed [${res?.status}]: ${body}`);
  }

  const data = (await res.json()) as { values?: string[][] };
  const rows = (data.values ?? []).slice(1);

  const faculty: FacultyRow[] = rows
    .filter((r) => (r?.[1] ?? "").trim() !== "")
    .map((r) => {
      const date = (r[6] ?? "").trim();
      const { monthKey, monthLabel, day, isoDate } = parseDate(date);
      return {
        sno: r[0] ?? "",
        name: (r[1] ?? "").trim(),
        loginTime: r[2] ?? "",
        logoutTime: r[3] ?? "",
        hours: parseHours(r[4] ?? ""),
        dept: (r[5] ?? "—").trim() || "—",
        date,
        monthKey,
        monthLabel,
        day,
        isoDate,
        photo: normalizePhoto((r[7] ?? "").trim()),
      };
    });

  const payload: Payload = { faculty, updatedAt: new Date().toISOString() };
  cache = { data: payload, at: Date.now() };
  return payload;
});
