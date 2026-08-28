import { createServerFn } from "@tanstack/react-start";
import { parseSheet } from "./performance.server";
import type { PerformancePayload } from "./performance.types";

const SPREADSHEET_ID = "1-eV-RVBO4g-pFMhp0xuos7ge-dAleWpjfo1Q4nbQjd0";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

const CACHE_TTL_MS = 60_000;
let cache: { data: PerformancePayload; at: number } | null = null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const getPerformance = createServerFn({ method: "GET" }).handler(
  async (): Promise<PerformancePayload> => {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];
    if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
    if (!sheetsKey) throw new Error("GOOGLE_SHEETS_API_KEY is not configured");

    let res: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(
        `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/Sheet3!A1:Z2000`,
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
    const { students, depts, faculty } = parseSheet(data.values ?? []);
    const payload: PerformancePayload = {
      students,
      depts,
      faculty,
      updatedAt: new Date().toISOString(),
    };
    cache = { data: payload, at: Date.now() };
    return payload;
  },
);
