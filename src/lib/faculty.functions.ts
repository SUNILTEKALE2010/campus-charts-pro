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

export const getFaculty = createServerFn({ method: "GET" }).handler(async () => {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!sheetsKey) throw new Error("GOOGLE_SHEETS_API_KEY is not configured");

  const res = await fetch(
    `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A1:Z1000`,
    {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": sheetsKey,
      },
    },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`Sheets request failed [${res.status}]: ${body}`);
    throw new Error(`Sheets request failed [${res.status}]: ${body}`);
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

  return { faculty, updatedAt: new Date().toISOString() };
});
