import type { SectionTimetable } from "@/lib/timetable.functions";

const ORDER = ["I", "II", "III", "IV"];
const TITLES = /^(dr|prof|mr|mrs|ms|smt|sri|shri)\.?$/i;

/** Lowercased name tokens with academic titles removed. */
function tokens(name: string): string[] {
  return (name ?? "")
    .toLowerCase()
    .replace(/[^a-z\s.]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !TITLES.test(t) && t.length > 2);
}

/** Maps a faculty name to the years of study they teach, from Sheet2. */
export function buildFacultyYears(sections: SectionTimetable[]): Map<string, string[]> {
  const map = new Map<string, Set<string>>();
  for (const s of sections) {
    if (!s.year || s.year === "—") continue;
    for (const d of s.days) {
      for (const slot of d.slots) {
        const name = (slot.faculty ?? "").trim().toLowerCase();
        if (!name) continue;
        const set = map.get(name) ?? new Set<string>();
        set.add(s.year);
        map.set(name, set);
      }
    }
  }
  const out = new Map<string, string[]>();
  for (const [name, set] of map) {
    out.set(
      name,
      [...set].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)),
    );
  }
  return out;
}

/**
 * Years for a faculty name. Sheet1/Sheet3 use full names ("Dr. Anil Kumar") while
 * Sheet2 uses short names ("Anil"), so matching falls back to shared name tokens.
 */
export function yearsForFaculty(map: Map<string, string[]>, name: string): string {
  const key = (name ?? "").trim().toLowerCase();
  if (!key) return "—";

  let years = map.get(key);
  if (!years) {
    const want = new Set(tokens(key));
    const found = new Set<string>();
    for (const [candidate, list] of map) {
      const hit = tokens(candidate).some((t) => want.has(t));
      if (hit) for (const y of list) found.add(y);
    }
    years = [...found].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  }

  return years.length ? years.map((y) => `Year ${y}`).join(", ") : "—";
}
