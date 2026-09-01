import type { TodayDeptStats, TodayRow } from "./today.types";

/** Accepts a plain URL, an =IMAGE("url") formula or a Google Drive share link. */
function normalizePhoto(value: string): string {
  if (!value) return "";
  const fromFormula = value.match(/^=?\s*IMAGE\(\s*"([^"]+)"/i)?.[1];
  const url = (fromFormula ?? value).trim();
  const driveId =
    url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)?.[1] ??
    url.match(/[?&]id=([\w-]+)/)?.[1];
  if (driveId) return `https://drive.google.com/thumbnail?id=${driveId}&sz=w400`;
  return /^https?:\/\//i.test(url) ? url : "";
}


export function parseToday(values: string[][]): {
  students: TodayRow[];
  depts: TodayDeptStats[];
} {
  const students: TodayRow[] = [];

  for (const row of values) {
    const cells = (row ?? []).map((c) => (c ?? "").trim());
    if (!cells.some((c) => c !== "")) continue;
    if (/^dept/i.test(cells[0] ?? "") || /^branch$/i.test(cells[0] ?? "")) continue;

    const dept = cells[0] ?? "";
    const htno = cells[1] ?? "";
    const raw = cells[2] ?? "";
    if (!dept || !htno || !raw) continue;

    const clean = (v: string, header: string) =>
      !v || v.toUpperCase() === header ? "" : v;

    students.push({
      dept,
      htno,
      status: /^p/i.test(raw) ? "PRESENT" : "ABSENT",
      address: clean(cells[3] ?? "", "ADDRESS"),
      phone: clean(cells[4] ?? "", "PHNO"),
      altPhone: clean(cells[5] ?? "", "ALTERNATE PHNO"),
      photo: normalizePhoto(clean(cells[6] ?? "", "PHOTO")),
    });
  }

  const map = new Map<string, TodayRow[]>();
  for (const s of students) {
    const list = map.get(s.dept) ?? [];
    list.push(s);
    map.set(s.dept, list);
  }

  const depts: TodayDeptStats[] = [...map.entries()].map(([dept, list]) => {
    const present = list.filter((x) => x.status === "PRESENT").length;
    return {
      dept,
      total: list.length,
      present,
      absent: list.length - present,
      presentPercent: list.length ? (present / list.length) * 100 : 0,
    };
  });
  depts.sort((a, b) => b.presentPercent - a.presentPercent);

  return { students, depts };
}
