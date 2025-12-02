export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface DashboardData {
  certificationStats: any;
  recentCertifications: any[];
  expiringCertifications: any[];
  topTechnologies: any[];
  departmentStats: any[];
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  includeExpired: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  departments?: string[];
  types?: string[];
}