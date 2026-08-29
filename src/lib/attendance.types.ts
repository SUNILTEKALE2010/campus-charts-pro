export type AttendanceRow = {
  dept: string;
  htno: string;
  months: { label: string; value: number }[];
  total: number;
  totalMax: number;
  percent: number;
  condonation: boolean;
};

export type AttendanceDeptStats = {
  dept: string;
  monthLabels: string[];
  count: number;
  averagePercent: number;
  condonationYes: number;
  condonationNo: number;
};

export type AttendancePayload = {
  students: AttendanceRow[];
  depts: AttendanceDeptStats[];
  monthLabels: string[];
  updatedAt: string;
};
