import apiClient from './client';

export interface DetailedEntry {
  employeeName: string;
  initials: string;
  color: string;
  department: string;
  designation: string;
  date: string;
  projectName: string;
  taskName: string;
  hours: number;
  status: string;
}

export const reportsApi = {
  get: (params?: { from?: string; to?: string; userId?: string }) =>
    apiClient.get('/reports', { params }).then(r => r.data),
  exportCsv: (params?: { from?: string; to?: string }) =>
    apiClient.get('/reports/export', { params, responseType: 'blob' }).then(r => r.data),
  getDetailed: (params?: { from?: string; to?: string; scope?: string; empName?: string }) =>
    apiClient.get<DetailedEntry[]>('/reports/export/detailed', { params }).then(r => r.data),
};
