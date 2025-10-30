// 공통 API 응답 형식

export class ApiResponseDto<T> {
  success: boolean;
  data?: T;
  error?: ErrorDto;
}

export class ErrorDto {
  code: string;
  message: string;
  details?: any;
}

export class PaginationDto {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export class PaginatedResponseDto<T> {
  items: T[];
  pagination: PaginationDto;
}
