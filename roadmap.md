# Roadmap

- [x] Timetable tab: extract year/dept from Sheet2 and show across tables + Year filter
- [ ] Fix year parsing: Sheet2 keeps year in its own column (e.g. `Year-2`), not inside the section header
- [ ] Show year of study in the search areas of the other tabs, sourced from Sheet2
  - Attendance tab: faculty search rows show the year(s) that faculty teaches
  - Student tabs (marks / stud-attendance / today): Sheet2 has no HTNO, so year comes from
    the section/year mapping only where a section is available

- [x] Sheet2 year parsing fixed (reads the `Year-2` column)
- [x] Attendance tab: "Year of study" column per faculty
- [x] Marks tab: year shown in faculty summary, faculty sections and subject headers
- Note: Sheet3/4/5 have only BRANCH + HTNO, no section link, so student rows cannot be tied to a year
- [ ] Add a hero image to each tab and polish the visual design
