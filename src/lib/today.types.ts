export type TodayRow = {
  dept: string;
  htno: string;
  status: "PRESENT" | "ABSENT";
  address: string;
  phone: string;
  altPhone: string;
};

export type TodayDeptStats = {
  dept: string;
  total: number;
  present: number;
  absent: number;
  presentPercent: number;
};

export type TodayPayload = {
  students: TodayRow[];
  depts: TodayDeptStats[];
  updatedAt: string;
};
