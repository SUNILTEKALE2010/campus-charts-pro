export type SubjectMark = { subject: string; faculty: string; mark: number; max: number };

export type StudentRow = {
  dept: string;
  htno: string;
  subjects: SubjectMark[];
  total: number;
  maxTotal: number;
  percent: number;
};

export type SubjectMeta = { subject: string; faculty: string; max: number };

export type Stats = {
  count: number;
  average: number;
  highest: number;
  lowest: number;
  median: number;
  max: number;
  percent: number;
};

export type DeptStats = Stats & {
  dept: string;
  subjects: string[];
  subjectMeta: SubjectMeta[];
  averagePercent: number;
  maxTotal: number;
};

export type FacultySubjectStats = Stats & {
  dept: string;
  subject: string;
};

export type FacultyStats = Stats & {
  faculty: string;
  depts: string[];
  subjects: FacultySubjectStats[];
};

export type PerformancePayload = {
  students: StudentRow[];
  depts: DeptStats[];
  faculty: FacultyStats[];
  updatedAt: string;
};
