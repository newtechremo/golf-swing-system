export class GetHistoryQueryDto {
  type?: 'golf-swing' | 'posture' | 'all';
  page?: number;
  limit?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export class HistoryItemDto {
  id: number;
  type: 'golf-swing' | 'posture';
  date: string;
  time: string;
  swingType?: 'full' | 'half';
  status: string;
  hasMemo: boolean;
}

export class HistoryListResponseDto {
  member: {
    id: number;
    name: string;
  };
  history: HistoryItemDto[];
}

export class GetCalendarQueryDto {
  year: number;
  month: number; // 1-12
}

export class CalendarAnalysisDto {
  id: number;
  type: 'golf-swing' | 'posture';
  swingType?: 'full' | 'half';
  time: string;
  status: string;
}

export class CalendarDayDto {
  date: string; // YYYY-MM-DD
  analyses: CalendarAnalysisDto[];
}

export class CalendarResponseDto {
  year: number;
  month: number;
  member: {
    id: number;
    name: string;
  };
  calendar: CalendarDayDto[];
  summary: {
    totalAnalyses: number;
    golfSwingCount: number;
    postureCount: number;
  };
}
