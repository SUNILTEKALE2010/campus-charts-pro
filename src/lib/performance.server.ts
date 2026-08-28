import type {
  DeptStats,
  FacultyStats,
  FacultySubjectStats,
  StudentRow,
  SubjectMeta,
  Stats,
} from "./performance.types";

const maxForSubject = (subject: string) => (/lab/i.test(subject) ? 20 : 40);

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] ?? 0) : (((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2);
}

function stats(marks: number[], max: number): Stats {
  const count = marks.length;
  const average = count ? marks.reduce((a, b) => a + b, 0) / count : 0;
  return {
    count,
    average,
    highest: count ? Math.max(...marks) : 0,
    lowest: count ? Math.min(...marks) : 0,
    median: median(marks),
    max,
    percent: max ? (average / max) * 100 : 0,
  };
}

export function parseSheet(values: string[][]): {
  students: StudentRow[];
  depts: DeptStats[];
  faculty: FacultyStats[];
} {
  const students: StudentRow[] = [];
  const metaByDept = new Map<string, SubjectMeta[]>();
  let facultyRow: string[] = [];
  let meta: SubjectMeta[] = [];

  for (const row of values) {
    const cells = (row ?? []).map((c) => (c ?? "").trim());
    if (!cells.some((c) => c !== "")) continue;

    if (/^faculty$/i.test(cells[1] ?? "")) {
      facultyRow = cells.slice(2);
      continue;
    }

    if (/^branch$/i.test(cells[0] ?? "")) {
      meta = cells
        .slice(2)
        .filter((c) => c !== "")
        .map((subject, i) => ({
          subject,
          faculty: facultyRow[i] ?? "",
          max: maxForSubject(subject),
        }));
      continue;
    }

    const dept = cells[0] ?? "";
    const htno = cells[1] ?? "";
    if (!dept || !htno || !meta.length) continue;

    const subjects = meta.map((m, i) => ({
      subject: m.subject,
      faculty: m.faculty,
      max: m.max,
      mark: Number(cells[i + 2] ?? "") || 0,
    }));
    const total = subjects.reduce((s, x) => s + x.mark, 0);
    const maxTotal = meta.reduce((s, x) => s + x.max, 0);

    if (!metaByDept.has(dept)) metaByDept.set(dept, meta);
    students.push({
      dept,
      htno,
      subjects,
      total,
      maxTotal,
      percent: maxTotal ? (total / maxTotal) * 100 : 0,
    });
  }

  const depts: DeptStats[] = [...metaByDept.entries()].map(([dept, subjectMeta]) => {
    const list = students.filter((s) => s.dept === dept);
    const totals = list.map((s) => s.total);
    const maxTotal = subjectMeta.reduce((s, x) => s + x.max, 0);
    const base = stats(totals, maxTotal);
    return {
      ...base,
      dept,
      subjects: subjectMeta.map((m) => m.subject),
      subjectMeta,
      maxTotal,
      averagePercent: base.percent,
    };
  });
  depts.sort((a, b) => b.averagePercent - a.averagePercent);

  // faculty-wise: group every (dept, subject) column by the faculty who teaches it
  const byFaculty = new Map<string, FacultySubjectStats[]>();
  for (const [dept, subjectMeta] of metaByDept.entries()) {
    const list = students.filter((s) => s.dept === dept);
    subjectMeta.forEach((m) => {
      if (!m.faculty) return;
      const marks = list
        .map((s) => s.subjects.find((x) => x.subject === m.subject)?.mark ?? 0)
        .filter((n) => Number.isFinite(n));
      const entry: FacultySubjectStats = {
        ...stats(marks, m.max),
        dept,
        subject: m.subject,
      };
      const arr = byFaculty.get(m.faculty) ?? [];
      arr.push(entry);
      byFaculty.set(m.faculty, arr);
    });
  }

  const faculty: FacultyStats[] = [...byFaculty.entries()].map(([name, subjects]) => {
    const totalMarks = subjects.reduce((s, x) => s + x.average * x.count, 0);
    const totalCount = subjects.reduce((s, x) => s + x.count, 0);
    const weightedMax = totalCount
      ? subjects.reduce((s, x) => s + x.max * x.count, 0) / totalCount
      : 0;
    const average = totalCount ? totalMarks / totalCount : 0;
    return {
      faculty: name,
      depts: [...new Set(subjects.map((s) => s.dept))],
      subjects: subjects.slice().sort((a, b) => b.percent - a.percent),
      count: totalCount,
      average,
      highest: subjects.length ? Math.max(...subjects.map((s) => s.highest)) : 0,
      lowest: subjects.length ? Math.min(...subjects.map((s) => s.lowest)) : 0,
      median: subjects.length ? median(subjects.map((s) => s.median)) : 0,
      max: weightedMax,
      percent: weightedMax ? (average / weightedMax) * 100 : 0,
    };
  });
  faculty.sort((a, b) => b.percent - a.percent);

  return { students, depts, faculty };
}
