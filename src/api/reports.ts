import apiClient from './client';
export const reportsApi = {
  get: (params?: { from?: string; to?: string; userId?: string }) =>
    apiClient.get('/reports', { params }).then(r => r.data),
  exportCsv: (params?: { from?: string; to?: string }) =>
    apiClient.get('/reports/export', { params, responseType: 'blob' }).then(r => r.data),
};
