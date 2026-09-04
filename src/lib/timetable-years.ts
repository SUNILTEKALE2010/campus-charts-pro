import type { SectionTimetable } from "@/lib/timetable.functions";

const ORDER = ["I", "II", "III", "IV"];

/** Maps a lowercased faculty name to the years of study they teach, from Sheet2. */
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

/** Renders the year list for a faculty name, or an em dash when unknown. */
export function yearsForFaculty(map: Map<string, string[]>, name: string): string {
  const years = map.get((name ?? "").trim().toLowerCase());
  return years && years.length ? years.map((y) => `Year ${y}`).join(", ") : "—";
}
