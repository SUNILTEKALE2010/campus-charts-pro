import type { AttendanceDeptStats, AttendanceRow } from "./attendance.types";

const num = (s: string) => Number(String(s ?? "").replace(/[^\d.]/g, "")) || 0;

export function parseAttendance(values: string[][]): {
  students: AttendanceRow[];
  depts: AttendanceDeptStats[];
  monthLabels: string[];
} {
  const students: AttendanceRow[] = [];
  let monthLabels: string[] = [];
  let monthMax: number[] = [];
  let totalMax = 0;
  let idx = { total: -1, percent: -1, cond: -1 };

  for (const row of values) {
    const cells = (row ?? []).map((c) => (c ?? "").trim());
    if (!cells.some((c) => c !== "")) continue;

    if (/^branch$/i.test(cells[0] ?? "")) {
      idx = {
        total: cells.findIndex((c) => /^total/i.test(c)),
        percent: cells.findIndex((c) => /attendance\s*%/i.test(c)),
        cond: cells.findIndex((c) => /condonation/i.test(c)),
      };
      const end = idx.total > 0 ? idx.total : cells.length;
      const monthCells = cells.slice(2, end).filter((c) => c !== "");
      monthLabels = monthCells.map((c) => c.replace(/\s*\(.*\)\s*/, "").trim());
      monthMax = monthCells.map((c) => num(c.match(/\((.*?)\)/)?.[1] ?? ""));
      totalMax = num((cells[idx.total] ?? "").match(/\((.*?)\)/)?.[1] ?? "");
      if (!totalMax) totalMax = monthMax.reduce((a, b) => a + b, 0);
      continue;
    }

    const dept = cells[0] ?? "";
    const htno = cells[1] ?? "";
    if (!dept || !htno || !monthLabels.length) continue;

    const months = monthLabels.map((label, i) => ({
      label,
      value: num(cells[i + 2] ?? ""),
    }));
    const total = idx.total > 0 ? num(cells[idx.total] ?? "") : months.reduce((s, m) => s + m.value, 0);
    const sheetPercent = idx.percent > 0 ? num(cells[idx.percent] ?? "") : 0;
    const percent = sheetPercent || (totalMax ? (total / totalMax) * 100 : 0);

    students.push({
      dept,
      htno,
      months,
      total,
      totalMax,
      percent,
      condonation: /^y/i.test(cells[idx.cond] ?? ""),
    });
  }

  const deptMap = new Map<string, AttendanceRow[]>();
  for (const s of students) {
    const list = deptMap.get(s.dept) ?? [];
    list.push(s);
    deptMap.set(s.dept, list);
  }

  const depts: AttendanceDeptStats[] = [...deptMap.entries()].map(([dept, list]) => ({
    dept,
    monthLabels,
    count: list.length,
    averagePercent: list.length ? list.reduce((s, x) => s + x.percent, 0) / list.length : 0,
    condonationYes: list.filter((x) => x.condonation).length,
    condonationNo: list.filter((x) => !x.condonation).length,
  }));
  depts.sort((a, b) => b.averagePercent - a.averagePercent);

  return { students, depts, monthLabels };
}
