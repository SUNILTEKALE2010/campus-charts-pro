import { createServerFn } from "@tanstack/react-start";

const SPREADSHEET_ID = "1-eV-RVBO4g-pFMhp0xuos7ge-dAleWpjfo1Q4nbQjd0";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

export type StudentRow = {
  dept: string;
  htno: string;
  subjects: { subject: string; mark: number }[];
  total: number;
  maxTotal: number;
  percent: number;
};

export type DeptStats = {
  dept: string;
  subjects: string[];
  count: number;
  average: number;
  highest: number;
  lowest: number;
  median: number;
  maxTotal: number;
  averagePercent: number;
};

export type PerformancePayload = {
  students: StudentRow[];
  depts: DeptStats[];
  updatedAt: string;
};

const MAX_BY_KIND = (subject: string) => (/lab/i.test(subject) ? 20 : 40);

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] ?? 0) : (((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2);
}

function parseSheet(values: string[][]): { students: StudentRow[]; depts: DeptStats[] } {
  const students: StudentRow[] = [];
  const subjectsByDept = new Map<string, string[]>();
  let headers: string[] = [];

  for (const row of values) {
    const cells = (row ?? []).map((c) => (c ?? "").trim());
    if (!cells.some((c) => c !== "")) continue;

    if (/^branch$/i.test(cells[0] ?? "")) {
      headers = cells.slice(2).filter((c) => c !== "");
      continue;
    }

    const dept = cells[0] ?? "";
    const htno = cells[1] ?? "";
    if (!dept || !htno || !headers.length) continue;

    const subjects = headers.map((subject, i) => ({
      subject,
      mark: Number(cells[i + 2] ?? "") || 0,
    }));
    const total = subjects.reduce((s, x) => s + x.mark, 0);
    const maxTotal = headers.reduce((s, x) => s + MAX_BY_KIND(x), 0);

    if (!subjectsByDept.has(dept)) subjectsByDept.set(dept, headers);
    students.push({
      dept,
      htno,
      subjects,
      total,
      maxTotal,
      percent: maxTotal ? (total / maxTotal) * 100 : 0,
    });
  }

  const depts: DeptStats[] = [...subjectsByDept.entries()].map(([dept, subjects]) => {
    const list = students.filter((s) => s.dept === dept);
    const totals = list.map((s) => s.total);
    const maxTotal = list[0]?.maxTotal ?? 0;
    const average = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    return {
      dept,
      subjects,
      count: list.length,
      average,
      highest: totals.length ? Math.max(...totals) : 0,
      lowest: totals.length ? Math.min(...totals) : 0,
      median: median(totals),
      maxTotal,
      averagePercent: maxTotal ? (average / maxTotal) * 100 : 0,
    };
  });

  depts.sort((a, b) => b.averagePercent - a.averagePercent);
  return { students, depts };
}

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
        `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/Sheet3!A1:Z1000`,
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
    const { students, depts } = parseSheet(data.values ?? []);
    const payload: PerformancePayload = {
      students,
      depts,
      updatedAt: new Date().toISOString(),
    };
    cache = { data: payload, at: Date.now() };
    return payload;
  },
);
