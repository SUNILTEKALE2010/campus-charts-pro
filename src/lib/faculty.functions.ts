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
};

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
    .map((r) => ({
      sno: r[0] ?? "",
      name: (r[1] ?? "").trim(),
      loginTime: r[2] ?? "",
      logoutTime: r[3] ?? "",
      hours: Number.parseFloat(r[4] ?? "0") || 0,
      dept: (r[5] ?? "—").trim() || "—",
    }));

  const payload: Payload = { faculty, updatedAt: new Date().toISOString() };
  cache = { data: payload, at: Date.now() };
  return payload;
});
